const monthTitle = document.getElementById('monthTitle');
const chart = document.getElementById('chart');
const legend = document.getElementById('legend');
const viewButtons = document.querySelectorAll('.view-toggle button');

const SVG_NS = 'http://www.w3.org/2000/svg';
const W = 300, H = 220;
const PAD = { left: 28, right: 8, top: 8, bottom: 18 };
const HOUR = 3600 * 1000;
const Y_MAX = 18;  // hours; the scale is always 0–18 so weeks are easy to compare
const Y_STEP = 3;
const WEEKDAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

let view = 'week';
try { view = localStorage.getItem('graphView') === 'month' ? 'month' : 'week'; } catch {}
let anchor = new Date(); // any day inside the shown week / month
const two = Store.two;

function formatHM(ms) {
  const m = Math.floor(ms / 60000);
  return `${two(Math.floor(m / 60))}:${two(m % 60)}`;
}

const shortDate = (d) => `${d.toLocaleString('en-US', { month: 'short' })} ${d.getDate()}`;

function svg(tag, attrs, parent = chart) {
  const el = document.createElementNS(SVG_NS, tag);
  for (const k in attrs) el.setAttribute(k, attrs[k]);
  parent.appendChild(el);
  return el;
}

// The days shown: Monday–Sunday of the anchor's week, or every day of its month.
function periodDays() {
  const y = anchor.getFullYear(), m = anchor.getMonth(), d = anchor.getDate();
  if (view === 'week') {
    const monday = d - ((anchor.getDay() + 6) % 7);
    return Array.from({ length: 7 }, (_, i) => new Date(y, m, monday + i));
  }
  const count = new Date(y, m + 1, 0).getDate();
  return Array.from({ length: count }, (_, i) => new Date(y, m, i + 1));
}

// One series per subject: study ms for each shown day.
function buildSeries(dates) {
  const totals = Store.getTotals();
  const bySubject = Store.getSubjectTotals();
  const series = new Map();
  const other = new Array(dates.length).fill(0);

  dates.forEach((date, i) => {
    const key = Store.dayKey(date);
    const day = bySubject[key] || {};
    let tagged = 0;
    for (const name in day) {
      if (!series.has(name)) series.set(name, new Array(dates.length).fill(0));
      series.get(name)[i] = day[name];
      tagged += day[name];
    }
    // Time studied without a subject (or before subjects existed).
    const rest = (totals[key] || 0) - tagged;
    if (rest >= 60000) other[i] = rest;
  });

  const list = [...series.entries()].map(([name, values], i) => ({
    name,
    values,
    ...Store.styleFor(name, i)
  }));
  list.push({ name: 'no subject', values: other, color: '#aaa', dash: '2 3' });

  return list
    .map((s) => ({ ...s, total: s.values.reduce((a, b) => a + b, 0) }))
    .filter((s) => s.total > 0)
    .sort((a, b) => b.total - a.total);
}

