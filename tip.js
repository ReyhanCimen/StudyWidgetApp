// Small hover tooltip shared by the calendar and graph pages.
(function () {
  let tip = null;

  function el() {
    if (!tip) {
      tip = document.createElement('div');
      tip.className = 'tip hidden';
      document.querySelector('.data-container').appendChild(tip);
    }
    return tip;
  }

  // Shows `text` just above `target`, kept inside the window.
  function show(target, text) {
    const t = el();
    t.textContent = text;
    t.classList.remove('hidden');
    const box = t.parentElement.getBoundingClientRect();
    const r = target.getBoundingClientRect();
    const left = r.left + r.width / 2 - box.left - t.offsetWidth / 2;
    t.style.left = `${Math.max(2, Math.min(left, box.width - t.offsetWidth - 2))}px`;
    t.style.top = `${Math.max(2, r.top - box.top - t.offsetHeight - 4)}px`;
  }

  const hide = () => tip?.classList.add('hidden');

  window.Tip = { show, hide };
})();
