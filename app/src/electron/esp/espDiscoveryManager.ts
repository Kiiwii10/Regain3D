import { Bonjour, Service, Browser } from 'bonjour-service'
import { EventEmitter } from 'events'
import { DiscoveredESP } from '@shared/types/esp'
import axios from 'axios'
import * as os from 'os'
import {
  EnhancedDeviceInfo,
  ESPDeviceStatus,
  EspService,
  MDnsTxtRecord,
  MockService
} from './types/esp.types'

let browser: Browser | null = null
let bonjour: Bonjour | null = null
const discoveredDevices = new Map<string, DiscoveredESP>()
let isNetworkScanRunning = false

export class ESPDiscoveryManager {
  private static eventEmitter: EventEmitter = new EventEmitter()

  static getEventEmitter(): EventEmitter {
    return this.eventEmitter
  }

  static startDiscovery(): void {
    if (browser) {
      this.stopDiscovery()
    }

    // Start mDNS discovery
    this.startMDNSDiscovery()

    // Also start network scanning for devices that don't advertise via mDNS
    this.startNetworkScan()

    console.log('[ESPDiscovery] Started ESP device discovery (mDNS + network scan)')
  }

  private static startMDNSDiscovery(): void {
    bonjour = new Bonjour()

    // Look for both HTTP and our custom regain3d service types
    const httpBrowser = bonjour.find({ type: 'http', protocol: 'tcp' })
    const regain3dBrowser = bonjour.find({ type: 'regain3d', protocol: 'tcp' })

    const handleServiceUp = async (service: Service): Promise<void> => {
      try {
        // Only accept devices with our ecosystem token
        const isESPDevice = await this.isESPDevice(service)

        if (isESPDevice) {
          const deviceId = this.generateDeviceId(service)

          if (!discoveredDevices.has(deviceId)) {
            const ipAddress = service.addresses?.find((a) => a.includes('.'))

            if (ipAddress) {
              const deviceInfo = await this.getEnhancedDeviceInfo(service, ipAddress)

              const esp: DiscoveredESP = {
                ip: ipAddress,
                hostname: service.host || service.name,
                name: deviceInfo.name || service.name,
                mac: deviceInfo.mac || service.txt?.mac,
                version: deviceInfo.version || service.txt?.version,
                chipId: deviceInfo.chipId || service.txt?.chipid || service.txt?.chip_id,
                isProvisioned: deviceInfo.isProvisioned,
                port: service.port,
                txt: service.txt,
                type: service.type,
                protocol: service.protocol,
                ...deviceInfo.additionalInfo,
                discoveryMethod: 'mDNS'
              }

              discoveredDevices.set(deviceId, esp)
              this.eventEmitter.emit('esp-found', esp)
              console.log(
                `[ESPDiscovery] Found ecosystem ESP via ${service.type}: ${esp.name} at ${esp.ip} (Status: ${esp.txt?.status || 'unknown'})`
              )
            }
          }
        }
      } catch (error) {
        console.error('[ESPDiscovery] Error processing service up:', error)
      }
    }

    const handleServiceDown = (service: Service): void => {
      try {
        const deviceId = this.generateDeviceId(service)

        if (discoveredDevices.has(deviceId)) {
          const esp = discoveredDevices.get(deviceId)
          discoveredDevices.delete(deviceId)

          if (esp) {
            this.eventEmitter.emit('esp-lost', esp)
            console.log(`[ESPDiscovery] Lost ESP device: ${esp.name}`)
          }
        }
      } catch (error) {
        console.error('[ESPDiscovery] Error processing service down:', error)
      }
    }

    // Set up HTTP browser
    httpBrowser.on('up', handleServiceUp)
    httpBrowser.on('down', handleServiceDown)
    httpBrowser.on('error', (err: Error) => {
      console.error('[ESPDiscovery] HTTP browser error:', err)
      this.eventEmitter.emit('discovery-error', err)
    })

    // Set up regain3d browser
    regain3dBrowser.on('up', handleServiceUp)
    regain3dBrowser.on('down', handleServiceDown)
    regain3dBrowser.on('error', (err: Error) => {
      console.error('[ESPDiscovery] Regain3D browser error:', err)
      this.eventEmitter.emit('discovery-error', err)
    })

    browser = httpBrowser // Keep reference for cleanup
  }

