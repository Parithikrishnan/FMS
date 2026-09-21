/* investigation.js – case workspace with Alerts | Transactions | Findings tabs.
   Loads GET /api/cases/:id (case + alert + transaction history + findings);
   new findings are saved with POST /api/cases/:id/findings. */

(function () {
  var TABS = ['alerts', 'transactions', 'findings'];
  var state = {
    caseId: param('case'),
    tab: TABS.indexOf(param('tab')) !== -1 ? param('tab') : 'alerts',
    adding: false,
    data: null          // { case, alert, txn, findings } for state.caseId
  };

  var select = $('#case-select');
  var flowEl = $('#flow');
  var summaryEl = $('#case-summary');
  var tabsEl = $('#tabs');
  var panelEl = $('#panel');

  // Tab buttons, "n findings" chip and the finding form controls.
  document.addEventListener('click', function (e) {
    var tabBtn = e.target.closest('[data-tab]');
    if (tabBtn) { state.tab = tabBtn.dataset.tab; render(); return; }

    var action = e.target.closest('[data-action]');
    if (!action) return;
    if (action.dataset.action === 'add-finding') { state.adding = true; render(); $('#finding-title').focus(); }
    if (action.dataset.action === 'cancel-finding') { state.adding = false; render(); }
  });

  document.addEventListener('submit', async function (e) {
    if (e.target.id !== 'finding-form') return;
    e.preventDefault();

    var f = e.target.elements;
    var errorEl = $('#finding-error');
    var saveBtn = $('#finding-save');
    errorEl.hidden = true;
    saveBtn.disabled = true;
    saveBtn.textContent = 'Saving…';
    try {
      await FMS.addFinding(state.caseId, { title: f.title.value.trim(), description: f.description.value.trim(), status: f.status.value });
      state.data = await FMS.caseDetail(state.caseId);
      state.adding = false;
      state.tab = 'findings';
      render();
    } catch (err) {
      errorEl.textContent = err.message;
      errorEl.hidden = false;
      saveBtn.disabled = false;
      saveBtn.textContent = 'Save finding';
    }
  });

  select.addEventListener('change', function () {
    state.caseId = select.value;
    state.adding = false;
    loadCase();
  });

  // Fetch the case list once, then the selected case.
  loadThen([panelEl], async function () {
    var cases = await FMS.cases({ limit: 200 });
    if (!cases.items.length) {
      flowEl.innerHTML = '';
      summaryEl.hidden = true;
      tabsEl.innerHTML = '';
      panelEl.innerHTML = '<div class="card empty">No cases yet. A case is opened automatically when the fraud rules raise an alert.</div>';
      select.disabled = true;
      return;
    }

    select.innerHTML = cases.items.map(function (c) {
      return '<option value="' + esc(c.id) + '">' + esc(c.id) + ' · ' + esc(c.txnId) + '</option>';
    }).join('');
    var known = cases.items.some(function (c) { return c.id === state.caseId; });
    state.caseId = known ? state.caseId : cases.items[cases.items.length - 1].id;   // default: the oldest case
    select.value = state.caseId;

    state.data = await FMS.caseDetail(state.caseId);
    render();
  });

  function loadCase() {
    loadThen([panelEl], async function () {
      state.data = await FMS.caseDetail(state.caseId);
      render();
    });
  }

  function render() {
    var d = state.data;
    var x = { c: d.case, a: d.alert, txns: [d.txn], findings: d.findings };
    renderFlow(x);
    renderSummary(x);
    renderTabs(x);
    if (state.tab === 'alerts') renderAlerts(x);
    else if (state.tab === 'transactions') renderTransactions(x);
    else renderFindings(x);
  }

  function renderFlow(x) {
    flowEl.innerHTML =
      '<li><a href="' + pageHref('alerts.html?id=' + esc(x.a.id)) + '">' + esc(x.a.id) + '</a></li>' +
      '<li><a href="' + pageHref('cases.html?id=' + esc(x.c.id)) + '">' + esc(x.c.id) + '</a></li>' +
      '<li><span class="current">Investigation</span></li>' +
      '<li><button type="button" data-tab="findings">' + x.findings.length + ' finding' + (x.findings.length === 1 ? '' : 's') + '</button></li>';
  }

  function renderSummary(x) {
    summaryEl.hidden = false;
    summaryEl.innerHTML =
      '<div class="case-title"><h2>' + esc(x.c.id) + '</h2>' + StatusBadge(x.c.status) + SeverityBadge(x.a.severity) + '</div>' +
      '<p class="muted alert-desc">' + esc(x.a.description) + '</p>' +
      details([
        ['Alert', alertLink(x.a.id)],
        ['Transaction', txnLink(x.c.txnId)],
        ['Assigned To', esc(x.c.assignedTo)],
        ['Case Created', fmtDate(x.c.date)]
      ], true);
  }

  function renderTabs(x) {
    var counts = { alerts: 1, transactions: x.txns.length, findings: x.findings.length };
    tabsEl.innerHTML = TABS.map(function (t) {
      return '<button class="tab" role="tab" data-tab="' + t + '" aria-selected="' + (state.tab === t) + '">' +
        t.charAt(0).toUpperCase() + t.slice(1) + '<span class="tab-count">' + counts[t] + '</span></button>';
    }).join('');
  }

  /* --- Alerts tab --- */
  function renderAlerts(x) {
    panelEl.innerHTML = '<div class="card"><div class="card-head"><h2>' + esc(x.a.id) + ' · ' + esc(x.a.type) + '</h2>' +
      SeverityBadge(x.a.severity) + '</div><div class="card-body">' +
      '<p class="alert-desc">' + esc(x.a.description) + '</p>' +
      details([
        ['Status', StatusBadge(x.a.status)],
        ['Created', fmtDate(x.a.date)],
        ['Transaction', txnLink(x.a.relatedTxn)]
      ], true) + '</div></div>';
  }

  /* --- Transactions tab --- */
  function renderTransactions(x) {
    panelEl.innerHTML = '<div class="stack">' + x.txns.map(function (t) {
      var diff = t.amount - t.originalAmount;
      var pct = t.originalAmount ? Math.round(diff / t.originalAmount * 100) : 0;

      var compare = t.modified
        ? '<div class="compare">' +
            '<div class="from"><span class="label">Original Amount</span><span class="amount">' + inr(t.originalAmount) + '</span></div>' +
            '<span class="arrow">' + icon('arrow', 22) + '</span>' +
            '<div class="to"><span class="label">Current Amount</span><span class="amount">' + inr(t.amount) + '</span></div>' +
            '<span class="diff">' + (diff > 0 ? '+' : '−') + inr(Math.abs(diff)) + (t.originalAmount ? ' (' + (pct > 0 ? '+' : '−') + Math.abs(pct) + '%)' : '') + '</span>' +
          '</div>'
        : '<div class="compare"><div><span class="label">Amount</span><span class="amount">' + inr(t.amount) + '</span></div>' +
          '<span class="muted">No modification detected</span></div>';

      var trail = '<h3 class="section-title">Audit trail</h3><ol class="timeline">' + t.history.map(function (h) {
        return '<li><div class="tl-event">' + esc(h.event) + '</div><div class="tl-detail">' + esc(h.detail) + '</div>' +
          '<div class="tl-time">' + fmtDate(h.date) + '</div></li>';
      }).join('') + '</ol>';

      return '<div class="card"><div class="card-head"><h2>' + esc(t.id) + '</h2>' + StatusBadge(t.status) + '</div>' +
        '<div class="card-body">' + compare +
        '<h3 class="section-title">Details</h3>' + details([
          ['Transaction ID', esc(t.id)],
          ['Modified By', t.modifiedBy ? esc(t.modifiedBy) : '<span class="muted">—</span>'],
          ['Source IP', t.sourceIp ? '<span class="mono">' + esc(t.sourceIp) + '</span>' : '<span class="muted">—</span>'],
          ['Date', fmtDate(t.date)]
        ], true) + trail + '</div></div>';
    }).join('') + '</div>';
  }

  /* --- Findings tab --- */
  function renderFindings(x) {
    var list = x.findings.map(function (f) {
      return '<article class="card finding"><div class="finding-head"><h3>' + esc(f.title) + '</h3>' + StatusBadge(f.status) + '</div>' +
        '<p>' + esc(f.description) + '</p>' +
        '<div class="finding-meta">' + esc(f.id) + ' · recorded ' + fmtDate(f.date) + '</div></article>';
    }).join('');

    var form = state.adding
      ? '<form class="card finding-form" id="finding-form">' +
          '<label>Finding title<input class="input" id="finding-title" name="title" required maxlength="255" placeholder="e.g. Unauthorized Transaction Modification"></label>' +
          '<label>Description<textarea class="input" name="description" rows="3" placeholder="What did you find?"></textarea></label>' +
          '<label>Status<select class="input" name="status"><option>Open</option><option>Under Review</option><option>Confirmed</option><option>Dismissed</option></select></label>' +
          '<div class="form-error" id="finding-error" role="alert" hidden></div>' +
          '<div class="form-actions"><button type="submit" class="btn btn-primary" id="finding-save">Save finding</button>' +
          '<button type="button" class="btn btn-ghost" data-action="cancel-finding">Cancel</button></div></form>'
      : '<div><button type="button" class="btn btn-primary" data-action="add-finding">Add finding</button></div>';

    panelEl.innerHTML = '<div class="stack">' +
      (list || '<div class="card empty">No findings recorded for this case yet.</div>') + form + '</div>';
  }
})();
