/* components.js – shared layout and reusable UI pieces.
   Each page has a <main> element; buildShell() wraps it with the sidebar and header. */

/* ---------- Small helpers ---------- */

const $ = function (sel, root) { return (root || document).querySelector(sel); };
const param = function (name) { return new URLSearchParams(location.search).get(name); };
const slug = function (s) { return String(s).toLowerCase().replace(/\s+/g, '-'); };

function esc(v) {
  return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
  });
}

// index.html sits in the project root; every other page lives in html/.
// Pages inside html/ set <body data-root="../">, so links resolve from either location.
function pageHref(file) {
  var inSubdir = document.body.dataset.root === '../';
  if (file === 'index.html') return (inSubdir ? '../' : '') + file;
  return (inSubdir ? '' : 'html/') + file;
}

function inr(n) {
  var hasPaise = Number(n) % 1 !== 0;
  return '₹' + Number(n).toLocaleString('en-IN', { minimumFractionDigits: hasPaise ? 2 : 0, maximumFractionDigits: 2 });
}

function fmtDate(d) {
  return new Date(d).toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true
  });
}

function fmtTime(d) {
  return new Date(d).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
}

function isToday(d) { return new Date(d).toDateString() === new Date().toDateString(); }

/* ---------- Icons ---------- */

const ICONS = {
  dashboard: '<rect x="3" y="3" width="7" height="9"/><rect x="14" y="3" width="7" height="5"/><rect x="14" y="12" width="7" height="9"/><rect x="3" y="16" width="7" height="5"/>',
  transactions: '<polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/>',
  alerts: '<path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>',
  cases: '<rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>',
  investigation: '<circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>',
  settings: '<line x1="4" y1="21" x2="4" y2="14"/><line x1="4" y1="10" x2="4" y2="3"/><line x1="12" y1="21" x2="12" y2="12"/><line x1="12" y1="8" x2="12" y2="3"/><line x1="20" y1="21" x2="20" y2="16"/><line x1="20" y1="12" x2="20" y2="3"/><line x1="1" y1="14" x2="7" y2="14"/><line x1="9" y1="8" x2="15" y2="8"/><line x1="17" y1="16" x2="23" y2="16"/>',
  sun: '<circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>',
  moon: '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>',
  menu: '<line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/>',
  close: '<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>',
  arrow: '<line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>'
};

function icon(name, size, extraClass) {
  size = size || 20;
  return '<svg class="icon ' + (extraClass || '') + '" width="' + size + '" height="' + size + '" viewBox="0 0 24 24" fill="none" ' +
    'stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + ICONS[name] + '</svg>';
}

/* ---------- Badges & links ---------- */

function SeverityBadge(sev) { return '<span class="badge sev sev-' + slug(sev) + '">' + esc(sev) + '</span>'; }
function StatusBadge(status) { return '<span class="badge status status-' + slug(status) + '">' + esc(status) + '</span>'; }

function txnLink(id) { return '<a class="link" href="' + pageHref('transactions.html?id=' + esc(id)) + '">' + esc(id) + '</a>'; }
function alertLink(id) { return '<a class="link" href="' + pageHref('alerts.html?id=' + esc(id)) + '">' + esc(id) + '</a>'; }
function caseLink(id) { return '<a class="link" href="' + pageHref('cases.html?id=' + esc(id)) + '">' + esc(id) + '</a>'; }

function details(pairs, cols) {
  return '<dl class="details' + (cols ? ' cols' : '') + '">' + pairs.map(function (p) {
    return '<div><dt>' + esc(p[0]) + '</dt><dd>' + p[1] + '</dd></div>';
  }).join('') + '</dl>';
}

/* ---------- KPI card ---------- */

function KpiCard(cfg) {
  return '<a class="card kpi ' + (cfg.tone ? 'kpi-' + cfg.tone : '') + '" href="' + cfg.href + '">' +
    '<div class="kpi-icon">' + icon(cfg.icon, 22) + '</div>' +
    '<div><div class="kpi-label">' + esc(cfg.label) + '</div>' +
    '<div class="kpi-value">' + esc(cfg.value) + '</div>' +
    '<div class="kpi-hint">' + esc(cfg.hint) + '</div></div></a>';
}

/* ---------- Loading spinner ---------- */

function Spinner() {
  return '<div class="spinner-wrap"><div class="spinner" role="status" aria-label="Loading"></div></div>';
}

function ErrorCard(err) {
  return '<div class="card error-card"><h2>Could not load data</h2>' +
    '<p class="muted">' + esc(err && err.message ? err.message : err) + '</p>' +
    '<button type="button" class="btn btn-ghost" data-retry>Try again</button></div>';
}