  private static async startNetworkScan(): Promise<void> {
    if (isNetworkScanRunning) return

    isNetworkScanRunning = true
    console.log('[ESPDiscovery] Starting network scan for ESP devices')

    try {
      const localIPs = this.getLocalNetworkIPs()

      for (const networkInfo of localIPs) {
        // Scan the network range in the background
        this.scanNetworkRange(networkInfo.network, networkInfo.cidr).catch((error) =>
          console.error(`[ESPDiscovery] Network scan error for ${networkInfo.network}:`, error)
        )
      }

      // Schedule periodic network scans every 2 minutes
      setInterval(() => {
        if (isNetworkScanRunning) {
          for (const networkInfo of localIPs) {
            this.scanNetworkRange(networkInfo.network, networkInfo.cidr).catch((error) =>
              console.error(
                `[ESPDiscovery] Periodic network scan error for ${networkInfo.network}:`,
                error
              )
            )
          }
        }
      }, 120000)
    } catch (error) {
      console.error('[ESPDiscovery] Failed to start network scan:', error)
      isNetworkScanRunning = false
    }
  }

  private static getLocalNetworkIPs(): Array<{ network: string; cidr: number }> {
    const networks: Array<{ network: string; cidr: number }> = []
    const interfaces = os.networkInterfaces()

    for (const [, addrs] of Object.entries(interfaces)) {
      if (!addrs) continue

      for (const addr of addrs) {
        if (addr.family === 'IPv4' && !addr.internal && addr.address.startsWith('192.168.')) {
          // Assume /24 subnet for 192.168.x.x networks (common for home networks)
          const networkBase = addr.address.substring(0, addr.address.lastIndexOf('.'))
          networks.push({ network: networkBase, cidr: 24 })
        } else if (addr.family === 'IPv4' && !addr.internal && addr.address.startsWith('10.')) {
          // Handle 10.x.x.x networks
          const networkBase = addr.address.substring(0, addr.address.lastIndexOf('.'))
          networks.push({ network: networkBase, cidr: 24 })
        } else if (addr.family === 'IPv4' && !addr.internal && addr.address.startsWith('172.')) {
          // Handle 172.16-31.x.x networks
          const parts = addr.address.split('.')
          const secondOctet = parseInt(parts[1])
          if (secondOctet >= 16 && secondOctet <= 31) {
            const networkBase = addr.address.substring(0, addr.address.lastIndexOf('.'))
            networks.push({ network: networkBase, cidr: 24 })
          }
        }
      }
    }

    return networks
  }

  private static async scanNetworkRange(networkBase: string, cidr: number): Promise<void> {
    // For /24 networks, scan the most common ESP IP ranges
    const commonESPRanges = [
      { start: 1, end: 50 }, // Common DHCP range start
      { start: 100, end: 150 }, // Mid-range IPs
      { start: 200, end: 254 } // Higher range IPs
    ]

    console.log(`[ESPDiscovery] Scanning network ${networkBase}.0/${cidr}`)

    const scanPromises: Promise<void>[] = []

    for (const range of commonESPRanges) {
      for (let i = range.start; i <= range.end; i++) {
        const ip = `${networkBase}.${i}`
        scanPromises.push(this.probeIPForESP(ip))

        // Limit concurrent scans to avoid overwhelming the network
        if (scanPromises.length >= 20) {
          await Promise.allSettled(scanPromises)
          scanPromises.length = 0
        }
      }
    }

    // Wait for remaining scans
    if (scanPromises.length > 0) {
      await Promise.allSettled(scanPromises)
    }
  }