function render() {
  viewButtons.forEach((b) => b.classList.toggle('active', b.dataset.view === view));

  const dates = periodDays();
  const n = dates.length;
  monthTitle.textContent = view === 'week'
    ? `${shortDate(dates[0])} – ${shortDate(dates[n - 1])}`
    : `${anchor.getFullYear()} ${anchor.toLocaleString('en-US', { month: 'long' })}`;

  // Don't draw lines into days that haven't happened yet.
  const now = new Date();
  const shown = dates.filter((d) => d <= now).length;

  const series = buildSeries(dates);

  const x = (i) => PAD.left + (i / (n - 1)) * (W - PAD.left - PAD.right);
  const y = (ms) => H - PAD.bottom - (Math.min(ms / HOUR, Y_MAX) / Y_MAX) * (H - PAD.top - PAD.bottom);

  chart.innerHTML = '';
  Tip.hide();

  // Grid + y labels: 0, 3h, 6h ... 18h
  for (let h = 0; h <= Y_MAX; h += Y_STEP) {
    const yy = y(h * HOUR);
    if (h > 0) svg('line', { class: 'grid', x1: PAD.left, x2: W - PAD.right, y1: yy, y2: yy });
    svg('text', { x: PAD.left - 5, y: yy + 3, 'text-anchor': 'end' }).textContent = h === 0 ? '0' : `${h}h`;
  }

  // Axes
  svg('line', { class: 'axis', x1: PAD.left, x2: PAD.left, y1: PAD.top, y2: H - PAD.bottom });
  svg('line', { class: 'axis', x1: PAD.left, x2: W - PAD.right, y1: H - PAD.bottom, y2: H - PAD.bottom });

  // x labels: weekday letters for a week, a few day numbers for a month
  const xLabels = view === 'week'
    ? WEEKDAYS.map((label, i) => [i, label])
    : [...new Set([1, 5, 10, 15, 20, 25, n])].map((d) => [d - 1, d]);
  for (const [i, label] of xLabels) {
    svg('text', { x: x(i), y: H - 4, 'text-anchor': 'middle' }).textContent = label;
  }

  if (series.length === 0) {
    svg('text', { x: (PAD.left + W) / 2, y: H / 2, 'text-anchor': 'middle' }).textContent = 'no study time yet';
  }

  // Lines (biggest subject drawn last so it stays on top)
  for (const s of [...series].reverse()) {
    if (shown < 1) break;
    const points = [];
    for (let i = 0; i < shown; i++) points.push(`${x(i)},${y(s.values[i])}`);
    const line = svg('polyline', { class: 'line', points: points.join(' '), stroke: s.color });
    if (s.dash) line.setAttribute('stroke-dasharray', s.dash);

    for (let i = 0; i < shown; i++) {
      const ms = s.values[i];
      if (!ms) continue;
      const dot = svg('circle', { class: 'dot', cx: x(i), cy: y(ms), r: 2.5, fill: s.color });
      // Bigger invisible circle so the point is easy to hover.
      const hit = svg('circle', { class: 'hit', cx: x(i), cy: y(ms), r: 8 });
      hit.addEventListener('mouseenter', () => {
        dot.setAttribute('r', 4);
        Tip.show(dot, `${s.name} · ${formatHM(ms)}`);
      });
      hit.addEventListener('mouseleave', () => {
        dot.setAttribute('r', 2.5);
        Tip.hide();
      });
    }
  }

  // Legend
  legend.innerHTML = '';
  for (const s of series) {
    const row = document.createElement('div');
    row.className = 'legend-row';

    const swatch = document.createElementNS(SVG_NS, 'svg');
    swatch.setAttribute('class', 'swatch');
    swatch.setAttribute('viewBox', '0 0 18 6');
    const sample = svg('line', { x1: 1, x2: 17, y1: 3, y2: 3, stroke: s.color, 'stroke-width': 2, 'stroke-linecap': 'round' }, swatch);
    if (s.dash) sample.setAttribute('stroke-dasharray', s.dash);

    const name = document.createElement('span');
    name.textContent = s.name;

    const total = document.createElement('span');
    total.className = 'total';
    total.textContent = formatHM(s.total);

    row.append(swatch, name, total);
    legend.appendChild(row);
  }
}

function move(step) {
  const y = anchor.getFullYear(), m = anchor.getMonth(), d = anchor.getDate();
  anchor = view === 'week' ? new Date(y, m, d + 7 * step) : new Date(y, m + step, 1);
  render();
}

// Double-click the title to jump back to this week / month.
monthTitle.addEventListener('dblclick', () => {
  anchor = new Date();
  render();
});

document.getElementById('prevMonth').addEventListener('click', () => move(-1));
document.getElementById('nextMonth').addEventListener('click', () => move(1));

viewButtons.forEach((b) => b.addEventListener('click', () => {
  if (b.dataset.view === view) return;
  view = b.dataset.view;
  try { localStorage.setItem('graphView', view); } catch {}
  // Going back to week view while looking at this month: show this week.
  const now = new Date();
  if (anchor.getFullYear() === now.getFullYear() && anchor.getMonth() === now.getMonth()) anchor = now;
  render();
}));

// Computer sleeps or locks while this page is open → pause the saved timer.
window.api?.onPause?.(Store.pauseSavedSession);
// Leaving this page (back to the widget, or closing the app): save the running time.
window.addEventListener('beforeunload', () => Store.flushSavedSession());

document.getElementById('btnBack').addEventListener('click', () => {
  window.api?.navigate?.('data');
});

render();
