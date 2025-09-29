import keytar = require('keytar') // doesnt work with ```import * as keytar from 'keytar'```.
import { v4 as uuidv4 } from 'uuid'

const SERVICE_NAME = 'com.regain3d.app'

class SecretsService {
  private static instance: SecretsService

  private constructor() {
    // Private constructor for singleton pattern
  }

  public static getInstance(): SecretsService {
    if (!SecretsService.instance) {
      SecretsService.instance = new SecretsService()
    }
    return SecretsService.instance
  }

  /**
   * Securely stores a secret (like a password or access code).
   * @param secret The string to store.
   * @returns A unique secret ID (UUID) to retrieve the secret later.
   */
  async setSecret(secret: string): Promise<string> {
    const secretId = uuidv4()
    // The keytar.setPassword function is now correctly referenced
    await keytar.setPassword(SERVICE_NAME, secretId, secret)
    return secretId
  }

  /**
   * Retrieves a secret using its unique ID.
   * @param secretId The UUID that was returned from setSecret.
   * @returns The stored secret, or null if not found.
   */
  async getSecret(secretId: string): Promise<string | null> {
    // The keytar.getPassword function is now correctly referenced
    return keytar.getPassword(SERVICE_NAME, secretId)
  }

  /**
   * Deletes a secret from secure storage.
   * @param secretId The UUID of the secret to delete.
   * @returns A boolean indicating if the deletion was successful.
   */
  async deleteSecret(secretId: string): Promise<boolean> {
    // The keytar.deletePassword function is now correctly referenced
    return keytar.deletePassword(SERVICE_NAME, secretId)
  }
}

export const secretsService = SecretsService.getInstance()