  private static async probeIPForESP(ip: string): Promise<void> {
    // Skip if we already discovered this IP
    const existingDevice = Array.from(discoveredDevices.values()).find((device) => device.ip === ip)
    if (existingDevice) return

    try {
      // Try common ESP ports
      const ports = [80, 8080]

      for (const port of ports) {
        const baseUrl = `http://${ip}:${port}`

        try {
          // Quick HTTP probe to see if anything responds
          const response = await axios.get(baseUrl, {
            timeout: 1000,
            headers: {
              'User-Agent': 'regain3d-discovery'
            }
          })

          if (response.status === 200) {
            // Check if response indicates it's our ecosystem ESP device
            const responseText = response.data?.toString?.() || JSON.stringify(response.data) || ''
            const data: ESPDeviceStatus = response.data

            // First priority: check for exact ecosystem token
            let isOurEcosystem = false
            if (
              data &&
              typeof data === 'object' &&
              data.ecosystem_token === 'Regain3DController_v1.0_ESP32'
            ) {
              isOurEcosystem = true
              console.log(`[ESPDiscovery] Found exact ecosystem token match at ${ip}:${port}`)
            }
            // Check for ecosystem token variants
            else if (
              data &&
              typeof data === 'object' &&
              data.ecosystem_token &&
              (data.ecosystem_token.includes('Regain3D') ||
                data.ecosystem_token.includes('3DController') ||
                (data.ecosystem_token.includes('ESP32') &&
                  data.ecosystem_token.includes('Controller')))
            ) {
              isOurEcosystem = true
              console.log(
                `[ESPDiscovery] Found ecosystem token variant at ${ip}:${port}: ${data.ecosystem_token}`
              )
            }
            // Fallback: check for general ESP indicators but still try to verify ecosystem
            else if (this.containsESPIndicators(responseText) || this.isESPDeviceResponse(data)) {
              // Try to verify ecosystem token via other endpoints
              const verifyResult = await this.verifyEcosystemTokenByIP(ip, port)
              if (verifyResult) {
                isOurEcosystem = true
                console.log(
                  `[ESPDiscovery] Verified ecosystem token via additional endpoints at ${ip}:${port}`
                )
              } else {
                console.log(
                  `[ESPDiscovery] Found ESP device but could not verify ecosystem token at ${ip}:${port}, skipping`
                )
                continue
              }
            }

            if (isOurEcosystem) {
              console.log(
                `[ESPDiscovery] Found confirmed ecosystem ESP device at ${ip}:${port} via network scan`
              )

              // Create a mock service object for compatibility with existing code
              const mockService: MockService = {
                name: `ESP-${ip}`,
                host: ip,
                port: port,
                addresses: [ip],
                type: 'http',
                protocol: 'tcp',
                txt: {}
              }

              // Get enhanced device info
              const deviceInfo = await this.getEnhancedDeviceInfo(mockService, ip)
              const deviceId = `scan-${ip}-${port}`

              const esp: DiscoveredESP = {
                ip: ip,
                hostname: deviceInfo.name || ip,
                name: deviceInfo.name || `ESP-${ip}`,
                mac: deviceInfo.mac,
                version: deviceInfo.version,
                chipId: deviceInfo.chipId,
                isProvisioned: deviceInfo.isProvisioned,
                port: port,
                // Mark as network discovered
                discoveryMethod: 'network-scan',
                ...deviceInfo.additionalInfo
              }

              if (!discoveredDevices.has(deviceId)) {
                discoveredDevices.set(deviceId, esp)
                this.eventEmitter.emit('esp-found', esp)
                console.log(
                  `[ESPDiscovery] Found ESP device via network scan: ${esp.name} at ${esp.ip} (Provisioned: ${esp.isProvisioned})`
                )
              }

              break // Found device on this port, no need to try other ports
            }
          }
        } catch {
          // Port/IP not accessible, continue
          continue
        }
      }
    } catch {
      // IP not reachable, ignore
    }
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

    // Stop network scanning
    isNetworkScanRunning = false

    discoveredDevices.clear()
    console.log('[ESPDiscovery] Stopped ESP device discovery (mDNS + network scan)')
  }

  static getDiscoveredDevices(): DiscoveredESP[] {
    return Array.from(discoveredDevices.values())
  }

  static getDeviceByIP(ip: string): DiscoveredESP | undefined {
    return Array.from(discoveredDevices.values()).find((device) => device.ip === ip)
  }

  private static async isESPDevice(service: Service): Promise<boolean> {
    // First check mDNS indicators for quick filtering
    if (await this.checkMDNSIndicators(service)) {
      return true
    }

    // If mDNS doesn't provide clear indicators, probe HTTP endpoints
    return await this.probeHTTPEndpoints(service)
  }

