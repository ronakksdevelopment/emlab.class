/*
 * toast.js - lightweight toast notifications.
 */
const EMlabToast = (() => {
  let container;

  function init() {
    container = document.getElementById('toastContainer');
  }

  function show(message, type = 'info', duration = 3200) {
    if (!container) init();
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    const icon = type === 'success' ? 'fa-circle-check'
      : type === 'error' ? 'fa-circle-exclamation'
      : 'fa-circle-info';
    toast.innerHTML = `<i class="fa-solid ${icon}"></i><span>${EMlabUtils.escapeHtml(message)}</span>`;
    container.appendChild(toast);
    setTimeout(() => {
      toast.style.transition = 'opacity 0.25s ease';
      toast.style.opacity = '0';
      setTimeout(() => toast.remove(), 250);
    }, duration);
  }

  return { init, show };
})();
