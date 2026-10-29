// Shared saved-data helpers used by every page.
//
// localStorage keys:
//   studyTotals    { "2026-10-29": ms }                  total per day (calendar uses this)
//   subjectTotals  { "2026-10-29": { "chem": ms, ... } } per subject per day (graph uses this)
//   subjects       [ { name } ]
//   currentSubject "chem"
(function () {
  // Pencil-like grey tones. Dash patterns keep subjects apart when the greys are close.
  const STYLES = [
    { color: '#111', dash: '' },
    { color: '#777', dash: '' },
    { color: '#111', dash: '5 3' },
    { color: '#777', dash: '5 3' },
    { color: '#444', dash: '1.5 3' },
    { color: '#999', dash: '' },
    { color: '#444', dash: '8 3 2 3' },
    { color: '#999', dash: '5 3' }
  ];

  const two = (n) => String(n).padStart(2, '0');
  const dayKey = (d = new Date()) => `${d.getFullYear()}-${two(d.getMonth() + 1)}-${two(d.getDate())}`;

  function read(key, fallback) {
    try {
      const v = JSON.parse(localStorage.getItem(key));
      return v ?? fallback;
    } catch {
      return fallback;
    }
  }
  const write = (key, value) => localStorage.setItem(key, JSON.stringify(value));

  // --- Subjects
  const getSubjects = () => read('subjects', []);

  function addSubject(name) {
    const subjects = getSubjects();
    const existing = subjects.find((s) => s.name.toLowerCase() === name.toLowerCase());
    if (existing) return existing;
    const subject = { name };
    subjects.push(subject);
    write('subjects', subjects);
    return subject;
  }

  // Removes the subject from the picker. Its past study time stays in the graph.
  function removeSubject(name) {
    write('subjects', getSubjects().filter((s) => s.name !== name));
    if (localStorage.getItem('currentSubject') === name) setCurrentSubject('');
  }

  function getCurrentSubject() {
    const name = localStorage.getItem('currentSubject') || '';
    return getSubjects().some((s) => s.name === name) ? name : '';
  }
  const setCurrentSubject = (name) => localStorage.setItem('currentSubject', name || '');

  // Line style follows the subject's place in the list, so it stays the same everywhere.
  // Removed subjects (still in old data) use fallbackIndex.
  function styleFor(name, fallbackIndex = 0) {
    const i = getSubjects().findIndex((x) => x.name === name);
    return STYLES[(i >= 0 ? i : fallbackIndex) % STYLES.length];
  }

  // Rename a subject everywhere, including its saved study time.
  // Returns false if the new name is empty or another subject already has it.
  function renameSubject(oldName, newName) {
    newName = newName.trim();
    if (!newName || newName === oldName) return false;
    const subjects = getSubjects();
    if (subjects.some((s) => s.name !== oldName && s.name.toLowerCase() === newName.toLowerCase())) return false;

    const subject = subjects.find((s) => s.name === oldName);
    if (!subject) return false;
    subject.name = newName;
    write('subjects', subjects);

    const bySubject = read('subjectTotals', {});
    for (const day of Object.values(bySubject)) {
      if (day[oldName] === undefined) continue;
      day[newName] = (day[newName] || 0) + day[oldName];
      delete day[oldName];
    }
    write('subjectTotals', bySubject);

    if (localStorage.getItem('currentSubject') === oldName) setCurrentSubject(newName);
    return true;
  }

  // --- Study time
  function addTime(ms, subject) {
    if (!(ms > 0)) return;
    const key = dayKey();

    const totals = read('studyTotals', {});
    totals[key] = (totals[key] || 0) + ms;
    write('studyTotals', totals);

    if (subject) {
      const bySubject = read('subjectTotals', {});
      const day = bySubject[key] || (bySubject[key] = {});
      day[subject] = (day[subject] || 0) + ms;
      write('subjectTotals', bySubject);
    }
  }

  // The widget page saves its running timer here while you look at the calendar or graph.
  // This saves the study time up to `at`, so nothing is lost if the app closes from those pages.
  function flushSavedSession(at = Date.now(), keepRunning = true) {
    let session = null;
    try { session = JSON.parse(sessionStorage.getItem('session')); } catch {}
    if (!session?.running) return;
    const delta = Math.max(0, at - session.at);
    addTime(delta, getCurrentSubject());
    sessionStorage.setItem('session', JSON.stringify({ ms: session.ms + delta, running: keepRunning, at }));
  }

  // Computer sleeps while the calendar or graph is open: save up to `at` and pause.
  const pauseSavedSession = (at = Date.now()) => flushSavedSession(at, false);

  window.Store = {
    two,
    renameSubject,
    flushSavedSession,
    pauseSavedSession,
    dayKey,
    getSubjects,
    addSubject,
    removeSubject,
    getCurrentSubject,
    setCurrentSubject,
    styleFor,
    addTime,
    getTotals: () => read('studyTotals', {}),
    getSubjectTotals: () => read('subjectTotals', {})
  };
})();
