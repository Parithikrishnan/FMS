/* cases.js – case table and detail drawer (data from GET /api/cases) */

(function () {
  var mount = $('#table');
  var openToken = 0;

  async function openCase(id) {
    var token = ++openToken;
    openDrawer({ title: id, body: Spinner() });

    var d;
    try { d = await FMS.caseDetail(id); }
    catch (err) { if (token === openToken) $('#drawer-body').innerHTML = '<p class="muted">' + esc(err.message) + '</p>'; return; }
    if (token !== openToken) return;

    var c = d.case;
    $('#drawer-sub').innerHTML = StatusBadge(c.status);
    $('#drawer-body').innerHTML = '<p class="alert-desc">' + esc(d.alert.description) + '</p>' + details([
      ['Case ID', esc(c.id)],
      ['Status', StatusBadge(c.status)],
      ['Alert', alertLink(c.alertId) + ' · ' + SeverityBadge(d.alert.severity)],
      ['Transaction', txnLink(c.txnId)],
      ['Assigned To', esc(c.assignedTo)],
      ['Created', fmtDate(c.date)],
      ['Findings', d.findings.length + ' recorded']
    ], true);

    $('#drawer-actions').hidden = false;
    $('#drawer-actions').innerHTML =
      '<a class="btn btn-primary" href="' + pageHref('investigation.html?case=' + esc(c.id)) + '">Open investigation ' + icon('arrow', 16) + '</a>' +
      '<a class="btn btn-ghost" href="' + pageHref('alerts.html?id=' + esc(c.alertId)) + '">View alert</a>';
  }

  loadThen(mount, async function () {
    var data = await FMS.cases({ limit: 200 });
    var statuses = Array.from(new Set(['Open', 'Investigating', 'Closed'].concat(data.items.map(function (c) { return c.status; }))));

    DataTable(mount, {
      columns: [
        { label: 'Case ID', render: function (c) { return '<span class="id">' + esc(c.id) + '</span>'; } },
        { label: 'Alert ID', render: function (c) { return esc(c.alertId); } },
        { label: 'Status', render: function (c) { return StatusBadge(c.status); } },
        { label: 'Assigned To', render: function (c) { return esc(c.assignedTo); } },
        { label: 'Created Date', render: function (c) { return fmtDate(c.date); } }
      ],
      rows: data.items,
      searchKeys: ['id', 'alertId', 'txnId', 'assignedTo'],
      searchPlaceholder: 'Search cases…',
      filters: [{ key: 'status', label: 'All statuses', options: statuses, value: param('status') }],
      onRowClick: function (c) { openCase(c.id); },
      emptyText: 'No cases match your filters.'
    });

    if (data.total > data.items.length) {
      mount.insertAdjacentHTML('beforeend', '<div class="empty">Showing the latest ' + data.items.length + ' of ' + data.total + ' cases.</div>');
    }

    var id = param('id');
    if (id) openCase(id);
  });
})();
