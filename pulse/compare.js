(function (root) {
  'use strict';
  // Pure date/window helpers exported for deterministic tests. Calendar days use
  // America/New_York; date arithmetic uses UTC noon to avoid DST-hour drift.
  const metrics = [
    { key: 'resting_heart_rate', label: 'Resting HR', unit: 'bpm' },
    { key: 'heart_rate', label: 'Average HR', unit: 'bpm' },
    { key: 'hrv_sdnn', label: 'HRV · SDNN', unit: 'ms' },
    { key: 'blood_oxygen_saturation', label: 'Blood oxygen', unit: '%' }
  ];
  const kinds = { trt: 'TRT', medication: 'Medication', nicotine: 'Nicotine', caffeine: 'Caffeine' };
  function validDay(s) { return typeof s === 'string' && /^\d{4}-\d\d-\d\d$/.test(s); }
  function shiftDay(s, n) {
    if (!validDay(s) || !Number.isInteger(n)) return null;
    const d = new Date(s + 'T12:00:00Z');
    if (Number.isNaN(d.getTime())) return null;
    d.setUTCDate(d.getUTCDate() + n);
    return d.toISOString().slice(0, 10);
  }
  function eastDay(value) {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return null;
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/New_York', year: 'numeric', month: '2-digit', day: '2-digit'
    }).formatToParts(d);
    const a = {};
    for (const p of parts) a[p.type] = p.value;
    return a.year + '-' + a.month + '-' + a.day;
  }
  function bounds(mode, span, today, eventDate) {
    if (![7, 14, 30].includes(span) || !validDay(today)) return null;
    if (mode === 'change') {
      if (!validDay(eventDate) || eventDate > today) return null;
      return {
        beforeStart: shiftDay(eventDate, -span), beforeEnd: shiftDay(eventDate, -1),
        afterStart: shiftDay(eventDate, 1), afterEnd: shiftDay(eventDate, span),
        actualAfterEnd: [shiftDay(today, -1), shiftDay(eventDate, span)].sort()[0],
        label: eventDate
      };
    }
    return {
      beforeStart: shiftDay(today, -(2 * span)), beforeEnd: shiftDay(today, -span - 1),
      afterStart: shiftDay(today, -span), afterEnd: shiftDay(today, -1),
      actualAfterEnd: shiftDay(today, -1), label: null
    };
  }
  function average(daily, metric, start, end) {
    if (!Array.isArray(daily) || !validDay(start) || !validDay(end) || start > end) return { mean: null, days: 0 };
    let sum = 0, days = 0;
    for (const row of daily) {
      if (row.day < start || row.day > end) continue;
      const val = row[metric];
      if (val === null || val === undefined || val === '') continue;
      const n = Number(val);
      if (!Number.isFinite(n)) continue;
      sum += n; days++;
    }
    return { mean: days ? sum / days : null, days };
  }
  function compare(daily, metric, range, span) {
    const before = average(daily, metric, range.beforeStart, range.beforeEnd);
    const after = average(daily, metric, range.afterStart, range.actualAfterEnd);
    const minDays = Math.max(3, Math.ceil(span * .6));
    const complete = range.actualAfterEnd >= range.afterEnd;
    const reliable = complete && before.days >= minDays && after.days >= minDays;
    return {
      before, after, minDays, complete, reliable,
      delta: reliable ? after.mean - before.mean : null
    };
  }
  function eventLabel(e) {
    const d = e.data || {};
    let label = kinds[e.kind] || e.kind;
    if (e.kind === 'trt') label += ' · ' + d.dose_mg + ' mg / ' + d.interval_days + 'd';
    if (e.kind === 'medication') label += ' · ' + (d.name || 'Unnamed');
    if (e.kind === 'nicotine' || e.kind === 'caffeine') label += ' · ' + (d.level || 'Unknown');
    return (eastDay(e.effective_at) || 'Unknown date') + ' · ' + label;
  }
  function create(tag, cls, txt) {
    const node = document.createElement(tag);
    if (cls) node.className = cls;
    if (txt !== undefined) node.textContent = txt;
    return node;
  }
  function shortDate(s) {
    if (!validDay(s)) return '—';
    const [y, m, d] = s.split('-');
    return Number(m) + '/' + Number(d) + '/' + y;
  }
  function render(state) {
    if (!root.document || !state || !Array.isArray(state.daily) || !Array.isArray(state.events)) return;
    const modeEl = document.getElementById('compare-mode');
    const spanEl = document.getElementById('compare-span');
    const eventsEl = document.getElementById('compare-event');
    const wrap = document.getElementById('compare-event-wrap');
    const result = document.getElementById('compare-results');
    const period = document.getElementById('compare-period');
    const note = document.getElementById('compare-note');
    if (!modeEl || !spanEl || !eventsEl || !wrap || !result || !period || !note) return;

    const today = eastDay(new Date());
    const events = state.events
      .filter(e => kinds[e.kind] && eastDay(e.effective_at) && new Date(e.effective_at) <= new Date())
      .sort((a, b) => new Date(b.effective_at) - new Date(a.effective_at));
    const oldEvent = eventsEl.value;
    eventsEl.replaceChildren();
    if (events.length) {
      for (const e of events) {
        const o = document.createElement('option');
        o.value = e.id;
        o.textContent = eventLabel(e);
        eventsEl.append(o);
      }
      if (events.some(e => e.id === oldEvent)) eventsEl.value = oldEvent;
    }
    // No baseline event recorded yet: the recent comparison still works without manual input.
    const changeMode = modeEl.value === 'change';
    wrap.hidden = !changeMode;
    result.replaceChildren();
    if (changeMode && !events.length) {
      period.textContent = 'No change events recorded yet';
      result.append(create('p', 'hint', 'Log a TRT, medication, nicotine or caffeine change to compare the surrounding measurements. You do not need to log anything daily.'));
      note.textContent = 'The automatic recent-trend view works independently of your manual history.';
      return;
    }
    const selected = changeMode ? events.find(e => e.id === eventsEl.value) || events[0] : null;
    const span = Number(spanEl.value);
    const range = bounds(changeMode ? 'change' : 'recent', span, today, selected ? eastDay(selected.effective_at) : null);
    if (!range) {
      period.textContent = 'Comparison unavailable';
      note.textContent = 'The selected date or window is invalid.';
      return;
    }
    period.textContent = (changeMode ? 'Around ' + eventLabel(selected) + ' · ' : 'Automatic recent trend · ') +
      shortDate(range.beforeStart) + '–' + shortDate(range.beforeEnd) + ' vs ' +
      shortDate(range.afterStart) + '–' + shortDate(range.afterEnd);

    let valid = 0;
    for (const metric of metrics) {
      const stat = compare(state.daily, metric.key, range, span);
      if (stat.reliable) valid++;
      const row = create('div', 'compare-item');
      const title = create('div', 'compare-item-title');
      title.append(create('strong', null, metric.label));
      title.append(create('small', null, stat.before.days + '/' + span + ' days before · ' +
        stat.after.days + '/' + span + ' days after'));
      row.append(title);
      const cells = create('div', 'compare-values');
      const a = create('div', 'compare-value');
      a.append(create('small', null, 'BEFORE'));
      a.append(create('strong', null, stat.before.mean === null ? '—' : stat.before.mean.toFixed(1) + ' ' + metric.unit));
      const b = create('div', 'compare-value');
      b.append(create('small', null, 'AFTER'));
      b.append(create('strong', null, stat.after.mean === null ? '—' : stat.after.mean.toFixed(1) + ' ' + metric.unit));
      const c = create('div', 'compare-value compare-delta');
      c.append(create('small', null, 'CHANGE'));
      const delta = stat.delta;
      c.append(create('strong', null, !stat.reliable ? 'Not enough data' :
        (delta > 0 ? '+' : '') + delta.toFixed(1) + ' ' + metric.unit));
      cells.append(a, b, c);
      row.append(cells);
      result.append(row);
    }
    const overlap = state.events.filter(e => kinds[e.kind] && e.id !== selected?.id &&
      (eastDay(e.effective_at) || '') >= range.beforeStart &&
      (eastDay(e.effective_at) || '') <= range.afterEnd).length;
    const notes = [];
    if (range.actualAfterEnd < range.afterEnd) notes.push('After-window is still forming. Change values are withheld until ' + span + ' full post-change days have passed.');
    if (!valid) notes.push('There is not enough paired data yet for a reliable numeric comparison.');
    if (overlap) notes.push(overlap + ' other recorded change' + (overlap === 1 ? '' : 's') + ' overlap these dates.');
    notes.push('Each reported mean gives equal weight to days with data. At least 60% coverage (minimum 3 days) on both sides is required to show a difference.');
    notes.push('These are observational differences, not evidence that TRT, a medication, or a habit caused them.');
    note.textContent = notes.join(' ');
  }
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { shiftDay, eastDay, bounds, average, compare, eventLabel };
  }
  if (root && root.document) {
    root.PulseCompare = { render, shiftDay };
    const bind = () => {
      for (const id of ['compare-mode', 'compare-span', 'compare-event']) {
        const input = document.getElementById(id);
        if (input) input.addEventListener('change', () => { if (root.PulseState) render(root.PulseState); });
      }
    };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bind, { once: true });
    else bind();
  }
})(typeof window !== 'undefined' ? window : null);
