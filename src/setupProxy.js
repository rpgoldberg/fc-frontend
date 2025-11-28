const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function(app) {
  console.log('[SETUP PROXY] Configuring proxies...');

  // Proxy /api requests to backend, stripping the /api prefix
  app.use(
    '/api',
    createProxyMiddleware({
      target: 'http://localhost:5000',
      changeOrigin: true,
      pathRewrite: {
        '^/api': '', // Remove /api prefix
      },
      logLevel: 'debug',
    })
  );
  console.log('[SETUP PROXY] /api proxy configured');

  // Proxy /version to backend
  app.use(
    '/version',
    createProxyMiddleware({
      target: 'http://localhost:5000',
      changeOrigin: true,
      logLevel: 'debug',
    })
  );
  console.log('[SETUP PROXY] /version proxy configured');
};
