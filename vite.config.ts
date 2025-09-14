import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  
  return {
    server: {
      host: "::",
      port: 8080,
      proxy: {
        // Proxy Printify API calls through our backend server (better rate limiting)
        '/v1': {
          target: 'http://localhost:3001/api/printify',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/v1/, '')
        },
        // Proxy Printify API calls through our backend server (better rate limiting)
        '/api/printify': {
          target: 'http://localhost:3001',
          changeOrigin: true,
          configure: (proxy, options) => {
            proxy.on('proxyReq', (proxyReq, req, res) => {
              console.log('🔗 Proxying request:', req.method, req.url, '→', proxyReq.path);
            });
            
            proxy.on('proxyRes', (proxyRes, req, res) => {
              console.log('📡 Proxy response:', proxyRes.statusCode, 'for', req.method, req.url);
            });
            
            proxy.on('error', (err, req, res) => {
              console.error('❌ Proxy error:', err.message, 'for', req.url);
            });
          }
        },
        // Proxy admin config API calls
        '/api/admin': {
          target: 'http://localhost:3001',
          changeOrigin: true
        },
        // Proxy catalog search API calls
        '/api/catalog': {
          target: 'http://localhost:3001',
          changeOrigin: true
        },
        // Proxy products API calls
        '/api/products': {
          target: 'http://localhost:3001',
          changeOrigin: true
        },
        // Proxy Stripe API calls
        '/api/stripe': {
          target: 'http://localhost:3001',
          changeOrigin: true
        },
      },
    },
    plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
  };
});
