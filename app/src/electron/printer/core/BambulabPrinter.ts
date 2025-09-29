/* eslint-disable @typescript-eslint/no-unused-vars */
import { BasePrinter } from '@electron/printer/core/BasePrinter'
import {
  DiscoveredPrinter,
  PrinterConfig,
  PrinterConnection,
  PrinterConfigSchema,
  ValidatedConfig,
  ValidationPayload,
  PrinterTelemetry,
  PrinterCommand
} from '@shared/types/printer'
import { Bonjour, Service, Browser } from 'bonjour-service'
import mqtt, { MqttClient } from 'mqtt'
import { secretsService } from '@electron/secrets.service'
import { EventEmitter } from 'events'

import * as BambuCommands from '@electron/printer/types/bambu_commands'
import P1P from '@resources/printerConfigs/bambu/P1P.json'
import P1S from '@resources/printerConfigs/bambu/P1S.json'
import X1C from '@resources/printerConfigs/bambu/X1C.json'
import A1 from '@resources/printerConfigs/bambu/A1.json'
import A1Mini from '@resources/printerConfigs/bambu/A1Mini.json'

type BambuModelSpec = {
  // Common identity fields in our printer JSONs
  id?: string
  name?: string
  manufacturer?: string
  model?: string
  version?: string
  // Older shape compatibility (unused by logic but kept for type ease)
  type?: string
  buildVolume?: { x: number; y: number; z: number }
  nozzleSizes?: number[]
  // Newer shape hardware block (not used here but present in JSON)
  hardware?: Record<string, unknown>
  // G-code templates used by executeCommand
  gcode?: {
    retractFilament?: string
    cutAndRetractFilament?: string
    filamentSwap?: string
    home?: string
    moveBaseToZ?: string
    moveHeadToZ?: string
    setHotendTemp?: string
    setBedTemp?: string
    moveToChuteArea?: string
    wipeNozzle?: string
    cutFilament?: string
    [key: string]: unknown
  }
}

const MODEL_SPECS: Record<string, BambuModelSpec> = {
  P1P,
  P1S,
  X1C,
  A1,
  'A1 Mini': A1Mini
}

let browser: Browser | null = null
let bonjour: Bonjour | null = null
const discoveredDevices = new Map<string, DiscoveredPrinter>()

export class BambulabPrinter extends BasePrinter {
  public events: EventEmitter = new EventEmitter()
  brand = 'bambu'
  models = Object.keys(MODEL_SPECS)
  private mqttClient: MqttClient | null = null
  private connectingPromise: Promise<PrinterConnection> | null = null
  private modelSpec: BambuModelSpec = MODEL_SPECS['P1P']
  private lastTelemetry: PrinterTelemetry | null = null
  private debugAttachedFor: MqttClient | null = null
  private manuallyDisconnecting = false
  private reconnecting = false

  private get mqttDebug(): boolean {
    const env = (process.env.BAMBU_MQTT_DEBUG || '').toLowerCase()
    const envEnabled = env === '1' || env === 'true' || env === 'yes'
    // Allow an optional runtime flag in connectionConfig for ad-hoc enabling
    // without rebuilding or setting env vars.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const cc = (this.config?.connectionConfig as any) || {}
    return !!(envEnabled || cc.mqttDebug === true)
  }

  constructor(protected config: PrinterConfig) {
    super(config)
  }

  static startDiscovery(eventEmitter: EventEmitter): void {
    if (browser) {
      this.stopDiscovery()
    }

    bonjour = new Bonjour()
    browser = bonjour.find({ type: 'bblp', protocol: 'tcp' })

    browser.on('up', (service: Service) => {
      try {
        const serial = service.txt.serial
        if (serial && !discoveredDevices.has(serial)) {
          const ipAddress = service.addresses?.find((a) => a.includes('.'))
          if (ipAddress) {
            const printer: DiscoveredPrinter = {
              ip: ipAddress,
              brand: 'bambu',
              model: service.txt.model || 'Unknown',
              name: service.name,
              serial: serial
            }
            discoveredDevices.set(serial, printer)
            eventEmitter.emit('found', printer)
          }
        }
      } catch (error) {
        console.error('[BambuDiscovery] Error processing service up:', error)
      }
    })

    browser.on('down', (service: Service) => {
      try {
        const serial = service.txt.serial
        if (serial && discoveredDevices.has(serial)) {
          const printer = discoveredDevices.get(serial)
          discoveredDevices.delete(serial)
          if (printer) {
            eventEmitter.emit('lost', printer)
          }
        }
      } catch (error) {
        console.error('[BambuDiscovery] Error processing service down:', error)
      }
    })

    browser.on('error', (err: Error) => {
      console.error('[BambuDiscovery] Bonjour browser error:', err)
    })
  }

