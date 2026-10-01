const { createProxyMiddleware } = require('http-proxy-middleware');

// Dev-server proxy for the FastAPI backend.
//
// The app normally talks to the backend directly via
// process.env.REACT_APP_API_URL (src/services/api.ts), so this only kicks in
// for relative URLs.
//
// Two things to keep in mind (both are load-bearing):
//   1. http-proxy-middleware v3 takes a single options object. The old
//      createProxyMiddleware(pathFilterFn, options) two-argument form throws
//      "Missing target option" while this file is being required, and the dev
//      server then never binds a port.
//   2. Mounting with app.use('/api', ...) lets Express strip '/api' from
//      req.url before the middleware runs, so the backend received
//      '/ai/health' and returned 404. Mounting at '/' and filtering with
//      `pathFilter` keeps the prefix intact.
module.exports = function (app) {
  app.use(
    createProxyMiddleware({
      target: 'http://localhost:8002',
      changeOrigin: true,
      pathFilter: (pathname) => pathname.startsWith('/api'),
      onError: (err, req, res) => {
        console.error('Proxy error:', err.message);
        res.writeHead(502, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ detail: 'Backend unreachable on http://localhost:8002' }));
      },
    })
  );
};