// Shows a spinner in each mount, then runs work() (which may be async and fetch from the API).
// If it fails, the first mount shows the error with a retry button.
function loadThen(mounts, work) {
  mounts = [].concat(mounts);
  mounts.forEach(function (m) { m.innerHTML = Spinner(); });
  Promise.resolve().then(work).catch(function (err) {
    console.error(err);
    mounts.forEach(function (m, i) { m.innerHTML = i === 0 ? ErrorCard(err) : ''; });
    var retry = mounts[0].querySelector('[data-retry]');
    if (retry) retry.addEventListener('click', function () { location.reload(); });
  });
}

/* ---------- Data table (used for Transactions, Alerts, Cases and widgets) ----------
   cfg = {
     columns:  [{ label, render(row) -> html, className }],
     rows:     [...],
     searchKeys?:  ['id', 'status'],     // adds a search box
     filters?:     [{ key, label, options, value? }],   // adds dropdown filters
     onRowClick?:  function (row),
     emptyText?:   string
   } */

function DataTable(mount, cfg) {
  var filters = cfg.filters || [];
  var state = { q: '', values: {} };
  filters.forEach(function (f) {
    state.values[f.key] = f.value && f.options.indexOf(f.value) !== -1 ? f.value : '';
  });

  var toolbar = '';
  if (cfg.searchKeys || filters.length) {
    toolbar = '<div class="toolbar">' +
      (cfg.searchKeys ? '<input type="search" class="input" placeholder="' + esc(cfg.searchPlaceholder || 'Search…') + '" aria-label="Search">' : '') +
      filters.map(function (f) {
        return '<select class="input" data-filter="' + f.key + '" aria-label="' + esc(f.label) + '">' +
          '<option value="">' + esc(f.label) + '</option>' +
          f.options.map(function (o) {
            return '<option' + (state.values[f.key] === o ? ' selected' : '') + '>' + esc(o) + '</option>';
          }).join('') + '</select>';
      }).join('') +
      '<span class="toolbar-count" aria-live="polite"></span></div>';
  }

  mount.innerHTML = toolbar +
    '<div class="table-wrap"><table class="table"><thead><tr>' +
    cfg.columns.map(function (c) { return '<th class="' + (c.className || '') + '">' + esc(c.label) + '</th>'; }).join('') +
    '</tr></thead><tbody></tbody></table></div>' +
    '<div class="empty" hidden>' + esc(cfg.emptyText || 'Nothing to show.') + '</div>';

  var tbody = $('tbody', mount);
  var emptyEl = $('.empty', mount);
  var countEl = $('.toolbar-count', mount);
  var visible = [];

  function draw() {
    var q = state.q.trim().toLowerCase();
    visible = cfg.rows.filter(function (row) {
      var matchesFilters = filters.every(function (f) {
        return !state.values[f.key] || row[f.key] === state.values[f.key];
      });
      var matchesSearch = !q || (cfg.searchKeys || []).some(function (k) {
        return String(row[k] == null ? '' : row[k]).toLowerCase().indexOf(q) !== -1;
      });
      return matchesFilters && matchesSearch;
    });

    tbody.innerHTML = visible.map(function (row, i) {
      return '<tr' + (cfg.onRowClick ? ' class="clickable" tabindex="0" data-i="' + i + '"' : '') + '>' +
        cfg.columns.map(function (c) { return '<td class="' + (c.className || '') + '">' + c.render(row) + '</td>'; }).join('') +
        '</tr>';
    }).join('');

    emptyEl.hidden = visible.length > 0;
    if (countEl) countEl.textContent = visible.length + ' of ' + cfg.rows.length;
  }

  var searchEl = $('input[type="search"]', mount);
  if (searchEl) searchEl.addEventListener('input', function () { state.q = searchEl.value; draw(); });
  mount.querySelectorAll('select[data-filter]').forEach(function (sel) {
    sel.addEventListener('change', function () { state.values[sel.dataset.filter] = sel.value; draw(); });
  });

  if (cfg.onRowClick) {
    var open = function (e) {
      var tr = e.target.closest('tr[data-i]');
      if (tr && !e.target.closest('a')) cfg.onRowClick(visible[Number(tr.dataset.i)], tr);
    };
    tbody.addEventListener('click', open);
    tbody.addEventListener('keydown', function (e) { if (e.key === 'Enter') open(e); });
  }

  draw();
}

/* ---------- Detail drawer ---------- */

var lastFocus = null;

function openDrawer(cfg) {
  lastFocus = document.activeElement;
  $('#drawer-title').textContent = cfg.title;
  $('#drawer-sub').innerHTML = cfg.subtitle || '';
  $('#drawer-body').innerHTML = cfg.body;
  $('#drawer-actions').innerHTML = cfg.actions || '';
  $('#drawer-actions').hidden = !cfg.actions;
  $('#drawer').classList.add('open');
  $('#drawer').setAttribute('aria-hidden', 'false');
  document.body.classList.add('drawer-open');
  $('#drawer-close').focus();
}

function closeDrawer() {
  $('#drawer').classList.remove('open');
  $('#drawer').setAttribute('aria-hidden', 'true');
  document.body.classList.remove('drawer-open');
  if (lastFocus && lastFocus.focus) lastFocus.focus();
}