  static stopDiscovery(): void {
    if (browser) {
      browser.stop()
      browser = null
    }
    if (bonjour) {
      bonjour.destroy()
      bonjour = null
    }
    discoveredDevices.clear()
  }

  async validate(payload: ValidationPayload): Promise<ValidatedConfig> {
    return new Promise((resolve, reject) => {
      const { accessCode } = payload
      const { ipAddress, serialNumber } = payload.connectionConfig || {}

      if (!ipAddress || !accessCode) {
        return reject(new Error('IP address and access code are required.'))
      }

      const client = mqtt.connect(`mqtts://${ipAddress}:8883`, {
        username: 'bblp',
        password: accessCode,
        // Bambu printers expect SNI 'bblp' on TLS; also accept self-signed certs
        servername: 'bblp',
        rejectUnauthorized: false,
        // Make validation fail fast if no CONNACK is received
        connectTimeout: 10000,
        protocolVersion: 4,
        // Unique clientId to avoid clashes with the main connection
        clientId: `regain3d-validate-${payload.connectionConfig?.serialNumber || 'unknown'}-${Math.random()
          .toString(16)
          .slice(2)}`
      })

      if (this.mqttDebug) {
        this._attachMqttDebug(client, 'validate')
      }

      const timeout = setTimeout(() => {
        client.end(true)
        reject(new Error('Validation timed out.'))
      }, 10000)

      client.on('connect', () => {
        const topic = serialNumber ? `device/${serialNumber}/report` : 'device/+/report'
        client.subscribe(topic, (err) => {
          if (err) {
            clearTimeout(timeout)
            client.end(true)
            return reject(new Error('Failed to subscribe to report topic.'))
          }
        })
      })

      client.on('message', (topic, msg) => {
        try {
          const data = JSON.parse(msg.toString())
          // We received a message with a 'print' object, which confirms it's a valid report.
          if (data.print && topic.endsWith('/report')) {
            // The serial in the topic should match the one we have (if provided),
            // otherwise capture it from the topic.
            const topicSerial = topic.split('/')[1]
            if (serialNumber && topicSerial !== serialNumber) return

            const model = data.print.sub_brand || payload.model || 'Unknown'

            // Success! We connected, subscribed, and received a valid report.
            const validatedConfig: ValidatedConfig = {
              id: `bambu-${model}-${topicSerial}`,
              name: payload.name || 'Bambu Lab Printer',
              brand: this.brand,
              model: model,
              nozzleSizeMm: payload.nozzleSizeMm || 0.4,
              capabilities: {
                multiMaterial: true,
                reportsTelemetry: true
              },
              connectionConfig: {
                ...payload.connectionConfig,
                serialNumber: topicSerial
              }
            }
            clearTimeout(timeout)
            client.end(true)
            resolve(validatedConfig)
          }
        } catch (e) {
          // Ignore non-JSON messages
        }
      })

      client.on('error', (err) => {
        clearTimeout(timeout)
        client.end(true)
        reject(new Error(`Connection failed: ${err.message}`))
      })
    })
  }

