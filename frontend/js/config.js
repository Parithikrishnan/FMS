/* config.js – where the backend API lives.
 * Automatically connects to backend on port 5000 when served standalone (e.g. py -m http.server 5500),
 * or '/api' when served through nginx reverse proxy.
 */
window.FMS_API_BASE = (function () {
  if (window.location.protocol === 'http:' || window.location.protocol === 'https:') {
    var port = window.location.port;
    if (port && port !== '80' && port !== '443' && port !== '5000') {
      return window.location.protocol + '//' + window.location.hostname + ':5000/api';
    }
  }
  return '/api';
})();
