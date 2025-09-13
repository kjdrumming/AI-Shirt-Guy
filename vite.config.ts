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
        // Proxy Printify API calls to avoid CORS (new path)
        '/v1': {
          target: 'https://api.printify.com',
          changeOrigin: true,
          configure: (proxy, options) => {
            // Add auth headers for direct API access
            proxy.on('proxyReq', (proxyReq, req, res) => {
              const apiToken = env.VITE_PRINTIFY_API_TOKEN;
              if (apiToken) {
                proxyReq.setHeader('Authorization', `Bearer ${apiToken}`);
                proxyReq.setHeader('User-Agent', 'Creative-Shirt-Maker/1.0');
                
                // Only set Content-Type for non-FormData requests
                const contentType = req.headers['content-type'];
                if (contentType && !contentType.includes('multipart/form-data')) {
                  proxyReq.setHeader('Content-Type', 'application/json');
                }
              }
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
        // Proxy Printify API calls to avoid CORS (legacy path)
        '/api/printify': {
          target: 'https://api.printify.com',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/printify/, ''),
          configure: (proxy, options) => {
            // Add auth headers for direct API access
            proxy.on('proxyReq', (proxyReq, req, res) => {
              const apiToken = env.VITE_PRINTIFY_API_TOKEN;
              if (apiToken) {
                proxyReq.setHeader('Authorization', `Bearer ${apiToken}`);
                proxyReq.setHeader('User-Agent', 'Creative-Shirt-Maker/1.0');
                
                // Only set Content-Type for non-FormData requests
                const contentType = req.headers['content-type'];
                if (contentType && !contentType.includes('multipart/form-data')) {
                  proxyReq.setHeader('Content-Type', 'application/json');
                }
              }
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
