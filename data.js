const monthTitle = document.getElementById('monthTitle');
const calendar = document.getElementById('calendar');
const btnPrev = document.getElementById('prevMonth');
const btnNext = document.getElementById('nextMonth');
const btnHome = document.getElementById('btnHome');

let current = new Date();

function two(n) {
  return String(n).padStart(2, '0');
}

function formatHM(ms) {
  const s = Math.floor(ms / 1000);
  const hh = Math.floor(s / 3600);
  const mm = Math.floor((s % 3600) / 60);
  return `${two(hh)}:${two(mm)}`;
}


// "chem 02:10 · math 01:05" — biggest first; time without a subject goes last.
function dayBreakdown(dateKey, total) {
  const day = Store.getSubjectTotals()[dateKey] || {};
  const parts = Object.entries(day).sort((a, b) => b[1] - a[1]);
  const rest = total - parts.reduce((sum, [, ms]) => sum + ms, 0);
  if (rest >= 60000 || parts.length === 0) parts.push(['no subject', rest]);
  return parts.map(([name, ms]) => `${name} ${formatHM(ms)}`).join(' · ');
}

function renderCalendar() {
  calendar.innerHTML = '';
  Tip.hide();

  const year = current.getFullYear();
  const month = current.getMonth();

  const firstDay = new Date(year, month, 1);
  let startDay = firstDay.getDay(); // 0 = Sunday

  // Hafta Pzt ile başlasın:
  startDay = (startDay + 6) % 7;

  const lastDate = new Date(year, month + 1, 0).getDate();

  monthTitle.textContent = `${year} ${current.toLocaleString('en-US', { month: 'long' })}`;

  const totals = JSON.parse(localStorage.getItem('studyTotals') || '{}');

  // Boş hücreler
  for (let i = 0; i < startDay; i++) {
    const cell = document.createElement('div');
    cell.className = 'day empty';
    calendar.appendChild(cell);
  }

  // Günleri çiz
  for (let d = 1; d <= lastDate; d++) {
    const dateKey = `${year}-${two(month + 1)}-${two(d)}`;
    const cell = document.createElement('div');
    cell.className = 'day';

    const num = document.createElement('div');
    num.textContent = d;
    cell.appendChild(num);

    if (totals[dateKey]) {
      const time = document.createElement('div');
      time.className = 'time';
      time.textContent = formatHM(totals[dateKey]);
      cell.appendChild(time);

      cell.classList.add('studied');
      cell.addEventListener('mouseenter', () => Tip.show(cell, dayBreakdown(dateKey, totals[dateKey])));
      cell.addEventListener('mouseleave', Tip.hide);
    }

    calendar.appendChild(cell);
  }
}

// 📅 Ay değiştir
btnPrev.addEventListener('click', () => {
  current = new Date(current.getFullYear(), current.getMonth() - 1, 1);
  renderCalendar();
});

btnNext.addEventListener('click', () => {
  current = new Date(current.getFullYear(), current.getMonth() + 1, 1);
  renderCalendar();
});

btnHome.addEventListener('click', () => {
  if (window.api?.navigate) {
    window.api.navigate('index');
  }
});

// Double-click the title to jump back to this month.
monthTitle.addEventListener('dblclick', () => {
  current = new Date();
  renderCalendar();
});

// Computer sleeps or locks while this page is open → pause the saved timer.
window.api?.onPause?.(Store.pauseSavedSession);
// Leaving this page (back to the widget, or closing the app): save the running time.
window.addEventListener('beforeunload', () => Store.flushSavedSession());

document.getElementById('btnStats').addEventListener('click', () => {
  window.api?.navigate?.('stats');
});

renderCalendar();

