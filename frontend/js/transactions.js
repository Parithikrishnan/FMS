/* transactions.js – transaction table and detail drawer (data from GET /api/transactions) */

(function () {
  var mount = $('#table');
  var openToken = 0;   // ignore a slow response if another row was opened meanwhile

  async function openTransaction(id) {
    var token = ++openToken;
    openDrawer({ title: id, body: Spinner() });

    var t;
    try { t = await FMS.transaction(id); }
    catch (err) { if (token === openToken) $('#drawer-body').innerHTML = '<p class="muted">' + esc(err.message) + '</p>'; return; }
    if (token !== openToken) return;

    var alert = t.alerts[0];
    var relatedCase = t.cases[0];

    var body = details([
      ['Transaction ID', esc(t.id)],
      ['Original Amount', inr(t.originalAmount)],
      ['Current Amount', t.modified ? '<strong style="color:var(--danger)">' + inr(t.amount) + '</strong>' : inr(t.amount)],
      ['Modified By', t.modifiedBy ? esc(t.modifiedBy) : '<span class="muted">—</span>'],
      ['Source IP', t.sourceIp ? '<span class="mono">' + esc(t.sourceIp) + '</span>' : '<span class="muted">—</span>'],
      ['Date', fmtDate(t.date)]
    ], true);

    if (alert) {
      body += '<h3 class="section-title">Related</h3>' + details([
        ['Alert', alertLink(alert.id) + ' · ' + SeverityBadge(alert.severity)],
        ['Case', relatedCase ? caseLink(relatedCase.id) : '<span class="muted">No case opened</span>']
      ], true);
    }

    body += '<h3 class="section-title">Audit trail</h3><ol class="timeline">' + t.history.map(function (h) {
      return '<li><div class="tl-event">' + esc(h.event) + '</div><div class="tl-detail">' + esc(h.detail) + '</div>' +
        '<div class="tl-time">' + fmtDate(h.date) + '</div></li>';
    }).join('') + '</ol>';

    $('#drawer-sub').innerHTML = StatusBadge(t.status);
    $('#drawer-body').innerHTML = body;
    if (relatedCase) {
      $('#drawer-actions').innerHTML = '<a class="btn btn-primary" href="' + pageHref('investigation.html?case=' + esc(relatedCase.id)) + '">Open investigation</a>';
      $('#drawer-actions').hidden = false;
    }
  }

  loadThen(mount, async function () {
    var data = await FMS.transactions({ limit: 200 });
    var statuses = Array.from(new Set(['Completed', 'Suspicious'].concat(data.items.map(function (t) { return t.status; }))));

    DataTable(mount, {
      columns: [
        { label: 'Transaction ID', render: function (t) { return '<span class="id">' + esc(t.id) + '</span>'; } },
        {
          label: 'Amount', className: 'num',
          render: function (t) {
            return inr(t.amount) + (t.modified ? '<span class="was">' + inr(t.originalAmount) + '</span>' : '');
          }
        },
        { label: 'Status', render: function (t) { return StatusBadge(t.status); } },
        { label: 'Modified By', render: function (t) { return t.modifiedBy ? esc(t.modifiedBy) : '<span class="muted">—</span>'; } },
        { label: 'Date', render: function (t) { return fmtDate(t.date); } }
      ],
      rows: data.items,
      searchKeys: ['id', 'modifiedBy'],
      searchPlaceholder: 'Search transactions…',
      filters: [{ key: 'status', label: 'All statuses', options: statuses, value: param('status') }],
      onRowClick: function (t) { openTransaction(t.id); },
      emptyText: 'No transactions match your filters.'
    });

    if (data.total > data.items.length) {
      mount.insertAdjacentHTML('beforeend', '<div class="empty">Showing the latest ' + data.items.length + ' of ' + data.total + ' transactions.</div>');
    }

    var id = param('id');
    if (id) openTransaction(id);
  });
})();
