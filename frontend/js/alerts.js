/* alerts.js – alert table and detail drawer (data strictly from GET /api/alerts) */

(function () {
  var mount = $('#table');
  var openToken = 0;

  async function openAlert(id) {
    var token = ++openToken;
    openDrawer({ title: id, body: Spinner() });

    var d;
    try {
      d = await FMS.alert(id);
    } catch (err) {
      if (token === openToken) {
        $('#drawer-body').innerHTML = '<p class="muted">' + esc(err.message) + '</p>';
      }
      return;
    }
    if (token !== openToken) return;

    var a = d.alert;
    $('#drawer-sub').innerHTML = SeverityBadge(a.severity) + StatusBadge(a.status);
    $('#drawer-body').innerHTML = '<p class="alert-desc" style="margin-bottom:16px;">' + esc(a.description) + '</p>' + details([
      ['Alert ID', esc(a.id)],
      ['Alert Type', esc(a.type)],
      ['Severity', SeverityBadge(a.severity)],
      ['Status', StatusBadge(a.status)],
      ['Created', fmtDate(a.date)],
      ['Transaction', txnLink(a.relatedTxn) + ' · ' + inr(d.txn ? d.txn.amount : 0)]
    ], true);
  }

  loadThen(mount, async function () {
    var data = await FMS.alerts({ limit: 200 });

    DataTable(mount, {
      columns: [
        { label: 'Alert ID', render: function (a) { return '<span class="id">' + esc(a.id) + '</span>'; } },
        { label: 'Alert Type', render: function (a) { return esc(a.type); } },
        { label: 'Severity', render: function (a) { return SeverityBadge(a.severity); } },
        { label: 'Status', render: function (a) { return StatusBadge(a.status); } },
        { label: 'Created Date', render: function (a) { return fmtDate(a.date); } }
      ],
      rows: data.items,
      searchKeys: ['id', 'type', 'relatedTxn'],
      searchPlaceholder: 'Search alerts…',
      filters: [
        { key: 'severity', label: 'All severities', options: ['Critical', 'High', 'Medium', 'Low'], value: param('severity') },
        { key: 'status', label: 'All statuses', options: ['Open', 'Investigating', 'Closed'], value: param('status') }
      ],
      onRowClick: function (a) { openAlert(a.id); },
      emptyText: 'No alerts match your filters.'
    });

    if (data.total > data.items.length) {
      mount.insertAdjacentHTML('beforeend', '<div class="empty">Showing the latest ' + data.items.length + ' of ' + data.total + ' alerts.</div>');
    }

    var id = param('id');
    if (id) openAlert(id);
  });
})();
