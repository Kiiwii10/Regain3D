import { ElectronAPI } from '@shared/types/api'

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}
