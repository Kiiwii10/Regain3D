import { resolve } from 'path'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    build: {
      lib: {
        entry: resolve(__dirname, 'src/electron/index.ts')
      }
    },
    resolve: {
      alias: {
        '@shared': resolve(__dirname, 'src/shared'),
        '@electron': resolve(__dirname, 'src/electron'),
        '@renderer': resolve(__dirname, 'src/renderer/src'),
        '@resources': resolve(__dirname, 'resources')
      }
    }
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    build: {
      rollupOptions: {
        input: {
          index: resolve(__dirname, 'src/preload/index.ts')
        }
      }
    },
    resolve: {
      alias: {
        '@shared': resolve(__dirname, 'src/shared'),
        '@electron': resolve(__dirname, 'src/electron'),
        '@renderer': resolve(__dirname, 'src/renderer/src'),
        '@resources': resolve(__dirname, 'resources')
      }
    }
  },
  renderer: {
    resolve: {
      alias: {
        '@shared': resolve(__dirname, 'src/shared'),
        '@electron': resolve(__dirname, 'src/electron'),
        '@renderer': resolve(__dirname, 'src/renderer/src'),
        '@resources': resolve(__dirname, 'resources')
      }
    },
    plugins: [react()]
  }
})
