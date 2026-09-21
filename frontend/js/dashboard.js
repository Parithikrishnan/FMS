/* dashboard.js – KPI cards, recent widgets and charts (all from the backend) */

(function () {
  var kpis = $('#kpis');
  var alertsEl = $('#recent-alerts');
  var txnsEl = $('#recent-transactions');
  var weekEl = $('#chart-week');
  var severityEl = $('#chart-severity');

  loadThen([kpis, alertsEl, txnsEl, weekEl, severityEl], async function () {
    var results = await Promise.all([
      FMS.dashboard(),
      FMS.alerts({ limit: 200 }),
      FMS.transactions({ limit: 200 }),
      FMS.cases({ limit: 200 })
    ]);
    var stats = results[0], alerts = results[1].items, txns = results[2].items, cases = results[3].items;

    renderKpis(stats, cases);
    renderRecentAlerts(alerts);
    renderRecentTransactions(txns);
    renderWeekChart(txns);
    renderSeverityChart(alerts);
  });

  function renderKpis(stats, cases) {
    var investigating = cases.filter(function (c) { return c.status === 'Investigating'; }).length;

    kpis.innerHTML = [
      KpiCard({ label: 'Critical Alerts', value: stats.criticalAlerts, hint: stats.criticalAlerts ? 'Needs immediate review' : 'All clear', icon: 'alerts', tone: 'critical', href: pageHref('alerts.html?severity=Critical') }),
      KpiCard({ label: 'Open Cases', value: stats.openCases, hint: investigating + ' under investigation', icon: 'cases', tone: 'blue', href: pageHref('cases.html') }),
      KpiCard({ label: 'Transactions Today', value: stats.transactionsToday, hint: 'Since midnight', icon: 'transactions', tone: 'gold', href: pageHref('transactions.html') }),
      KpiCard({ label: 'Suspicious Transactions', value: stats.suspiciousTransactions, hint: 'Flagged by fraud rules', icon: 'investigation', href: pageHref('transactions.html?status=Suspicious') })
    ].join('');
  }

  function renderRecentAlerts(alerts) {
    if (!alerts.length) { alertsEl.innerHTML = '<div class="empty">No alerts yet.</div>'; return; }
    alertsEl.innerHTML = alerts.slice(0, 5).map(function (a) {
      return '<a class="list-item" href="' + pageHref('alerts.html?id=' + esc(a.id)) + '">' +
        '<div class="li-main"><span class="li-title">' + esc(a.id) + '</span><span class="li-sub">' + esc(a.type) + '</span></div>' +
        '<div class="li-side">' + SeverityBadge(a.severity) + '<span class="li-sub">' + fmtDate(a.date) + '</span></div></a>';
    }).join('');
  }

  function renderRecentTransactions(txns) {
    if (!txns.length) { txnsEl.innerHTML = '<div class="empty">No transactions yet.</div>'; return; }
    txnsEl.innerHTML = txns.slice(0, 5).map(function (t) {
      return '<a class="list-item" href="' + pageHref('transactions.html?id=' + esc(t.id)) + '">' +
        '<div class="li-main"><span class="li-title">' + esc(t.id) + '</span>' +
        '<span class="li-sub">' + (t.modified ? 'Modified by ' + esc(t.modifiedBy) + ' · ' : '') + fmtTime(t.date) + '</span></div>' +
        '<div class="li-side"><span class="li-amount">' + inr(t.amount) + '</span>' + StatusBadge(t.status) + '</div></a>';
    }).join('');
  }

  // Bars: total transactions and suspicious ones for each of the last 7 days.
  function renderWeekChart(txns) {
    var days = [];
    for (var i = 6; i >= 0; i--) {
      var d = new Date();
      d.setDate(d.getDate() - i);
      var rows = txns.filter(function (t) { return t.date.toDateString() === d.toDateString(); });
      days.push({
        label: i === 0 ? 'Today' : d.toLocaleDateString('en-IN', { weekday: 'short' }),
        total: rows.length,
        suspicious: rows.filter(function (t) { return t.status === 'Suspicious'; }).length
      });
    }
    var max = Math.max.apply(null, days.map(function (d) { return d.total; }).concat(1));
    var bar = function (value, color, what) {
      if (!value) return '';
      return '<div class="bar-col"><span class="bar-val">' + value + '</span>' +
        '<div class="bar" style="height:' + (value / max * 82) + '%;background:var(' + color + ')" title="' + value + ' ' + what + '"></div></div>';
    };

    weekEl.innerHTML = '<div class="bars" role="img" aria-label="Bar chart of transactions per day for the last 7 days">' +
      days.map(function (d) {
        return '<div class="bar-group"><div class="bar-pair">' +
          bar(d.total, '--chart-2', 'transactions') + bar(d.suspicious, '--chart-1', 'suspicious') +
          '</div><span class="bar-label">' + d.label + '</span></div>';
      }).join('') + '</div>';
  }

  function renderSeverityChart(alerts) {
    var levels = [
      { name: 'Critical', color: '--chart-4' },
      { name: 'High', color: '--chart-1' },
      { name: 'Medium', color: '--chart-3' },
      { name: 'Low', color: '--chart-2' }
    ];
    var counts = levels.map(function (l) {
      return alerts.filter(function (a) { return a.severity === l.name; }).length;
    });
    var max = Math.max.apply(null, counts.concat(1));

    severityEl.innerHTML = levels.map(function (l, i) {
      return '<div class="hbar"><span>' + l.name + '</span>' +
        '<div class="hbar-track"><div class="hbar-fill" style="width:' + (counts[i] / max * 100) + '%;background:var(' + l.color + ')"></div></div>' +
        '<span class="hbar-count">' + counts[i] + '</span></div>';
    }).join('');
  }
})();