  async connect(validated: ValidatedConfig): Promise<PrinterConnection> {
    this.config = validated
    this.modelSpec = MODEL_SPECS[validated.model] || this.modelSpec

    if (!this.config.connectionConfig.accessCodeSecretId) {
      throw new Error('Access code secret ID is missing.')
    }

    // Idempotent connect: reuse existing healthy (or reconnecting) client
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (this.mqttClient && (this.mqttClient.connected || (this.mqttClient as any)?.reconnecting)) {
      return this.mqttClient
    }
    if (this.connectingPromise) {
      return this.connectingPromise
    }

    // Use a try/catch block for error handling, which is idiomatic for async/await
    try {
      const accessCode = await secretsService.getSecret(
        this.config.connectionConfig.accessCodeSecretId
      )
      if (!accessCode) {
        throw new Error('Failed to retrieve access code.')
      }

      const { ipAddress } = this.config.connectionConfig
      if (!ipAddress) {
        throw new Error('IP address is required.')
      }

      // Now, we handle the callback-based connection by wrapping it in a promise
      this.connectingPromise = new Promise((resolve, reject) => {
        this.mqttClient = mqtt.connect(`mqtts://${ipAddress}:8883`, {
          username: 'bblp',
          password: accessCode,
          // Bambu TLS specifics
          servername: 'bblp',
          rejectUnauthorized: false,
          // Connection behavior
          clean: true,
          keepalive: 20, // Increase keepalive to reduce false timeouts
          connectTimeout: 20000,
          reconnectPeriod: 0, // disable mqtt.js' fixed timer; we'll handle it
          protocolVersion: 4,
          resubscribe: true,
          clientId: `regain3d-${this.config.connectionConfig.serialNumber || 'bambu'}-${Date.now()}`
        })

        if (this.mqttDebug && this.mqttClient) {
          this._attachMqttDebug(this.mqttClient, 'main')
        }

        let settled = false

        this.mqttClient.on('connect', () => {
          console.log(`[BambuConnect] Connected to ${this.config.name}`)
          const serial = this.config.connectionConfig.serialNumber
          if (serial) {
            this.mqttClient?.subscribe(`device/${serial}/report`, (err) => {
              if (err) {
                console.error('[BambuConnect] Failed to subscribe to report topic:', err)
              }
            })
          } else {
            console.warn('[BambuConnect] Missing serialNumber; telemetry subscribe skipped')
          }
          this.events.emit('connected')
          if (!settled) {
            settled = true
            resolve(this.mqttClient) // The promise resolves here on success
          }
        })

        this.mqttClient.on('error', (err) => {
          console.error(
            `[BambuConnect] MQTT error for ${this.config.name}: ${err.message}`,
            err.stack
          )
          this.events.emit('error', err)
          if (!settled) {
            settled = true
            reject(err) // Reject only if initial connect not yet settled
          }
        })

        this.mqttClient.on('reconnect', () => {
          console.log(`[BambuConnect] Reconnecting to ${this.config.name}...`)
        })

        // These handlers don't need to affect the promise state
        this.mqttClient.on('message', (_topic, payload) => {
          if (this.mqttDebug) {
            try {
              console.debug('[BambuMQTT] message', {
                topic: _topic,
                size: payload?.length ?? 0
              })
            } catch {
              // This can happen with malformed telemetry, safe to ignore.
            }
          }
          const telemetry = this._parseTelemetry(payload)
          if (telemetry) {
            this.lastTelemetry = telemetry
            this.events.emit('telemetry', telemetry)
          }
        })

        let attempt = 0
        const nextDelay = (): number => {
          const base = Math.min(30000, 5000 * 2 ** attempt) // 5s -> 10s -> 20s -> 30s cap
          const jitter = Math.floor(Math.random() * 3000) // +0..3s jitter
          return base + jitter
        }

        // in 'close' and/or 'error' handlers:
        this.mqttClient?.on('close', () => {
          if (this.manuallyDisconnecting) return
          attempt++
          const delay = nextDelay()
          console.log(`[BambuConnect] Will retry in ${delay}ms`)
          setTimeout(() => {
            // only retry if we still don't have a client
            if (!this.mqttClient?.connected) {
              // Recreate client to avoid stale socket
              this.mqttClient?.end(true)
              this.mqttClient = null
              this.connect(this.config as PrinterConfig).catch(() => {
                /* swallow; next backoff will handle */
              })
            }
          }, delay)
        })

        this.mqttClient.on('offline', () => {
          console.log(`[BambuConnect] Offline: ${this.config.name}`)
        })
      })

      if (this.mqttClient) {
        this.mqttClient.on('packetsend', (packet) => {
          if (packet.cmd === 'pingreq') {
            console.log(`[BambuConnect] Keepalive ping sent to ${this.config.name}`)
          }
        })

        this.mqttClient.on('packetreceive', (packet) => {
          if (packet.cmd === 'pingresp') {
            console.log(`[BambuConnect] Keepalive pong received from ${this.config.name}`)
          }
        })
      }

      const client = await this.connectingPromise
      this.connectingPromise = null
      return client
    } catch (error) {
      // This single catch block handles errors from getSecret or the MQTT connection
      console.error(`[BambuConnect] Failed to connect to ${this.config.name}:`, error)
      // Re-throw the error so the caller knows the connection failed
      this.connectingPromise = null
      throw error
    }
  }

