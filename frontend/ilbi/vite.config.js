import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { loaderMarkup } from './src/components/common/ilbi/loader.js'

const apiTarget = process.env.VITE_API_TARGET || 'http://localhost';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), {
    name: 'ilbi-boot-loader',
    transformIndexHtml(html) {
      return html.replace('<!-- ilbi-boot-loader -->', `<div id="ilbi-boot-loader" class="ilbi-loading" role="status" aria-label="Sahifa yuklanmoqda..." aria-busy="true"><span class="ilbi-loader">${loaderMarkup('ilbi-boot')}</span></div>`);
    },
  }],
  server: {
    host: '0.0.0.0',
    port: 5173,
    allowedHosts: true,
    watch: {
      usePolling: true,
    },
    proxy: {
      '/api': {
        target: apiTarget,
        changeOrigin: true,
      },
      '/media': {
        target: apiTarget,
        changeOrigin: true,
      },
    },
  },
})
