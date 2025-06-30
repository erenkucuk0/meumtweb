import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig(() => {
  // Fixed ports for development
  const backendPort = parseInt(process.env.VITE_BACKEND_PORT || '5002', 10)
  const frontendPort = parseInt(process.env.VITE_FRONTEND_PORT || '3002', 10)

  return {
    plugins: [react()],
    
    // Context7 pattern: Enhanced server configuration
    server: {
      port: frontendPort,
      strictPort: true,
      host: '0.0.0.0',
      proxy: {
        '/api': {
          target: `http://localhost:5002`,
          changeOrigin: true,
          secure: false,
          ws: true,
          configure: (proxy, options) => {
            proxy.on('error', (err, req, res) => {
              console.error('Proxy error:', err)
            })
            proxy.on('proxyReq', (proxyReq, req, res) => {
              console.log(`Sending Request to Backend: ${req.method} ${req.url}`)
            })
            proxy.on('proxyRes', (proxyRes, req, res) => {
              console.log(`Received Response from Backend: ${proxyRes.statusCode} ${req.url}`)
            })
          }
        },
        '/uploads': {
          target: `http://localhost:5002`,
          changeOrigin: true,
          secure: false,
          rewrite: (path) => path.replace(/^\/uploads/, '/uploads'),
          configure: (proxy, options) => {
            proxy.on('error', (err, req, res) => {
              console.error('Uploads Proxy error:', err)
            })
          }
        },
        '/images': {
          target: `http://localhost:${frontendPort}`,
          rewrite: (path) => path.replace(/^\/images/, '/public/images')
        }
      },
      watch: {
        usePolling: true,
        interval: 1000
      },
      hmr: {
        protocol: 'ws',
        host: 'localhost',
        port: frontendPort
      }
    },

    // Context7 pattern: Enhanced build configuration
    build: {
      outDir: 'dist',
      sourcemap: true,
      manifest: true,
      rollupOptions: {
        output: {
          manualChunks: {
            vendor: ['react', 'react-dom', 'react-router-dom'],
            utils: ['axios', 'lodash']
          }
        }
      },
      chunkSizeWarningLimit: 1000
    },

    // Context7 pattern: Enhanced resolve configuration
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
        '@components': path.resolve(__dirname, './src/components'),
        '@pages': path.resolve(__dirname, './src/pages'),
        '@services': path.resolve(__dirname, './src/services'),
        '@utils': path.resolve(__dirname, './src/utils'),
        '@assets': path.resolve(__dirname, './src/assets'),
        '@styles': path.resolve(__dirname, './src/styles')
      }
    },

    // Context7 pattern: Enhanced optimization configuration
    optimizeDeps: {
      include: ['react', 'react-dom', 'react-router-dom', 'axios'],
      exclude: ['@testing-library/jest-dom']
    },

    // Context7 pattern: Enhanced preview configuration
    preview: {
      port: frontendPort,
      strictPort: false,
      host: true
    },

    // Context7 pattern: Enhanced test configuration
    test: {
      globals: true,
      environment: 'jsdom',
      setupFiles: './src/test/setup.ts',
      coverage: {
        reporter: ['text', 'json', 'html'],
        exclude: [
          'node_modules/',
          'src/test/',
          '**/*.d.ts',
        ]
      }
    }
  }
})
