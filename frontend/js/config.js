/* config.js – where the backend API lives.
 *
 * '/api' works when nginx serves this frontend AND proxies /api to the backend
 * (docker compose up). If you serve the frontend on its own (e.g. python -m http.server),
 * point it at the backend directly and set CORS_ORIGINS on the backend to this page's origin:
 *
 *     window.FMS_API_BASE = 'http://localhost:5000/api';
 */
window.FMS_API_BASE = '/api';
