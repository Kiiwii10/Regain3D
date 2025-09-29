import * as path from 'path'
import * as fs from 'fs'
import type { Knex } from 'knex'
import knex from 'knex'
import { app } from 'electron'
import { PrinterConfig } from '@shared/types/printer'
import { ESPConfig } from '@shared/types/esp'

const NEW_DB_FILE = 'regain3d.db'
const OLD_DB_FILE = '3dwaste.db'
const userDataPath = app.getPath('userData')
const newDbPath = path.join(userDataPath, NEW_DB_FILE)
const oldDbPath = path.join(userDataPath, OLD_DB_FILE)
// Backward compatible: if old DB exists and new one does not, keep using the old file.
const dbPath = fs.existsSync(oldDbPath) && !fs.existsSync(newDbPath) ? oldDbPath : newDbPath

class DatabaseService {
  private static instance: DatabaseService
  public db: Knex

  private constructor() {
    this.db = knex({
      client: 'better-sqlite3',
      connection: {
        filename: dbPath
      },
      useNullAsDefault: true
    })

    console.log(`Database initialized at: ${dbPath}`)
    this.runMigrations()
  }

  public static getInstance(): DatabaseService {
    if (!DatabaseService.instance) {
      DatabaseService.instance = new DatabaseService()
    }
    return DatabaseService.instance
  }

  private async runMigrations(): Promise<void> {
    try {
      if (!(await this.db.schema.hasTable('printers'))) {
        await this.db.schema.createTable('printers', (table) => {
          table.string('id').primary()
          table.string('name').notNullable()
          table.string('brand').notNullable()
          table.string('model').notNullable()
          table.float('nozzleSizeMm').notNullable()
          table.json('capabilities').notNullable()
          table.string('accessCodeSecretId')
          table.json('connectionConfig').notNullable()
          table.string('status').defaultTo('offline')
          table.timestamp('createdAt').defaultTo(this.db.fn.now())
          table.timestamp('updatedAt').defaultTo(this.db.fn.now())
        })
        console.log('Created "printers" table.')
      }

      // Create ESP controllers table
      if (!(await this.db.schema.hasTable('esp_controllers'))) {
        await this.db.schema.createTable('esp_controllers', (table) => {
          table.string('id').primary()
          table.string('name').notNullable()
          table.string('ip').notNullable()
          table.string('hostname').notNullable()
          table.string('mac')
          table.string('version')
          table.string('chipId')
          table.string('deviceId')
          table.string('updateToken')
          table.boolean('isProvisioned').defaultTo(false)
          table.string('assignedPrinterId')
          table.timestamp('lastFirmwareUpdateAt')
          table.string('firmwareMd5')
          table.string('firmwareFileName')
          table.string('status')
          table.timestamp('lastSeenAt')
          table.string('lastPrinterState')
          table.float('lastPrinterProgress')
          table.json('lastPayload')
          table.timestamp('createdAt').defaultTo(this.db.fn.now())
          table.timestamp('updatedAt').defaultTo(this.db.fn.now())

          // Add indexes for common queries
          table.index(['ip'])
          table.index(['mac'])
          table.index(['assignedPrinterId'])
          table.index(['isProvisioned'])
          table.index(['deviceId'])
        })
        console.log('Created "esp_controllers" table.')
      }

    } catch (error: unknown) {
      console.error(error instanceof Error ? error.message : 'Unknown error')
    }
  }

  async addPrinter(printerConfig: PrinterConfig): Promise<PrinterConfig> {
    await this.db('printers').insert(printerConfig)
    return printerConfig
  }

  async getPrinter(id: string): Promise<PrinterConfig | undefined> {
    const row = await this.db('printers').where({ id }).first()
    return row ? hydratePrinter(row) : undefined
  }

  async getAllPrinters(): Promise<PrinterConfig[]> {
    const rows = await this.db('printers').select()
    return rows.map((r) => hydratePrinter(r))
  }

  async doesPrinterNameExist(name: string): Promise<boolean> {
    const printer = await this.db('printers').where({ name }).first()
    return !!printer
  }

  async updatePrinter(id: string, updates: Partial<PrinterConfig>): Promise<number> {
    return this.db('printers')
      .where({ id })
      .update({
        ...updates,
        updatedAt: this.db.fn.now()
      })
  }

  async deletePrinter(id: string): Promise<number> {
    return this.db('printers').where({ id }).del()
  }

  // ESP Controller CRUD operations
  async addESP(espConfig: ESPConfig): Promise<ESPConfig> {
    const payload = this.serializeESPWrite(espConfig)
    await this.db('esp_controllers').insert(payload)
    const created = await this.getESP(espConfig.id)
    return created || espConfig
  }

  async getESP(id: string): Promise<ESPConfig | undefined> {
    const row = await this.db('esp_controllers').where({ id }).first()
    return row ? hydrateESP(row) : undefined
  }