  private static async checkMDNSIndicators(service: Service): Promise<boolean> {
    const txt = service.txt || {}

    // STRICT ECOSYSTEM TOKEN CHECK - reject anything without our token
    const ecosystemToken = 'Regain3DController_v1.0_ESP32'

    // Check for exact ecosystem token match
    if (txt.ecosystem_token === ecosystemToken) {
      console.log(`[ESPDiscovery] Found exact ecosystem token match: ${txt.ecosystem_token}`)

      // Also verify device_type if available
      if (txt.device_type === 'regain3d-controller') {
        console.log(`[ESPDiscovery] Confirmed device_type: ${txt.device_type}`)
        return true
      }

      return true
    }

    // Check for ecosystem token variants (but still strict)
    if (txt.ecosystem_token && txt.ecosystem_token.includes('Regain3DController')) {
      console.log(`[ESPDiscovery] Found ecosystem token variant: ${txt.ecosystem_token}`)
      return true
    }

    // If no ecosystem token in mDNS, this is not our device
    console.log(`[ESPDiscovery] No ecosystem token found in mDNS for ${service.name} - rejecting`)
    return false
  }

  private static async verifyEcosystemTokenByIP(ip: string, port: number): Promise<boolean> {
    const baseUrl = `http://${ip}:${port}`

    // Try status endpoints to verify ecosystem token
    const endpoints = ['/status', '/', '/system']

    for (const endpoint of endpoints) {
      try {
        const response = await axios.get(`${baseUrl}${endpoint}`, {
          timeout: 2000,
          headers: {
            'User-Agent': 'regain3d-discovery'
          }
        })

        if (response.status === 200 && response.data) {
          const data: ESPDeviceStatus = response.data

          // Check for exact ecosystem token match
          if (data.ecosystem_token === 'Regain3DController_v1.0_ESP32') {
            console.log(`[ESPDiscovery] Verified exact ecosystem token via ${endpoint}`)
            return true
          }

          // Check for ecosystem token variants
          if (
            data.ecosystem_token &&
            (data.ecosystem_token.includes('Regain3D') ||
              data.ecosystem_token.includes('3DController') ||
              (data.ecosystem_token.includes('ESP32') &&
                data.ecosystem_token.includes('Controller')))
          ) {
            console.log(
              `[ESPDiscovery] Verified ecosystem token variant via ${endpoint}: ${data.ecosystem_token}`
            )
            return true
          }
        }
      } catch {
        // Endpoint not available, continue
        continue
      }
    }

    return false
  }

  private static async probeHTTPEndpoints(service: Service): Promise<boolean> {
    const ipAddress = service.addresses?.find((a) => a.includes('.'))
    if (!ipAddress) return false

    const port = service.port || 80
    const baseUrl = `http://${ipAddress}:${port}`

    // ESP endpoints
    const endpoints = [
      '/',
      '/system',
      '/status',
      '/assign-app' // From your ESP endpoint documentation
    ]

    console.log(`[ESPDiscovery] Probing ESP endpoints for ecosystem token at ${ipAddress}:${port}`)

    for (const endpoint of endpoints) {
      try {
        const response = await axios.get(`${baseUrl}${endpoint}`, {
          timeout: 2000,
          headers: {
            'User-Agent': 'regain3d-discovery'
          }
        })

        if (response.status === 200 && response.data) {
          const data: ESPDeviceStatus = response.data

          // STRICT CHECK: Only accept devices with our ecosystem token
          if (data.ecosystem_token === 'Regain3DController_v1.0_ESP32') {
            console.log(`[ESPDiscovery] Found exact ecosystem token via HTTP from ${endpoint}`)
            return true
          }

          // Check for ecosystem token variants (but still strict)
          if (data.ecosystem_token && data.ecosystem_token.includes('Regain3DController')) {
            console.log(
              `[ESPDiscovery] Found ecosystem token variant via HTTP: ${data.ecosystem_token}`
            )
            return true
          }
        }
      } catch {
        // Endpoint not found or network error - continue to next endpoint
        continue
      }
    }

    console.log(
      `[ESPDiscovery] No ecosystem token found via HTTP for ${ipAddress}:${port} - rejecting`
    )
    return false
  }

