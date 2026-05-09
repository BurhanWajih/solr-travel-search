import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Proxy /solr requests to the real Solr server to avoid CORS issues
    proxy: {
      '/solr': {
        target: 'http://localhost:8983',
        changeOrigin: true,
      },
    },
  },
})