  async getAllESPs(): Promise<ESPConfig[]> {
    const rows = await this.db('esp_controllers').select()
    return rows.map((row) => hydrateESP(row))
  }

  async getESPByIP(ip: string): Promise<ESPConfig | undefined> {
    const row = await this.db('esp_controllers').where({ ip }).first()
    return row ? hydrateESP(row) : undefined
  }

  async getESPByMAC(mac: string): Promise<ESPConfig | undefined> {
    const row = await this.db('esp_controllers').where({ mac }).first()
    return row ? hydrateESP(row) : undefined
  }

  async getESPByChipId(chipId: string): Promise<ESPConfig | undefined> {
    const row = await this.db('esp_controllers').where({ chipId }).first()
    return row ? hydrateESP(row) : undefined
  }

  async getESPByDeviceId(deviceId: string): Promise<ESPConfig | undefined> {
    const row = await this.db('esp_controllers').where({ deviceId }).first()
    return row ? hydrateESP(row) : undefined
  }

  async getProvisionedESPs(): Promise<ESPConfig[]> {
    const rows = await this.db('esp_controllers').where({ isProvisioned: true }).select()
    return rows.map((row) => hydrateESP(row))
  }

  async getUnprovisionedESPs(): Promise<ESPConfig[]> {
    const rows = await this.db('esp_controllers').where({ isProvisioned: false }).select()
    return rows.map((row) => hydrateESP(row))
  }

  async getESPsByPrinter(printerId: string): Promise<ESPConfig[]> {
    const rows = await this.db('esp_controllers').where({ assignedPrinterId: printerId }).select()
    return rows.map((row) => hydrateESP(row))
  }

  async hasAssignedESP(printerId: string): Promise<boolean> {
    const esps = await this.getESPsByPrinter(printerId)
    return esps.length > 0
  }

  async doesESPNameExist(name: string): Promise<boolean> {
    const esp = await this.db('esp_controllers').where({ name }).first()
    return !!esp
  }

  async updateESP(id: string, updates: Partial<ESPConfig>): Promise<number> {
    const payload = this.serializeESPWrite(updates)
    delete payload.id
    delete payload.createdAt
    return this.db('esp_controllers')
      .where({ id })
      .update({
        ...payload,
        updatedAt: this.db.fn.now()
      })
  }

  async deleteESP(id: string): Promise<number> {
    return this.db('esp_controllers').where({ id }).del()
  }

  async assignESPToPrinter(espId: string, printerId: string): Promise<void> {
    await this.updateESP(espId, {
      assignedPrinterId: printerId,
      isProvisioned: true
    })
  }

  async unassignESP(espId: string): Promise<void> {
    await this.updateESP(espId, {
      assignedPrinterId: null,
      isProvisioned: false
    })
  }

  private serializeESPWrite(data: Partial<ESPConfig>): Record<string, unknown> {
    const out: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(data)) {
      if (value === undefined) continue
      if (key === 'id' || key === 'createdAt') continue
      if (key === 'lastPayload') {
        if (value === null) {
          out[key] = null
        } else if (typeof value === 'string') {
          out[key] = value
        } else {
          try {
            out[key] = JSON.stringify(value)
          } catch {
            out[key] = JSON.stringify(null)
          }
        }
        continue
      }
      out[key] = value
    }
    return out
  }
}

export const databaseService = DatabaseService.getInstance()

export function hydratePrinter(row: any): PrinterConfig {
  const hydrated = { ...row }
  try {
    if (typeof hydrated.connectionConfig === 'string') {
      hydrated.connectionConfig = JSON.parse(hydrated.connectionConfig)
    }
  } catch {}
  try {
    if (typeof hydrated.capabilities === 'string') {
      hydrated.capabilities = JSON.parse(hydrated.capabilities)
    }
  } catch {}
  return hydrated as PrinterConfig
}

export function hydrateESP(row: any): ESPConfig {
  const hydrated = { ...row }

  try {
    if (hydrated.lastPayload && typeof hydrated.lastPayload === 'string') {
      hydrated.lastPayload = JSON.parse(hydrated.lastPayload)
    }
  } catch {
    // ignore invalid JSON payloads
  }

  const dateFields: Array<keyof ESPConfig> = [
    'lastSeenAt',
    'lastFirmwareUpdateAt',
    'createdAt',
    'updatedAt'
  ]

  for (const field of dateFields) {
    const value = hydrated[field as keyof ESPConfig]
    if (value && !(value instanceof Date)) {
      try {
        hydrated[field as keyof ESPConfig] = new Date(value as string) as never
      } catch {
        // leave as-is if conversion fails
      }
    }
  }

  if (typeof hydrated.lastPrinterProgress === 'string') {
    const parsed = Number(hydrated.lastPrinterProgress)
    hydrated.lastPrinterProgress = Number.isFinite(parsed) ? parsed : undefined
  }

  return hydrated as ESPConfig
}
