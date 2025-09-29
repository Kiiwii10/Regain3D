import {
  DiscoveredESP,
  ProvisioningPayload,
  ESPProvisioningResponse,
  ApplicationConfig
} from '@shared/types/esp'
import { PrinterBrand } from '@shared/types/printer'
import { Buffer } from 'buffer'
import { ESPDeviceStatus } from './types/esp.types'

export class ESPProvisioningService {
  private static readonly PROVISIONING_TIMEOUT = 30000 // 30 seconds
  private static readonly RETRY_ATTEMPTS = 3
  private static readonly RETRY_DELAY = 2000 // 2 seconds

  /**
   * Provision an ESP device with printer application
   */
  static async provisionESP(
    espDevice: DiscoveredESP,
    config: ApplicationConfig
  ): Promise<ESPProvisioningResponse> {
    const payload: ProvisioningPayload = {
      firmware_url: config.firmwareUrl,
      firmware_md5: config.firmwareMD5,
      firmware_size: config.firmwareSize,
      api_endpoint: config.apiEndpoint,
      update_token: config.updateToken,
      // Send both keys for compatibility with different ESP firmware expectations
      printer_type: this.convertPrinterBrandToString(config.PrinterBrand),
      printer_brand: this.convertPrinterBrandToString(config.PrinterBrand),
      printer_model: config.printerModel || '',
      printer_id: config.printerId,
      printer_name: config.printerName,
      printer_connection_data: config.printerConnection || undefined
    }

    let lastError: Error | null = null

    for (let attempt = 1; attempt <= this.RETRY_ATTEMPTS; attempt++) {
      try {
        console.log(
          `[ESPProvisioning] Attempting to provision ${espDevice.name} (attempt ${attempt}/${this.RETRY_ATTEMPTS})`
        )

        const response = await this.makeProvisioningRequest(espDevice, payload)

        if (response.success) {
          console.log(`[ESPProvisioning] Successfully provisioned ${espDevice.name}`)
          return response
        } else {
          throw new Error(response.error || 'Provisioning failed')
        }
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error))
        console.warn(
          `[ESPProvisioning] Attempt ${attempt} failed for ${espDevice.name}:`,
          lastError.message
        )

        if (attempt < this.RETRY_ATTEMPTS) {
          await this.delay(this.RETRY_DELAY * attempt) // Exponential backoff
        }
      }
    }

    return {
      success: false,
      error: `Failed to provision after ${this.RETRY_ATTEMPTS} attempts. Last error: ${lastError?.message}`
    }
  }

  /**
   * Check if ESP device is reachable
   */
  static async pingESP(espDevice: DiscoveredESP): Promise<boolean> {
    try {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 5000) // 5 second timeout

      const response = await fetch(`http://${espDevice.ip}/`, {
        method: 'GET',
        signal: controller.signal
      })

      clearTimeout(timeout)
      return response.ok
    } catch (error) {
      console.log(
        `[ESPProvisioning] ESP ${espDevice.name} at ${espDevice.ip} is not reachable:`,
        error
      )
      return false
    }
  }

  /**
   * Get current status/info from ESP device
   */
  static async getESPStatus(espDevice: DiscoveredESP): Promise<ESPDeviceStatus> {
    // Probe root endpoint first. Fallback to legacy /status if needed.
    const tryFetch = async (): Promise<ESPDeviceStatus> => {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 10000) // 10 second timeout
      try {
        const response = await fetch(`http://${espDevice.ip}/`, {
          method: 'GET',
          headers: { Accept: 'application/json' },
          signal: controller.signal
        })
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`)
        }
        // If response is JSON, return parsed; if not, this will throw
        try {
          const data = await response.json()
          return data
        } catch {
          // Non-JSON body
          throw new Error('Non-JSON response')
        }
      } finally {
        clearTimeout(timeout)
      }
    }

    try {
      const data = await tryFetch()
      return data
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e)
      console.warn(
        `[ESPProvisioning] Failed to get status from ${espDevice.name} (${espDevice.ip}):`,
        message
      )
      throw e instanceof Error ? e : new Error(String(e))
    }
  }

  /**
   * Trigger identity blink on the ESP via /identify
   */
  static async identifyByIP(
    ip: string,
    opts?: { action?: 'start' | 'stop' | 'off' | 'on' | '0' | '1'; durationMs?: number }
  ): Promise<boolean> {
    try {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 5000)

      const params = new URLSearchParams()
      if (opts?.action) params.set('action', opts.action)
      if (opts?.durationMs && opts.durationMs > 0)
        params.set('duration_ms', String(opts.durationMs))
      const qs = params.toString()

      const response = await fetch(`http://${ip}/identify${qs ? `?${qs}` : ''}`, {
        method: 'GET',
        signal: controller.signal
      })

      clearTimeout(timeout)
      return response.ok
    } catch (error) {
      console.warn(`[ESPProvisioning] Failed to trigger identify on ${ip}:`, error)
      return false
    }
  }

  /**
   * Make the actual provisioning HTTP request
   */
  private static async makeProvisioningRequest(
    espDevice: DiscoveredESP,
    payload: ProvisioningPayload
  ): Promise<ESPProvisioningResponse> {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), this.PROVISIONING_TIMEOUT)

    try {
      // Log sanitized payload for debugging
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const sanitize = (obj: any): any => {
        if (obj === null || typeof obj !== 'object') return obj
        if (Array.isArray(obj)) return obj.map(sanitize)
        const out: Record<string, unknown> = {}
        for (const [k, v] of Object.entries(obj)) {
          if (/access|secret|token|password/i.test(k)) {
            out[k] = '***'
          } else {
            out[k] = sanitize(v)
          }
        }
        return out
      }
      const sanitized = sanitize(payload)
      const body = JSON.stringify(payload)
      console.log(
        `[ESPProvisioning] POST http://${espDevice.ip}/assign-app with payload:`,
        JSON.stringify(sanitized)
      )

      const response = await fetch(`http://${espDevice.ip}/assign-app`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          'Content-Length': Buffer.byteLength(body).toString()
        },
        body,
        signal: controller.signal
      })

      clearTimeout(timeout)

      if (response.ok) {
        try {
          const result = await response.json()
          console.log('[ESPProvisioning] Provisioning response (OK):', result)
          return {
            success: true,
            message: result.message || 'Provisioning successful'
          }
        } catch {
          // If response is not JSON, but status is OK, assume success
          console.log('[ESPProvisioning] Provisioning response (OK, non-JSON)')
          return {
            success: true,
            message: 'Provisioning successful'
          }
        }
      } else {
        let errorMessage = `HTTP ${response.status}: ${response.statusText}`

        try {
          const text = await response.text()
          console.warn('[ESPProvisioning] Provisioning response (Error):', text)
          try {
            const errorBody = JSON.parse(text)
            if (errorBody.error) {
              errorMessage = errorBody.error
            }
          } catch {
            // non-JSON body
          }
        } catch {
          // If error response is not JSON, use the HTTP status
        }

        return {
          success: false,
          error: errorMessage
        }
      }
    } catch (error) {
      if (controller.signal.aborted) {
        throw new Error('Provisioning request timed out')
      }
      throw error
    } finally {
      clearTimeout(timeout)
    }
  }

  /**
   * Convert PrinterBrand to string expected by ESP API
   */
  private static convertPrinterBrandToString(brand: PrinterBrand): string {
    switch (brand) {
      case 'bambu':
        return 'bambu'
      case 'prusa':
        return 'prusa'
      default:
        return 'generic'
    }
  }

  /**
   * Utility function for delays
   */
  private static delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }

  /**
   * Validate provisioning payload before sending
   */
  static validateProvisioningConfig(config: ApplicationConfig): string[] {
    const errors: string[] = []

    if (!config.firmwareUrl || !config.firmwareUrl.trim()) {
      errors.push('Firmware URL is required')
    }

    if (!config.firmwareMD5 || !config.firmwareMD5.trim()) {
      errors.push('Firmware MD5 hash is required')
    }

    if (!config.firmwareSize || config.firmwareSize <= 0) {
      errors.push('Firmware size must be greater than 0')
    }

    if (!config.apiEndpoint || !config.apiEndpoint.trim()) {
      errors.push('API endpoint is required')
    }

    // Validate URL format
    try {
      new URL(config.firmwareUrl)
    } catch {
      errors.push('Firmware URL must be a valid URL')
    }

    try {
      new URL(config.apiEndpoint)
    } catch {
      errors.push('API endpoint must be a valid URL')
    }

    // Validate MD5 hash format (32 hex characters)
    if (config.firmwareMD5 && !/^[a-fA-F0-9]{32}$/.test(config.firmwareMD5)) {
      errors.push('Firmware MD5 hash must be 32 hexadecimal characters')
    }

    return errors
  }
}
