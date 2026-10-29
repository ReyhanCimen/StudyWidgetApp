// --- DOM
const windowEl = document.querySelector('.window');
const btnStart = document.getElementById('btnStart');
const btnClose = document.getElementById('btnClose');
const clockEl = document.getElementById('clock');
const animEl = document.getElementById('animation');
const btnStartImg = btnStart.querySelector('img');
const btnData = document.getElementById('btnData');
const subjectPicker = document.getElementById('subjectPicker');
const subjectBtn = document.getElementById('subjectBtn');
const subjectMenu = document.getElementById('subjectMenu');
const subjectList = document.getElementById('subjectList');
const subjectInput = document.getElementById('subjectInput');

// --- Durum
let running = false;
let sessionMs = 0;   // time on the clock that is already saved
let lastMark = 0;    // when the not-yet-saved running time started
let tickTimer = null;
let animTimer = null;
let currentSubject = Store.getCurrentSubject();
const frames = [
  'assets/frames/frame1.png',
  'assets/frames/frame2.png',
  'assets/frames/frame3.png'
];
let frameIdx = 0;

// --- Yardımcılar
const two = Store.two;

function formatHMS(ms) {
  const s = Math.floor(ms / 1000);
  const hh = Math.floor(s / 3600);
  const mm = Math.floor((s % 3600) / 60);
  const ss = s % 60;
  return `${two(hh)}:${two(mm)}:${two(ss)}`;
}

function updateClock(ms) {
  clockEl.textContent = formatHMS(ms);
}

const currentMs = () => sessionMs + (running ? Date.now() - lastMark : 0);

// Save the running time so far to today (and to the current subject).
// Saving as we go means time isn't lost on a crash, and studying past
// midnight lands on the right day.
function commit() {
  if (!running) return;
  const now = Date.now();
  Store.addTime(now - lastMark, currentSubject);
  sessionMs += now - lastMark;
  lastMark = now;
}

// --- Animasyon
function startAnim() {
  stopAnim();
  animTimer = setInterval(() => {
    frameIdx = (frameIdx + 1) % frames.length;
    animEl.src = frames[frameIdx];
  }, 250);
}
function stopAnim() {
  if (animTimer) { clearInterval(animTimer); animTimer = null; }
  frameIdx = 0;
  animEl.src = frames[0];
}

// --- Kronometre
function start(since = Date.now()) {
  running = true;
  lastMark = since;
  btnStart.classList.add('stop');
  btnStartImg.src = 'assets/Pause.png';
  startAnim();

  tickTimer = setInterval(() => {
    if (Date.now() - lastMark >= 5000) commit();
    updateClock(currentMs());
  }, 200);
  updateClock(currentMs());
}

function stop() {
  commit();
  running = false;
  if (tickTimer) { clearInterval(tickTimer); tickTimer = null; }
  btnStart.classList.remove('stop');
  btnStartImg.src = 'assets/Start.png';
  stopAnim();
  updateClock(sessionMs);
}

// --- Subjects
function renderSubjectBtn() {
  subjectBtn.textContent = currentSubject ? `${currentSubject} ▾` : '+ subject';
}

function selectSubject(name) {
  if (name === currentSubject) return;
  commit();          // time so far belongs to the previous subject
  currentSubject = name;
  Store.setCurrentSubject(name);
  sessionMs = 0;     // clock starts fresh for the new subject
  updateClock(currentMs());
  renderSubjectBtn();
}

function renderSubjectList() {
  subjectList.innerHTML = '';
  for (const s of Store.getSubjects()) {
    const row = document.createElement('div');
    row.className = 'subject-row' + (s.name === currentSubject ? ' active' : '');

    const dot = document.createElement('span');
    dot.className = 'dot';
    dot.style.background = Store.styleFor(s.name).color;

    const name = document.createElement('span');
    name.className = 'name';
    name.textContent = s.name;

    const del = document.createElement('span');
    del.className = 'del';
    del.textContent = '×';
    del.title = 'Remove from list (study time is kept)';
    del.addEventListener('click', (e) => {
      e.stopPropagation();
      if (s.name === currentSubject) selectSubject('');
      Store.removeSubject(s.name);
      renderSubjectList();
    });

    row.append(dot, name, del);
    row.addEventListener('click', () => {
      selectSubject(s.name);
      closeMenu();
    });
    subjectList.appendChild(row);
  }
}

function openMenu() {
  renderSubjectList();
  subjectInput.value = '';
  subjectMenu.classList.remove('hidden');
  windowEl.classList.add('menu-open');
  subjectInput.focus();
}

function closeMenu() {
  subjectMenu.classList.add('hidden');
  windowEl.classList.remove('menu-open');
}

subjectBtn.addEventListener('click', () => {
  if (subjectMenu.classList.contains('hidden')) openMenu();
  else closeMenu();
});

subjectInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    const name = subjectInput.value.trim();
    if (!name) return;
    selectSubject(Store.addSubject(name).name);
    closeMenu();
  } else if (e.key === 'Escape') {
    closeMenu();
  }
});

document.addEventListener('mousedown', (e) => {
  if (!subjectPicker.contains(e.target)) closeMenu();
});
window.addEventListener('blur', closeMenu);

// --- Going to the data page and back keeps the timer as it was.
// sessionStorage lives as long as the window, so closing the app still resets the clock.
function restoreSession() {
  localStorage.removeItem('currentElapsed'); // old key, no longer used
  let saved = null;
  try { saved = JSON.parse(sessionStorage.getItem('session')); } catch {}

  sessionMs = saved?.ms || 0;
  if (saved?.running) start(saved.at); // time spent on the data page counts too
  else updateClock(sessionMs);
}

window.addEventListener('beforeunload', () => {
  commit();
  sessionStorage.setItem('session', JSON.stringify({ ms: sessionMs, running, at: Date.now() }));
});

// --- Event listeners
btnStart.addEventListener('click', () => {
  if (!running) start();
  else stop();
});

btnClose.addEventListener('click', () => {
  if (window.api?.close) window.api.close();
});

btnData.addEventListener('click', () => {
  if (window.api?.navigate) {
    window.api.navigate('data');
  }
});

// ilk yükleme
renderSubjectBtn();
restoreSession();
