/* api.js – the only file that talks to the FMS backend (Flask REST API under /api).
 *
 *   GET  /dashboard                     KPI counters
 *   GET  /transactions[/:id]            GET /alerts[/:id]         GET /cases[/:id]
 *   POST /cases/:id/findings            record a finding
 *   POST /events                        banking "transaction modified" event -> alert -> case
 *   GET  /health
 *
 * The backend uses snake_case names (transaction_id, alert_type, ...). The adapt* functions
 * below convert them into the shapes the pages use (id, type, originalAmount, ...).
 * Timestamps arrive as UTC ISO strings and become Date objects.
 */

var API_BASE = window.FMS_API_BASE || '/api';

function ApiError(status, message) {
  this.name = 'ApiError';
  this.status = status;
  this.message = message;
}
ApiError.prototype = Object.create(Error.prototype);

function messageFrom(json, status) {
  if (json && json.errors) return Object.keys(json.errors).map(function (k) { return k + ': ' + json.errors[k]; }).join('; ');
  if (json && json.message) return json.message;
  if (status >= 500) return 'The backend is not responding (HTTP ' + status + ').';
  return 'Request failed (HTTP ' + status + ').';
}

async function request(path, options) {
  options = options || {};
  var url = API_BASE + path;

  if (options.query) {
    var qs = new URLSearchParams();
    Object.keys(options.query).forEach(function (k) {
      var v = options.query[k];
      if (v !== undefined && v !== null && v !== '') qs.set(k, v);
    });
    if (qs.toString()) url += '?' + qs.toString();
  }

  var res;
  try {
    res = await fetch(url, {
      method: options.method || 'GET',
      headers: options.body !== undefined ? { 'Content-Type': 'application/json' } : {},
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined
    });
  } catch (e) {
    throw new ApiError(0, 'Cannot reach the backend. Is it running?');
  }

  var json = null;
  try { json = await res.json(); } catch (e) { /* not JSON, e.g. a 502 page from nginx */ }
  if (!res.ok) throw new ApiError(res.status, messageFrom(json, res.status));
  return json;
}

/* ---------- Adapters: backend JSON -> page shapes ---------- */

function adaptTxn(r) {
  return {
    id: r.transaction_id,
    amount: r.amount,
    originalAmount: r.original_amount,
    modified: r.amount !== r.original_amount,
    modifiedBy: r.modified_by,
    sourceIp: r.source_ip,
    status: r.status,
    date: new Date(r.created_at)
  };
}

function adaptAlert(r) {
  return {
    id: r.alert_id,
    relatedTxn: r.transaction_id,
    type: r.alert_type,
    severity: r.severity,
    status: r.status,
    description: r.description,
    caseId: r.case_id,
    date: new Date(r.created_at)
  };
}

function adaptCase(r) {
  return {
    id: r.case_id,
    alertId: r.alert_id,
    txnId: r.transaction_id,
    status: r.status,
    assignedTo: r.assigned_to,
    summary: 'Investigation of ' + r.transaction_id,
    date: new Date(r.created_at)
  };
}

function adaptFinding(r) {
  return {
    id: 'FIND-' + String(r.id).padStart(3, '0'),
    caseId: r.case_id,
    title: r.title,
    description: r.description || '',
    status: r.status,
    date: new Date(r.created_at)
  };
}

// A transaction's audit trail, assembled from its modifications, alerts and cases.
function buildHistory(r) {
  var events = [{ date: new Date(r.created_at), event: 'Transaction posted', detail: inr(r.original_amount) + ' recorded' }];
  (r.modifications || []).forEach(function (m) {
    events.push({
      date: new Date(m.created_at), event: 'Amount modified',
      detail: inr(m.old_amount) + ' → ' + inr(m.new_amount) + ' by ' + m.modified_by + (m.source_ip ? ' from ' + m.source_ip : '')
    });
  });
  (r.alerts || []).forEach(function (a) {
    events.push({ date: new Date(a.created_at), event: 'Alert raised', detail: a.alert_id + ' · ' + a.alert_type });
  });
  (r.cases || []).forEach(function (c) {
    events.push({ date: new Date(c.created_at), event: 'Case opened', detail: c.case_id + ' assigned to ' + c.assigned_to });
  });
  return events.sort(function (a, b) { return a.date - b.date; });
}

function adaptTxnDetail(r) {
  var t = adaptTxn(r);
  t.history = buildHistory(r);
  t.alerts = (r.alerts || []).map(adaptAlert);
  t.cases = (r.cases || []).map(adaptCase);
  return t;
}

function list(adapter) {
  return function (d) { return { items: d.items.map(adapter), total: d.total }; };
}

/* ---------- Public API ---------- */

var FMS = {
  health: function () { return request('/health'); },

  dashboard: function () {
    return request('/dashboard').then(function (d) {
      return {
        criticalAlerts: d.critical_alerts,
        openCases: d.open_cases,
        transactionsToday: d.transactions_today,
        suspiciousTransactions: d.suspicious_transactions
      };
    });
  },

  // Lists: { items, total }. query = { status, severity, transaction_id, limit (max 200), offset }
  transactions: function (query) { return request('/transactions', { query: query }).then(list(adaptTxn)); },
  alerts: function (query) { return request('/alerts', { query: query }).then(list(adaptAlert)); },
  cases: function (query) { return request('/cases', { query: query }).then(list(adaptCase)); },

  transaction: function (id) { return request('/transactions/' + encodeURIComponent(id)).then(adaptTxnDetail); },

  alert: function (id) {
    return request('/alerts/' + encodeURIComponent(id)).then(function (r) {
      return { alert: adaptAlert(r), txn: adaptTxn(r.transaction), case: r.case ? adaptCase(r.case) : null };
    });
  },

  caseDetail: function (id) {
    return request('/cases/' + encodeURIComponent(id)).then(function (r) {
      return {
        case: adaptCase(r),
        alert: adaptAlert(r.alert),
        txn: adaptTxnDetail(r.transaction),
        findings: r.findings.map(adaptFinding)
      };
    });
  },

  addFinding: function (caseId, finding) {
    return request('/cases/' + encodeURIComponent(caseId) + '/findings', { method: 'POST', body: finding }).then(adaptFinding);
  },

  // Sends a banking "amount modified" event. Resolves to { message, txn, alert|null, case|null }.
  sendEvent: function (event) {
    return request('/events', { method: 'POST', body: event }).then(function (r) {
      return {
        message: r.message,
        txn: adaptTxn(r.transaction),
        alert: r.alert ? adaptAlert(r.alert) : null,
        case: r.case ? adaptCase(r.case) : null
      };
    });
  }
};
