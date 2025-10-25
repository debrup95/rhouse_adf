const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function(app) {
  // Determine backend target based on environment
  const backendTarget = process.env.DOCKER_ENV 
    ? 'http://backend-server:5004' 
    : 'http://localhost:5004';



  // Proxy API requests to the backend server (only paths starting with /api)
  app.use(
    '/api',
    createProxyMiddleware({
      target: backendTarget,
      changeOrigin: true,
      pathRewrite: {
        '^/api': '/api' // Don't rewrite the path
      },
      onProxyReq: (proxyReq, req, res) => {
        // Proxy request logging removed for production
      },
      onError: (err, req, res) => {
        res.writeHead(500, {
          'Content-Type': 'application/json'
        });
        res.end(JSON.stringify({ 
          message: 'Proxy error connecting to backend server',
          error: err.message
        }));
      }
    })
  );
  
  // Don't proxy env-config.js, as it's served from the public directory
  app.use(
    '/env-config.js',
    (req, res, next) => {
      req.url = '/env-config.js';
      next();
    }
  );
}; 