/* settings.js – theme, notification preferences (browser only) and the demo event simulator */

(function () {
  var SETTINGS_KEY = 'fms_settings';
  var LEVELS = ['Critical', 'High', 'Medium', 'Low'];

  function loadSettings() {
    try { return JSON.parse(localStorage.getItem(SETTINGS_KEY)) || {}; } catch (e) { return {}; }
  }

  /* ---- Theme radios (kept in sync with the header toggle) ---- */
  var radios = document.querySelectorAll('input[name="theme"]');
  function syncRadios() {
    radios.forEach(function (r) { r.checked = r.value === getTheme(); });
  }
  radios.forEach(function (r) { r.addEventListener('change', function () { setTheme(r.value); }); });
  document.addEventListener('themechange', syncRadios);
  syncRadios();

  /* ---- Notification toggles (saved in this browser only, not acted on) ---- */
  var settings = loadSettings();
  var list = $('#notify-list');
  list.innerHTML = LEVELS.map(function (level) {
    var on = settings[level] !== undefined ? settings[level] : level === 'Critical' || level === 'High';
    return '<div class="setting-row"><div>' + SeverityBadge(level) +
      '<span class="li-sub">Notify me about ' + level.toLowerCase() + ' alerts</span></div>' +
      '<input type="checkbox" data-level="' + level + '"' + (on ? ' checked' : '') + ' aria-label="Notify for ' + level + ' alerts"></div>';
  }).join('');

  var savedMsg = $('#saved-msg');
  var savedTimer;
  list.addEventListener('change', function (e) {
    var box = e.target.closest('input[data-level]');
    if (!box) return;
    settings[box.dataset.level] = box.checked;
    try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)); } catch (err) {}
    savedMsg.hidden = false;
    clearTimeout(savedTimer);
    savedTimer = setTimeout(function () { savedMsg.hidden = true; }, 1500);
  });

  /* ---- Demo: simulate the banking application reporting a modified amount ----
     POST /api/events -> backend rule check -> alert -> case */
  var form = $('#event-form');
  var resultEl = $('#event-result');
  var txnSelect = form.elements.transaction_id;
  var txns = [];

  FMS.transactions({ limit: 200 }).then(function (d) {
    txns = d.items;
    txnSelect.innerHTML = txns.map(function (t) {
      return '<option value="' + esc(t.id) + '">' + esc(t.id) + ' · ' + inr(t.amount) + '</option>';
    }).join('');
    form.elements.new_amount.value = txns.length ? txns[0].amount * 2 : '';
  }, function (err) {
    txnSelect.innerHTML = '<option value="">Backend unavailable</option>';
    showResult(err.message, true);
  });

  txnSelect.addEventListener('change', function () {
    var t = txns.find(function (x) { return x.id === txnSelect.value; });
    if (t) form.elements.new_amount.value = t.amount * 2;
  });

  form.addEventListener('submit', async function (e) {
    e.preventDefault();
    var f = form.elements;
    var t = txns.find(function (x) { return x.id === f.transaction_id.value; });
    if (!t) return showResult('Choose a transaction first.', true);

    var btn = $('#event-send');
    btn.disabled = true;
    try {
      var r = await FMS.sendEvent({
        transaction_id: t.id,
        old_amount: t.amount,
        new_amount: Number(f.new_amount.value),
        modified_by: f.modified_by.value.trim(),
        source_ip: f.source_ip.value.trim()
      });
      if (r.alert) {
        showResult('Alert ' + alertLink(r.alert.id) + ' raised and case ' + caseLink(r.case.id) + ' opened for ' +
          esc(r.txn.id) + ' (' + inr(t.amount) + ' → ' + inr(r.txn.amount) + ').', false, true);
        t.amount = r.txn.amount;
        txnSelect.options[txnSelect.selectedIndex].textContent = t.id + ' · ' + inr(t.amount);
      } else {
        showResult(r.message, false);
      }
    } catch (err) {
      showResult(err.message, true);
    }
    btn.disabled = false;
  });

  function showResult(message, isError, isHtml) {
    resultEl.className = isError ? 'form-error' : 'banner';
    resultEl.innerHTML = isHtml ? message : esc(message);
    resultEl.hidden = false;
  }
})();