  async disconnect(): Promise<void> {
    if (!this.mqttClient) {
      return Promise.resolve()
    }

    this.manuallyDisconnecting = true

    return new Promise((resolve) => {
      // The 'close' event handler will set mqttClient to null.
      // We just need to end the connection here.
      this.mqttClient?.end(true, () => {
        resolve()
      })
    })
  }

  buildConfigSchema(_model: string): PrinterConfigSchema {
    return {
      type: 'object',
      properties: {
        ipAddress: { type: 'string', title: 'IP Address' },
        accessCode: { type: 'string', title: 'Access Code' }
      },
      required: ['ipAddress', 'accessCode']
    }
  }

  async executeCommand(command: PrinterCommand): Promise<void> {
    switch (command.command) {
      case 'setLight': {
        const payload = command.on
          ? BambuCommands.CHAMBER_LIGHT_ON
          : BambuCommands.CHAMBER_LIGHT_OFF
        await this._publishPayload(payload)
        break
      }
      case 'home': {
        await this._publishGcode(BambuCommands.HOME_GCODE)
        break
      }
      case 'moveBaseToZ':
      case 'moveHeadToZ': {
        const gcode = BambuCommands.MOVE_AXIS_GCODE.replace('{axis}', 'Z')
          .replace('{distance}', String(command.height))
          .replace('{speed}', '6000') // Use a default speed
        await this._publishGcode(gcode)
        break
      }
      case 'setHotendTemp': {
        const gcode = `M104 S${command.temperature}`
        await this._publishGcode(gcode)
        break
      }
      case 'setBedTemp': {
        const gcode = `M140 S${command.temperature}`
        await this._publishGcode(gcode)
        break
      }
      // The following commands are not yet implemented in the UI,
      // but we add them here for future use.
      case 'retractFilament':
      case 'cutAndRetractFilament':
      case 'filamentSwap':
      case 'moveToChuteArea':
      case 'wipeNozzle':
      case 'cutFilament': {
        const gcodeTemplate = this.modelSpec?.gcode?.[command.command]
        if (typeof gcodeTemplate === 'string') {
          await this._publishGcode(gcodeTemplate)
        } else {
          throw new Error(
            `Command ${command.command} not supported or has invalid template for model ${this.config.model}`
          )
        }
        break
      }
      default:
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        throw new Error(`Command ${(command as any).command} not supported`)
    }
  }

  private async _publishPayload(payload: Record<string, unknown>): Promise<void> {
    if (!this.mqttClient || !this.mqttClient.connected) {
      await this._ensureConnected()
    }

    const serial = this.config.connectionConfig.serialNumber
    const topic = `device/${serial}/request`

    // Deep copy and update sequence_id
    const newPayload = JSON.parse(JSON.stringify(payload))
    const key = Object.keys(newPayload)[0]
    if (key && newPayload[key] && typeof newPayload[key] === 'object') {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(newPayload[key] as any).sequence_id = `${Date.now()}`
    }

    if (this.mqttDebug) {
      try {
        console.debug('[BambuMQTT] publish', {
          topic,
          payload: newPayload,
          keys: Object.keys(newPayload[key] || {}),
          size: JSON.stringify(newPayload).length
        })
      } catch {
        // This can happen if the payload isn't valid JSON, safe to ignore for debug logging.
      }
    }

    await new Promise<void>((resolve, reject) => {
      this.mqttClient?.publish(topic, JSON.stringify(newPayload), { qos: 1 }, (err) => {
        if (err) reject(err)
        else resolve()
      })
    })
  }

  private async _publishGcode(line: string): Promise<void> {
    const payload = JSON.parse(JSON.stringify(BambuCommands.SEND_GCODE_TEMPLATE))
    payload.print.param = line
    await this._publishPayload(payload)
  }

