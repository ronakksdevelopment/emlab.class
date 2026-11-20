/*
 * profile.js - local user profile creation, editing, and theming.
 */
const EMlabProfile = (() => {

  function get() {
    return EMlabStorage.get(EMlabStorage.KEYS.PROFILE, null);
  }

  function save(profile) {
    EMlabStorage.set(EMlabStorage.KEYS.PROFILE, profile);
  }

  function exists() {
    return !!get();
  }

  function create({ displayName, username, avatar, theme }) {
    const profile = {
      id: EMlabUtils.generateId('user'),
      displayName: displayName.trim(),
      username: EMlabUtils.sanitizeUsername(username),
      avatar: avatar || null,
      theme: theme || 'light',
      createdAt: Date.now()
    };
    save(profile);
    applyTheme(profile.theme);
    return profile;
  }

  function update(partial) {
    const current = get();
    if (!current) return null;
    const updated = { ...current, ...partial };
    save(updated);
    if (partial.theme) applyTheme(partial.theme);
    return updated;
  }

  function applyTheme(theme) {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.setAttribute('data-theme', 'dark');
    } else if (theme === 'light') {
      root.setAttribute('data-theme', 'light');
    } else {
      root.removeAttribute('data-theme'); // system
    }
    const moonIcon = document.querySelector('#themeToggleBtn i');
    if (moonIcon) {
      const effectiveDark = theme === 'dark' ||
        (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
      moonIcon.className = effectiveDark ? 'fa-solid fa-sun' : 'fa-solid fa-moon';
    }
  }

  function quickToggleTheme() {
    const current = get();
    const currentTheme = current?.theme || 'light';
    const next = currentTheme === 'dark' ? 'light' : 'dark';
    update({ theme: next });
    return next;
  }

  function renderAvatarInto(el, profile, sizeClass = '') {
    if (!el) return;
    if (profile && profile.avatar) {
      el.innerHTML = `<img src="${profile.avatar}" alt="${EMlabUtils.escapeHtml(profile.displayName)}">`;
    } else {
      el.innerHTML = `<span>${EMlabUtils.escapeHtml(EMlabUtils.initials(profile?.displayName || '?'))}</span>`;
    }
  }

  return { get, save, exists, create, update, applyTheme, quickToggleTheme, renderAvatarInto };
})();
