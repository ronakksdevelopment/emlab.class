/*
 * utils.js - small shared helpers used across modules.
 */
const EMlabUtils = (() => {

  function generateClassCode() {
    // 5 character uppercase alphanumeric, guaranteed at least one letter and one digit
    const letters = 'ABCDEFGHJKLMNPQRSTUVWXYZ'; // avoid ambiguous I, O
    const digits = '23456789'; // avoid ambiguous 0, 1
    const all = letters + digits;
    let code = '';
    code += letters[Math.floor(Math.random() * letters.length)];
    code += digits[Math.floor(Math.random() * digits.length)];
    for (let i = 0; i < 3; i++) {
      code += all[Math.floor(Math.random() * all.length)];
    }
    // shuffle
    return code.split('').sort(() => Math.random() - 0.5).join('');
  }

  function isValidClassCode(code) {
    return /^[A-Z0-9]{5}$/.test((code || '').toUpperCase());
  }

  function generateId(prefix = 'id') {
    return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  }

  function sanitizeUsername(str) {
    return (str || '').toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 20);
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str ?? '';
    return div.innerHTML;
  }

  function formatTime(date) {
    const d = new Date(date);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  function formatRelative(timestamp) {
    const diff = Date.now() - timestamp;
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    if (days < 7) return `${days}d ago`;
    return new Date(timestamp).toLocaleDateString();
  }

  function initials(name) {
    if (!name) return '?';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }

  function buildInviteLink(code) {
    const url = new URL(window.location.href.split('?')[0]);
    url.searchParams.set('join', code);
    return url.toString();
  }

  async function copyToClipboard(text) {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
        return true;
      }
    } catch (e) { /* fall through to fallback */ }
    try {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      return true;
    } catch (e) {
      return false;
    }
  }

  async function shareContent({ title, text, url }) {
    if (navigator.share) {
      try {
        await navigator.share({ title, text, url });
        return 'shared';
      } catch (e) {
        if (e.name === 'AbortError') return 'cancelled';
        // fall through to clipboard fallback
      }
    }
    const copied = await copyToClipboard(`${text ? text + '\n' : ''}${url || ''}`.trim());
    return copied ? 'copied' : 'failed';
  }

  function debounce(fn, delay = 250) {
    let t;
    return (...args) => {
      clearTimeout(t);
      t = setTimeout(() => fn(...args), delay);
    };
  }

  function readFileAsDataUrl(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  return {
    generateClassCode, isValidClassCode, generateId, sanitizeUsername,
    escapeHtml, formatTime, formatRelative, initials, buildInviteLink,
    copyToClipboard, shareContent, debounce, readFileAsDataUrl
  };
})();
