/*
 * storage.js
 * All EMlab Classes data lives in the browser's localStorage.
 * This is a frontend only beta: there is no server, so data saved here
 * stays on this device and this browser only. It will not appear on
 * another device, even one signed in with the same profile details.
 */
const EMlabStorage = (() => {
  const PREFIX = 'emlab_';

  const KEYS = {
    PROFILE: PREFIX + 'profile',
    ONBOARDED: PREFIX + 'onboarded',
    CLASSROOMS: PREFIX + 'classrooms',
    RECENT_CLASSES: PREFIX + 'recent_classes',
    ACTIVITY: PREFIX + 'activity',
    THEME: PREFIX + 'theme',
    ACTIVE_CLASS: PREFIX + 'active_class'
  };

  function get(key, fallback = null) {
    try {
      const raw = localStorage.getItem(key);
      if (raw === null) return fallback;
      return JSON.parse(raw);
    } catch (e) {
      console.warn('EMlabStorage.get failed for', key, e);
      return fallback;
    }
  }

  function set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (e) {
      console.warn('EMlabStorage.set failed for', key, e);
      return false;
    }
  }

  function remove(key) {
    try { localStorage.removeItem(key); } catch (e) { /* ignore */ }
  }

  function clearAll() {
    Object.values(KEYS).forEach(remove);
  }

  return { KEYS, get, set, remove, clearAll };
})();
