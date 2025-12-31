// --- DOM
const btnStart = document.getElementById('btnStart');
const btnClose = document.getElementById('btnClose');
const clockEl = document.getElementById('clock');
const animEl = document.getElementById('animation');
const btnStartImg = btnStart.querySelector('img'); 
const btnData = document.getElementById('btnData');

// --- Durum
let running = false;
let startTimeMs = 0;
let tickTimer = null;
let animTimer = null;
let elapsedBeforePause = 0;
const frames = [
  'assets/frames/frame1.png',
  'assets/frames/frame2.png',
  'assets/frames/frame3.png'
];
let frameIdx = 0;

// --- Yardımcılar
const two = (n) => String(n).padStart(2, '0');

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
function start() {
  running = true;
  startTimeMs = Date.now();
  btnStart.classList.add('stop');
  btnStartImg.src = 'assets/Pause.png';
  startAnim();

  tickTimer = setInterval(() => {
    const now = Date.now();
    const elapsed = elapsedBeforePause + (now - startTimeMs);
    updateClock(elapsed);
    localStorage.setItem('currentElapsed', elapsed); // 🔹 kaydet
  }, 100);
}

function stop() {
  running = false;
  const now = Date.now();
  elapsedBeforePause += now - startTimeMs;
  if (tickTimer) { clearInterval(tickTimer); tickTimer = null; }
  btnStart.classList.remove('stop');
  btnStartImg.src = 'assets/Start.png';
  stopAnim();
  localStorage.setItem('currentElapsed', elapsedBeforePause); // 🔹 kaydet
}

// --- Sayfa yüklendiğinde kaldığı yerden devam
window.addEventListener('DOMContentLoaded', () => {
  const savedElapsed = localStorage.getItem('currentElapsed');
  if (savedElapsed) {
    elapsedBeforePause = parseInt(savedElapsed);
    updateClock(elapsedBeforePause);
  } else {
    updateClock(0);
  }
});

// --- Uygulama kapanırken bugünün toplam süresini kaydet
window.addEventListener('beforeunload', () => {
  const totals = JSON.parse(localStorage.getItem('studyTotals') || '{}');
  const d = new Date();
  const key = `${d.getFullYear()}-${two(d.getMonth() + 1)}-${two(d.getDate())}`;
  totals[key] = (totals[key] || 0) + elapsedBeforePause;
  localStorage.setItem('studyTotals', JSON.stringify(totals));

  // 🔹 Uygulama kapatıldığında geçici süreyi temizle
  localStorage.removeItem('currentElapsed');
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
updateClock(0);