  private static containsESPIndicators(text: string): boolean {
    const lowerText = text.toLowerCase()
    const indicators = [
      'esp32',
      'esp8266',
      'regain3d',
      'waste-monitor',
      'waste-collect',
      'arduino',
      'chip_id',
      'chipid',
      'firmware',
      'mac_address'
    ]

    return indicators.some((indicator) => lowerText.includes(indicator))
  }

  private static isESPDeviceResponse(data: ESPDeviceStatus): boolean {
    if (!data || typeof data !== 'object') return false

    // Check for common ESP device response patterns
    const hasChipInfo = !!(data.chipId || data.chip_id || data.chipID)
    const hasMacAddress = !!(data.mac || data.macAddress || data.mac_address)
    const hasFirmwareInfo = !!(data.firmware || data.version || data.firmware_version)
    const hasDeviceType = data.device === 'esp32' || data.device === 'esp8266'
    const hasESPFields = !!(data.heap || data.uptime || data.reset_reason)

    return hasChipInfo || hasMacAddress || hasFirmwareInfo || hasDeviceType || hasESPFields
  }

  // private static isESPMacPattern(mac: string): boolean {
  //   // ESP32/ESP8266 devices typically have MAC addresses starting with specific OUI prefixes
  //   const espOUIPatterns = [
  //     '24:6f:28', // Espressif Inc.
  //     '30:ae:a4', // Espressif Inc.
  //     'cc:50:e3', // Espressif Inc.
  //     '84:cc:a8', // Espressif Inc.
  //     '5c:cf:7f', // Espressif Inc.
  //     'a0:20:a6' // Espressif Inc.
  //   ]

  //   const normalizedMac = mac.toLowerCase().replace(/[:-]/g, ':')
  //   return espOUIPatterns.some((pattern) => normalizedMac.startsWith(pattern))
  // }

  private static generateDeviceId(service: Service): string {
    // Use MAC address if available, otherwise use host + name
    const txt = service.txt || {}
    if (txt.mac) {
      return txt.mac
    }

    if (txt.chipid || txt.chip_id) {
      return txt.chipid || txt.chip_id
    }

    // Fallback to host + name combination
    return `${service.host || 'unknown'}-${service.name || 'unnamed'}`
  }

  private static async getEnhancedDeviceInfo(
    service: EspService,
    ipAddress: string
  ): Promise<EnhancedDeviceInfo> {
    const port = service.port || 80
    const baseUrl = `http://${ipAddress}:${port}`
    const deviceInfo: EnhancedDeviceInfo = {
      name: undefined,
      mac: undefined,
      version: undefined,
      chipId: undefined,
      isProvisioned: false,
      additionalInfo: {}
    }

    // Try various endpoints to gather device information
    const infoEndpoints = [
      '/info',
      '/device-info',
      '/status',
      '/api/info',
      '/api/status',
      '/api/device'
    ]

    for (const endpoint of infoEndpoints) {
      try {
        console.log(`[ESPDiscovery] Querying ${endpoint} on ${ipAddress}:${port}`)
        const response = await axios.get(`${baseUrl}${endpoint}`, {
          timeout: 3000,
          headers: {
            'User-Agent': 'regain3d-discovery',
            Accept: 'application/json, text/plain, */*'
          }
        })

        if (response.status === 200 && response.data) {
          const data: ESPDeviceStatus = response.data
          console.log(`[ESPDiscovery] Received data from ${endpoint}:`, data)

          // Extract device information
          if (data.name && !deviceInfo.name) deviceInfo.name = data.name
          if (data.device_name && !deviceInfo.name) deviceInfo.name = data.device_name
          if (data.hostname && !deviceInfo.name) deviceInfo.name = data.hostname

          if (data.mac && !deviceInfo.mac) deviceInfo.mac = data.mac
          if (data.macAddress && !deviceInfo.mac) deviceInfo.mac = data.macAddress
          if (data.mac_address && !deviceInfo.mac) deviceInfo.mac = data.mac_address

          if (data.version && !deviceInfo.version) deviceInfo.version = data.version
          if (data.firmware_version && !deviceInfo.version)
            deviceInfo.version = data.firmware_version
          if (data.firmwareVersion && !deviceInfo.version) deviceInfo.version = data.firmwareVersion

          if (data.chipId && !deviceInfo.chipId) deviceInfo.chipId = data.chipId
          if (data.chip_id && !deviceInfo.chipId) deviceInfo.chipId = data.chip_id
          if (data.chipID && !deviceInfo.chipId) deviceInfo.chipId = data.chipID

          // Check provisioning status
          if (
            data.provisioned === true ||
            data.status === 'provisioned' ||
            data.assigned === true
          ) {
            deviceInfo.isProvisioned = true
          }
          if (data.firmware_url || data.firmwareUrl || data.api_endpoint || data.apiEndpoint) {
            deviceInfo.isProvisioned = true
          }

          // Store additional useful information
          if (data.heap) deviceInfo.additionalInfo.heap = data.heap
          if (data.uptime) deviceInfo.additionalInfo.uptime = data.uptime
          if (data.wifi) deviceInfo.additionalInfo.wifi = data.wifi
          if (data.ip) deviceInfo.additionalInfo.reported_ip = data.ip
          if (data.reset_reason) deviceInfo.additionalInfo.reset_reason = data.reset_reason
        }
      } catch {
        // Endpoint not available or returned error, continue
        console.log(`[ESPDiscovery] Endpoint ${endpoint} not available or returned error`)
        continue
      }
    }

    // If no HTTP endpoints provided clear information, use TXT records and mDNS
    const txt = service.txt || {}
    if (!deviceInfo.isProvisioned) {
      deviceInfo.isProvisioned = await this.checkProvisioningStatus(service)
    }

    // Fill in gaps from TXT records if HTTP didn't provide the info
    if (!deviceInfo.name && service.name) deviceInfo.name = service.name
    if (!deviceInfo.mac && txt.mac) deviceInfo.mac = txt.mac
    if (!deviceInfo.version && txt.version) deviceInfo.version = txt.version
    if (!deviceInfo.chipId && (txt.chipid || txt.chip_id)) {
      deviceInfo.chipId = txt.chipid || txt.chip_id
    }

    return deviceInfo
  }