  private async _ensureConnected(timeoutMs = 20000): Promise<void> {
    const start = Date.now()
    if (this.mqttClient?.connected) return

    // Trigger connect if needed
    if (!this.mqttClient && this.config) {
      try {
        await this.connect(this.config)
        return
      } catch {
        // fallthrough to wait loop
      }
    }

    await new Promise<void>((resolve, reject) => {
      const onConnect = (): void => {
        cleanup()
        resolve()
      }
      const onError = (_err: Error): void => {
        // keep waiting until timeout
        if (Date.now() - start > timeoutMs) {
          cleanup()
          reject(new Error('Timed out waiting for printer connection'))
        }
      }
      const onClose = (): void => {
        if (Date.now() - start > timeoutMs) {
          cleanup()
          reject(new Error('Timed out waiting for printer connection'))
        }
      }
      const cleanup = (): void => {
        this.mqttClient?.off('connect', onConnect)
        this.mqttClient?.off('error', onError)
        this.mqttClient?.off('close', onClose)
      }
      this.mqttClient?.on('connect', onConnect)
      this.mqttClient?.on('error', onError)
      this.mqttClient?.on('close', onClose)
      // Safety: timeout
      setTimeout(() => {
        if (!this.mqttClient?.connected) {
          cleanup()
          reject(new Error('Timed out waiting for printer connection'))
        }
      }, timeoutMs)
    })
  }

  private _attachMqttDebug(client: MqttClient, label: string): void {
    if (this.debugAttachedFor === client) return
    this.debugAttachedFor = client

    const prefix = (event: string): string => `[BambuMQTT:${label}] ${event}`
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      client.on('packetsend', (packet: any) => {
        try {
          const { cmd, topic, qos, messageId, reasonCode } = packet || {}
          const size = packet?.payload ? (packet.payload as Buffer).length : undefined
          console.debug(prefix('packetsend'), { cmd, topic, qos, messageId, reasonCode, size })
        } catch {
          /* ignore */
        }
      })
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      client.on('packetreceive', (packet: any) => {
        try {
          const { cmd, topic, qos, messageId, returnCode, reasonCode } = packet || {}
          const size = packet?.payload ? (packet.payload as Buffer).length : undefined
          console.debug(prefix('packetreceive'), {
            cmd,
            topic,
            qos,
            messageId,
            returnCode,
            reasonCode,
            size
          })
        } catch {
          /* ignore */
        }
      })
      client.on('close', () => console.debug(prefix('close')))
      client.on('end', () => console.debug(prefix('end')))
      client.on('offline', () => console.debug(prefix('offline')))
      client.on('reconnect', () => console.debug(prefix('reconnect')))
      // mqtt.js emits 'disconnect' for MQTT 5.0 only; harmless to leave
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(client as any).on?.('disconnect', (packet: any) => {
        try {
          console.debug(prefix('disconnect'), packet)
        } catch {
          /* ignore */
        }
      })
      // Low-level stream diagnostics
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const stream: any = (client as any).stream
      if (stream && typeof stream.on === 'function') {
        stream.on('secureConnect', () => console.debug(prefix('tls secureConnect')))
        stream.on('timeout', () => console.debug(prefix('tls timeout')))
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        stream.on('error', (e: any) => console.debug(prefix('tls error'), e?.message || e))
      }
    } catch (e) {
      console.warn('[BambuMQTT] Failed to attach debug listeners:', e)
    }
  }

  private _formatTemplate(template: string, params: Record<string, number | undefined>): string {
    return template.replace(/\{\{(\w+)\}\}/g, (_m, key) => {
      const value = params[key]
      return value !== undefined ? String(value) : ''
    })
  }

  private _parseTelemetry(payload: Buffer): PrinterTelemetry | null {
    try {
      const data = JSON.parse(payload.toString())
      if (!data.print) return null

      const print = data.print
      const stateMap = {
        IDLE: 'IDLE',
        RUNNING: 'RUNNING',
        PAUSE: 'PAUSED',
        FINISH: 'FINISHED',
        FAILED: 'ERROR',
        SLICING: 'IDLE' // Treat slicing as idle for our purposes
      }

      const telemetry: PrinterTelemetry = {
        state: stateMap[print.gcode_state] || 'IDLE',
        layer: print.layer_num,
        totalLayers: print.total_layer_num,
        errors: data.hms?.map((e: { attr: string; desc: string }) => ({
          code: e.attr,
          message: e.desc
        }))
      }

      return telemetry
    } catch (error) {
      console.error('[BambuTelemetry] Error parsing payload:', error)
      return null
    }
  }

  getLastTelemetry(): PrinterTelemetry | null {
    return this.lastTelemetry
  }
}
