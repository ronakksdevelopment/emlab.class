/*
 * navigation.js - handles switching between app screens.
 */
const EMlabNav = (() => {
  let history = [];

  function show(screenId, { replace = false } = {}) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    const target = document.getElementById(`screen-${screenId}`);
    if (!target) { console.warn('Unknown screen', screenId); return; }
    target.classList.add('active');
    if (!replace) history.push(screenId);
    window.scrollTo(0, 0);
    document.querySelectorAll('.bottom-nav-item').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.nav === screenId);
    });
  }

  function back(fallback = 'home') {
    history.pop(); // remove current
    const prev = history.pop() || fallback;
    show(prev);
  }

  function current() {
    return history[history.length - 1] || null;
  }

  return { show, back, current };
})();