  private static async checkProvisioningStatus(service: EspService): Promise<boolean> {
    // Check TXT records first for quick determination
    const txt = (service.txt || {}) as MDnsTxtRecord

    // Look for provisioning indicators in TXT records
    if (txt.provisioned === 'true' || txt.status === 'provisioned') {
      console.log(`[ESPDiscovery] Device marked as provisioned in TXT records`)
      return true
    }

    if (txt.provisioned === 'false' || txt.status === 'unprovisioned') {
      console.log(`[ESPDiscovery] Device marked as unprovisioned in TXT records`)
      return false
    }

    // If TXT records are unclear, check via HTTP
    const ipAddress = service.addresses?.find((a) => a.includes('.'))
    if (ipAddress) {
      const port = service.port || 80
      const baseUrl = `http://${ipAddress}:${port}`

      // Try status endpoints to determine provisioning state
      const statusEndpoints = ['/status', '/api/status', '/info', '/api/info', '/device-info']

      for (const endpoint of statusEndpoints) {
        try {
          const response = await axios.get(`${baseUrl}${endpoint}`, {
            timeout: 2000,
            headers: {
              'User-Agent': 'regain3d-discovery'
            }
          })

          if (response.status === 200 && response.data) {
            const data: ESPDeviceStatus = response.data

            // Check for provisioning status indicators
            if (
              data.provisioned === true ||
              data.status === 'provisioned' ||
              data.assigned === true
            ) {
              console.log(`[ESPDiscovery] Device reports provisioned status via ${endpoint}`)
              return true
            }

            if (
              data.provisioned === false ||
              data.status === 'unprovisioned' ||
              data.assigned === false
            ) {
              console.log(`[ESPDiscovery] Device reports unprovisioned status via ${endpoint}`)
              return false
            }

            // Check for configuration indicators
            if (data.firmware_url || data.firmwareUrl || data.api_endpoint || data.apiEndpoint) {
              console.log(`[ESPDiscovery] Device has configuration data, likely provisioned`)
              return true
            }
          }
        } catch {
          // Endpoint not available, continue
          continue
        }
      }
    }

    // Default to unprovisioned if unclear
    console.log(
      `[ESPDiscovery] Could not determine provisioning status, defaulting to unprovisioned`
    )
    return false
  }
}
