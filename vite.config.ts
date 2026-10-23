import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { createTrackingMiddleware } from './server/offlineTracking.ts'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    {
      name: 'localhost-game-tracking',
      configureServer(server) {
        server.middlewares.use(createTrackingMiddleware(server.config.root))
      },
      configurePreviewServer(server) {
        server.middlewares.use(createTrackingMiddleware(server.config.root))
      },
    },
  ],
})