/* ---------- Page shell: sidebar + header ---------- */

const NAV = [
  { page: 'dashboard', href: pageHref('index.html'), label: 'Dashboard', icon: 'dashboard' },
  { page: 'transactions', href: pageHref('transactions.html'), label: 'Transactions', icon: 'transactions' },
  { page: 'alerts', href: pageHref('alerts.html'), label: 'Alerts', icon: 'alerts' },
  { page: 'cases', href: pageHref('cases.html'), label: 'Cases', icon: 'cases' },
  { page: 'investigation', href: pageHref('investigation.html'), label: 'Investigation', icon: 'investigation' },
  { page: 'settings', href: pageHref('settings.html'), label: 'Settings', icon: 'settings' }
];

function buildShell() {
  var page = document.body.dataset.page;
  var title = document.body.dataset.title || 'FMS';
  var main = $('main');

  var nav = NAV.map(function (n) {
    var active = n.page === page;
    return '<a class="nav-link' + (active ? ' active' : '') + '" href="' + n.href + '"' + (active ? ' aria-current="page"' : '') + '>' +
      icon(n.icon) + '<span>' + n.label + '</span>' +
      (n.page === 'alerts' ? '<span class="nav-count" id="nav-alert-count" hidden></span>' : '') +
      '</a>';
  }).join('');

  var shell = document.createElement('div');
  shell.innerHTML =
    '<aside class="sidebar" id="sidebar">' +
      '<a class="brand" href="' + pageHref('index.html') + '"><span class="brand-mark">FMS</span>' +
      '<span><span class="brand-name">FMS</span><br><span class="brand-sub">Financial Monitoring</span></span></a>' +
      '<nav class="nav" aria-label="Main">' + nav + '</nav>' +
      '<div class="sidebar-foot">FMS demo · live data</div>' +
    '</aside>' +
    '<div class="sidebar-backdrop" id="sidebar-backdrop"></div>' +
    '<div class="main-col">' +
      '<header class="header">' +
        '<button class="icon-btn menu-btn" id="menu-btn" aria-label="Open menu">' + icon('menu') + '</button>' +
        '<h1>' + esc(title) + '</h1>' +
        '<span class="header-date">' + new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) + '</span>' +
        '<div class="header-right">' +
          '<span class="live-pill" id="api-pill"><span class="live-dot wait" id="api-dot"></span><span id="api-text">Connecting…</span></span>' +
          '<button class="icon-btn" id="theme-toggle" aria-label="Toggle light / dark theme">' + icon('moon', 18, 'icon-moon') + icon('sun', 18, 'icon-sun') + '</button>' +
          '<span class="avatar" title="Fraud Analyst">FA</span>' +
        '</div>' +
      '</header>' +
      '<div class="content" id="content"></div>' +
    '</div>' +
    '<div class="overlay" id="overlay"></div>' +
    '<aside class="drawer" id="drawer" role="dialog" aria-modal="true" aria-labelledby="drawer-title" aria-hidden="true">' +
      '<div class="drawer-head"><div><h2 id="drawer-title"></h2><div class="drawer-sub" id="drawer-sub"></div></div>' +
      '<button class="icon-btn" id="drawer-close" aria-label="Close details">' + icon('close') + '</button></div>' +
      '<div class="drawer-body" id="drawer-body"></div>' +
      '<div class="drawer-actions" id="drawer-actions" hidden></div>' +
    '</aside>';

  // Place the shell before <main>, then move <main> into the content area.
  while (shell.firstChild) document.body.insertBefore(shell.firstChild, main);
  $('#content').appendChild(main);

  $('#theme-toggle').addEventListener('click', toggleTheme);
  $('#menu-btn').addEventListener('click', function () { document.body.classList.add('nav-open'); });
  $('#sidebar-backdrop').addEventListener('click', function () { document.body.classList.remove('nav-open'); });
  $('#overlay').addEventListener('click', closeDrawer);
  $('#drawer-close').addEventListener('click', closeDrawer);
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      closeDrawer();
      document.body.classList.remove('nav-open');
    }
  });
}

/* ---------- Live backend status (header pill + unresolved-alert count) ---------- */

function refreshBackendStatus() {
  FMS.health().then(function () {
    $('#api-dot').className = 'live-dot';
    $('#api-text').textContent = 'Backend connected';
  }, function () {
    $('#api-dot').className = 'live-dot off';
    $('#api-text').textContent = 'Backend offline';
  });

  FMS.alerts({ status: 'Open', limit: 1 }).then(function (d) {
    var badge = $('#nav-alert-count');
    if (!badge) return;
    badge.textContent = d.total;
    badge.title = d.total + ' open alerts';
    badge.hidden = !d.total;
  }, function () { /* the pill already shows the outage */ });
}

buildShell();
refreshBackendStatus();
setInterval(refreshBackendStatus, 30000);
