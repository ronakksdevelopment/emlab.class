/*
 * app.js - bootstraps EMlab Classes: wires up home dashboard, create,
 * invite, join, classrooms list/detail, profile, and modals.
 */
const EMlabApp = (() => {
  let pendingCreateType = 'instant';
  let currentInviteClass = null;
  let currentClassroomDetailId = null;
  let confirmCallback = null;

  function init() {
    EMlabToast.init();
    EMlabPWA.registerServiceWorker();
    EMlabPWA.listenForInstallPrompt();

    const profile = EMlabProfile.get();
    if (profile) EMlabProfile.applyTheme(profile.theme);

    bindGlobal();

    setTimeout(() => {
      routeInitial();
    }, 700);
  }

  function routeInitial() {
    const profile = EMlabProfile.get();
    const onboarded = EMlabStorage.get(EMlabStorage.KEYS.ONBOARDED, false);

    const params = new URLSearchParams(window.location.search);
    const joinCode = params.get('join');

    if (!onboarded) {
      EMlabOnboarding.init(() => {
        if (!EMlabProfile.exists()) {
          EMlabNav.show('profile-setup', { replace: true });
        } else {
          goHome(true);
          if (joinCode) handleIncomingJoinCode(joinCode);
        }
      });
      EMlabNav.show('onboarding', { replace: true });
      return;
    }

    if (!profile) {
      EMlabNav.show('profile-setup', { replace: true });
      return;
    }

    goHome(true);
    if (joinCode) handleIncomingJoinCode(joinCode);
  }

  function handleIncomingJoinCode(code) {
    setTimeout(() => {
      EMlabNav.show('join');
      document.querySelector('[data-join-tab="code"]').click();
      document.getElementById('joinCodeInput').value = code.toUpperCase();
      EMlabToast.show(`Invitation link detected for class ${code.toUpperCase()}.`, 'info');
    }, 300);
  }

  /* ---------------- Global bindings ---------------- */
  function bindGlobal() {
    document.querySelectorAll('[data-back]').forEach(btn => {
      btn.addEventListener('click', () => EMlabNav.show(btn.dataset.back));
    });

    document.querySelectorAll('.bottom-nav-item').forEach(btn => {
      btn.addEventListener('click', () => {
        const target = btn.dataset.nav;
        if (target === 'home') goHome();
        else if (target === 'classrooms') { renderClassroomsScreen(); EMlabNav.show('classrooms'); }
        else if (target === 'join') EMlabNav.show('join');
        else if (target === 'profile') { renderProfileScreen(); EMlabNav.show('profile'); }
      });
    });

    // Modal overlay click-away + close buttons
    document.getElementById('modalOverlay').addEventListener('click', (e) => {
      if (e.target.id === 'modalOverlay') closeModal();
    });
    document.querySelectorAll('.modal-close').forEach(btn => btn.addEventListener('click', closeModal));

    // Profile setup
    document.getElementById('profileForm').addEventListener('submit', onProfileFormSubmit);
    document.getElementById('avatarInput').addEventListener('change', onAvatarChosen);

    // Theme toggle in header
    document.getElementById('themeToggleBtn').addEventListener('click', () => {
      EMlabProfile.quickToggleTheme();
    });
    document.getElementById('installBtn').addEventListener('click', () => EMlabPWA.promptInstall());
    document.getElementById('installBtnProfile').addEventListener('click', () => EMlabPWA.promptInstall());

    // Home actions
    document.getElementById('createClassBtn').addEventListener('click', () => openCreateScreen());
    document.getElementById('joinClassBtn').addEventListener('click', () => EMlabNav.show('join'));
    document.getElementById('scanQrBtn').addEventListener('click', () => {
      EMlabNav.show('join');
      document.querySelector('[data-join-tab="scan"]').click();
    });
    document.getElementById('classroomsBtn').addEventListener('click', () => { renderClassroomsScreen(); EMlabNav.show('classrooms'); });
    document.getElementById('viewAllClassroomsBtn').addEventListener('click', () => { renderClassroomsScreen(); EMlabNav.show('classrooms'); });
    document.getElementById('profileAvatarBtn').addEventListener('click', () => { renderProfileScreen(); EMlabNav.show('profile'); });
    document.getElementById('navJoinBtn').addEventListener('click', () => EMlabNav.show('join'));

    // Create screen
    document.querySelectorAll('.type-toggle-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.type-toggle-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        pendingCreateType = btn.dataset.type;
        document.getElementById('permanentFields').hidden = pendingCreateType !== 'permanent';
      });
    });
    document.getElementById('createClassForm').addEventListener('submit', onCreateClassSubmit);

    // Invite screen
    document.getElementById('copyCodeBtn').addEventListener('click', () => copyCode());
    document.getElementById('copyLinkBtn').addEventListener('click', () => copyLink());
    document.getElementById('shareInviteBtn').addEventListener('click', () => shareInvite());
    document.getElementById('enterClassroomBtn').addEventListener('click', () => {
      if (currentInviteClass) EMlabClassroom.enter(currentInviteClass);
    });

    // Join screen
    document.querySelectorAll('.join-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.join-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        document.querySelectorAll('.join-panel').forEach(p => p.classList.toggle('active', p.dataset.joinPanel === tab.dataset.joinTab));
        if (tab.dataset.joinTab !== 'scan') {
          EMlabQR.stopCameraScan(document.getElementById('scannerVideo'));
        }
      });
    });
    document.getElementById('joinByCodeBtn').addEventListener('click', () => {
      const code = document.getElementById('joinCodeInput').value.trim().toUpperCase();
      attemptJoin(code);
    });
    document.getElementById('joinCodeInput').addEventListener('input', (e) => {
      e.target.value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
    });
    document.getElementById('startScanBtn').addEventListener('click', startScan);
    document.getElementById('qrUploadInput').addEventListener('change', onQrUpload);
    document.getElementById('joinByLinkBtn').addEventListener('click', () => {
      const link = document.getElementById('joinLinkInput').value.trim();
      try {
        const url = new URL(link);
        const code = url.searchParams.get('join');
        if (code) attemptJoin(code.toUpperCase());
        else EMlabToast.show('That link does not contain a class code.', 'error');
      } catch (e) {
        EMlabToast.show('Please paste a valid invitation link.', 'error');
      }
    });

    // Classrooms list
    document.getElementById('addClassroomBtn').addEventListener('click', () => openCreateScreen('permanent'));

    // Classroom detail tabs
    document.querySelectorAll('.detail-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.detail-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        document.querySelectorAll('.detail-panel').forEach(p => p.classList.toggle('active', p.dataset.detailPanel === tab.dataset.detailTab));
      });
    });
    document.getElementById('classroomCopyCode').addEventListener('click', () => {
      const room = EMlabClasses.getClassroomById(currentClassroomDetailId);
      if (room) EMlabUtils.copyToClipboard(room.code).then(() => EMlabToast.show('Code copied.', 'success'));
    });
    document.getElementById('classroomCopyLink').addEventListener('click', () => {
      const room = EMlabClasses.getClassroomById(currentClassroomDetailId);
      if (room) EMlabUtils.copyToClipboard(EMlabUtils.buildInviteLink(room.code)).then(() => EMlabToast.show('Link copied.', 'success'));
    });
    document.getElementById('classroomShare').addEventListener('click', async () => {
      const room = EMlabClasses.getClassroomById(currentClassroomDetailId);
      if (!room) return;
      const result = await EMlabUtils.shareContent({ title: room.name, text: `Join my class "${room.name}" with code ${room.code}`, url: EMlabUtils.buildInviteLink(room.code) });
      if (result === 'copied') EMlabToast.show('Invite copied to clipboard.', 'success');
    });
    document.getElementById('enterClassroomDetailBtn').addEventListener('click', () => {
      const room = EMlabClasses.getClassroomById(currentClassroomDetailId);
      if (room) EMlabClassroom.enter(room);
    });
    document.getElementById('announcementForm').addEventListener('submit', (e) => {
      e.preventDefault();
      const input = document.getElementById('announcementInput');
      const text = input.value.trim();
      if (!text) return;
      EMlabClasses.addAnnouncement(currentClassroomDetailId, text);
      input.value = '';
      renderClassroomDetail(currentClassroomDetailId);
      EMlabToast.show('Announcement posted.', 'success');
    });
    document.getElementById('resourceUploadInput').addEventListener('change', onResourceUpload);
    document.getElementById('leaveClassroomBtn').addEventListener('click', () => {
      showConfirm({
        title: 'Leave this classroom?',
        message: 'You will need the class code to rejoin.',
        confirmLabel: 'Leave',
        onConfirm: () => {
          EMlabNav.show('classrooms');
          renderClassroomsScreen();
          EMlabToast.show('You left the classroom.', 'info');
        }
      });
    });
    document.getElementById('deleteClassroomBtn').addEventListener('click', () => {
      showConfirm({
        title: 'Delete this classroom?',
        message: 'This cannot be undone. All announcements and resources will be removed from this device.',
        confirmLabel: 'Delete',
        onConfirm: () => {
          EMlabClasses.deleteClassroom(currentClassroomDetailId);
          renderClassroomsScreen();
          EMlabNav.show('classrooms');
          EMlabToast.show('Classroom deleted.', 'success');
        }
      });
    });
    document.getElementById('transferHostBtn').addEventListener('click', () => {
      EMlabToast.show('Select a participant inside the classroom to transfer host privileges.', 'info');
    });

    // Profile screen
    document.getElementById('editProfileBtn').addEventListener('click', () => {
      const p = EMlabProfile.get();
      document.getElementById('displayNameInput').value = p.displayName;
      document.getElementById('usernameInput').value = p.username;
      document.getElementById('themeSelect').value = p.theme;
      if (p.avatar) document.getElementById('avatarPreview').innerHTML = `<img src="${p.avatar}" alt="">`;
      EMlabNav.show('profile-setup');
    });
    document.getElementById('profileThemeSelect').addEventListener('change', (e) => {
      EMlabProfile.update({ theme: e.target.value });
    });
    document.getElementById('replayOnboardingBtn').addEventListener('click', () => {
      EMlabOnboarding.replay(() => EMlabNav.show('profile'));
      EMlabNav.show('onboarding');
    });
    document.getElementById('aboutAppBtn').addEventListener('click', () => openModal('aboutModal'));
    document.getElementById('resetDataBtn').addEventListener('click', () => {
      showConfirm({
        title: 'Reset all local data?',
        message: 'This permanently deletes your profile, classrooms, and recent classes from this device.',
        confirmLabel: 'Reset Everything',
        onConfirm: () => {
          EMlabStorage.clearAll();
          window.location.reload();
        }
      });
    });

    // Confirm modal
    document.getElementById('confirmCancelBtn').addEventListener('click', closeModal);
    document.getElementById('confirmOkBtn').addEventListener('click', () => {
      const cb = confirmCallback;
      closeModal();
      cb && cb();
    });

    // Close more menu / reaction menu on outside click
    document.addEventListener('click', (e) => {
      const moreMenu = document.getElementById('moreMenu');
      const moreBtn = document.getElementById('moreBtn');
      if (moreMenu && !moreMenu.hidden && !moreMenu.contains(e.target) && e.target !== moreBtn && !moreBtn.contains(e.target)) {
        moreMenu.hidden = true;
      }
      const reactMenu = document.getElementById('reactionMenu');
      const reactBtn = document.getElementById('reactBtn');
      if (reactMenu && !reactMenu.hidden && !reactMenu.contains(e.target) && e.target !== reactBtn && !reactBtn.contains(e.target)) {
        reactMenu.hidden = true;
      }
    });
  }

  /* ---------------- Profile setup ---------------- */
  function onAvatarChosen(e) {
    const file = e.target.files[0];
    if (!file) return;
    EMlabUtils.readFileAsDataUrl(file).then(dataUrl => {
      document.getElementById('avatarPreview').innerHTML = `<img src="${dataUrl}" alt="">`;
      document.getElementById('avatarPreview').dataset.pendingAvatar = dataUrl;
    });
  }

  function onProfileFormSubmit(e) {
    e.preventDefault();
    const displayName = document.getElementById('displayNameInput').value.trim();
    const username = document.getElementById('usernameInput').value.trim();
    const theme = document.getElementById('themeSelect').value;
    const avatar = document.getElementById('avatarPreview').dataset.pendingAvatar || EMlabProfile.get()?.avatar || null;

    if (!displayName) { EMlabToast.show('Please enter a display name.', 'error'); return; }
    if (!EMlabUtils.sanitizeUsername(username)) { EMlabToast.show('Please enter a valid username.', 'error'); return; }

    const existing = EMlabProfile.get();
    if (existing) {
      EMlabProfile.update({ displayName, username: EMlabUtils.sanitizeUsername(username), theme, avatar });
      EMlabToast.show('Profile updated.', 'success');
      renderProfileScreen();
      EMlabNav.show('profile');
    } else {
      EMlabProfile.create({ displayName, username, theme, avatar });
      EMlabToast.show(`Welcome, ${displayName}!`, 'success');
      goHome(true);
    }
  }

  /* ---------------- Home dashboard ---------------- */
  function goHome(replace = false) {
    renderHome();
    EMlabNav.show('home', { replace });
  }

  function renderHome() {
    const profile = EMlabProfile.get();
    if (!profile) return;
    EMlabProfile.renderAvatarInto(document.getElementById('headerAvatar'), profile);

    const hour = new Date().getHours();
    const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
    document.getElementById('greetingText').textContent = `${greeting}, ${profile.displayName.split(' ')[0]}!`;

    const recent = EMlabClasses.getRecent();
    document.getElementById('greetingSub').textContent = recent.length
      ? 'Ready to jump back into a class?' : 'Create or join your first class to get started.';

    const recentEl = document.getElementById('recentClassesList');
    recentEl.innerHTML = recent.length
      ? recent.slice(0, 5).map(c => listCardHtml(c, 'recent')).join('')
      : '<p class="empty-hint">No recent classes yet. Create or join one to get started.</p>';
    bindListCardClicks(recentEl, 'recent');

    const classrooms = EMlabClasses.getClassrooms();
    const previewEl = document.getElementById('classroomsPreviewList');
    previewEl.innerHTML = classrooms.length
      ? classrooms.slice(0, 3).map(c => listCardHtml(c, 'classroom')).join('')
      : '<p class="empty-hint">No classrooms yet. Create a permanent classroom to organize ongoing classes.</p>';
    bindListCardClicks(previewEl, 'classroom');

    const activity = EMlabClasses.getActivity();
    const activityEl = document.getElementById('activityList');
    activityEl.innerHTML = activity.length
      ? activity.slice(0, 6).map(a => `<div class="activity-item"><i class="fa-solid ${a.icon}"></i> <span>${EMlabUtils.escapeHtml(a.text)} &middot; ${EMlabUtils.formatRelative(a.ts)}</span></div>`).join('')
      : '<p class="empty-hint">Your recent activity will show up here.</p>';
  }

  function listCardHtml(c, kind) {
    const icon = c.type === 'permanent' ? 'fa-school' : 'fa-bolt';
    const bg = c.type === 'permanent' ? 'bg-navy' : 'bg-pink';
    const sub = kind === 'recent'
      ? `Hosted by ${EMlabUtils.escapeHtml(c.hostName || 'Host')}`
      : EMlabUtils.escapeHtml(c.description || 'Permanent classroom');
    return `
      <div class="list-card" data-card-id="${c.id}" data-card-kind="${kind}" data-card-code="${c.code}">
        <span class="list-card-icon ${bg}"><i class="fa-solid ${icon}"></i></span>
        <span class="list-card-body">
          <p class="list-card-title">${EMlabUtils.escapeHtml(c.name)}</p>
          <p class="list-card-sub">${sub}</p>
        </span>
        <span class="list-card-code">${c.code}</span>
      </div>`;
  }

  function bindListCardClicks(container, kind) {
    container.querySelectorAll('.list-card').forEach(card => {
      card.addEventListener('click', () => {
        if (kind === 'classroom') {
          renderClassroomDetail(card.dataset.cardId);
          EMlabNav.show('classroom-detail');
        } else {
          attemptJoin(card.dataset.cardCode);
        }
      });
    });
  }

  /* ---------------- Create class ---------------- */
  function openCreateScreen(presetType) {
    document.getElementById('createClassForm').reset();
    pendingCreateType = presetType || 'instant';
    document.querySelectorAll('.type-toggle-btn').forEach(b => b.classList.toggle('active', b.dataset.type === pendingCreateType));
    document.getElementById('permanentFields').hidden = pendingCreateType !== 'permanent';
    EMlabNav.show('create');
  }

  function onCreateClassSubmit(e) {
    e.preventDefault();
    const name = document.getElementById('classNameInput').value.trim();
    if (!name) { EMlabToast.show('Please enter a class name.', 'error'); return; }
    const description = document.getElementById('classDescInput').value.trim();
    const permissions = {
      mic: document.getElementById('permMic').checked,
      cam: document.getElementById('permCam').checked,
      chat: document.getElementById('permChat').checked,
      files: document.getElementById('permFiles').checked,
      invite: document.getElementById('permInvite').checked,
      screen: document.getElementById('permScreen').checked
    };
    const classData = EMlabClasses.createClass({ name, type: pendingCreateType, description, permissions });
    currentInviteClass = classData;
    renderInviteScreen(classData);
    EMlabNav.show('invite');
  }

  function renderInviteScreen(classData) {
    document.getElementById('inviteClassName').textContent = classData.name;
    document.getElementById('codeDisplay').textContent = classData.code;
    const link = EMlabUtils.buildInviteLink(classData.code);
    EMlabQR.renderInto(document.getElementById('inviteQrWrap'), link);
  }

  function copyCode() {
    if (!currentInviteClass) return;
    EMlabUtils.copyToClipboard(currentInviteClass.code).then(ok => {
      EMlabToast.show(ok ? 'Class code copied.' : 'Could not copy code.', ok ? 'success' : 'error');
    });
  }
  function copyLink() {
    if (!currentInviteClass) return;
    EMlabUtils.copyToClipboard(EMlabUtils.buildInviteLink(currentInviteClass.code)).then(ok => {
      EMlabToast.show(ok ? 'Invite link copied.' : 'Could not copy link.', ok ? 'success' : 'error');
    });
  }
  async function shareInvite() {
    if (!currentInviteClass) return;
    const result = await EMlabUtils.shareContent({
      title: currentInviteClass.name,
      text: `Join my class "${currentInviteClass.name}" on EMlab Classes with code ${currentInviteClass.code}`,
      url: EMlabUtils.buildInviteLink(currentInviteClass.code)
    });
    if (result === 'copied') EMlabToast.show('Invite copied to clipboard.', 'success');
    else if (result === 'failed') EMlabToast.show('Could not share invite.', 'error');
  }

  /* ---------------- Join class ---------------- */
  function attemptJoin(code) {
    const result = EMlabClasses.joinByCode(code);
    if (!result.ok) { EMlabToast.show(result.error, 'error'); return; }
    EMlabQR.stopCameraScan(document.getElementById('scannerVideo'));
    EMlabToast.show(`Joined "${result.classData.name}".`, 'success');
    EMlabClassroom.enter(result.classData);
  }

  function startScan() {
    const btn = document.getElementById('startScanBtn');
    const video = document.getElementById('scannerVideo');
    const canvas = document.getElementById('scannerCanvas');
    btn.innerHTML = '<span class="spinner"></span> Scanning...';
    btn.disabled = true;
    EMlabQR.startCameraScan(video, canvas, (data) => {
      btn.innerHTML = '<i class="fa-solid fa-camera"></i> Start Camera';
      btn.disabled = false;
      const code = extractCodeFromScan(data);
      if (code) attemptJoin(code);
      else EMlabToast.show('Scanned QR code was not a valid class invite.', 'error');
    }, (err) => {
      btn.innerHTML = '<i class="fa-solid fa-camera"></i> Start Camera';
      btn.disabled = false;
      EMlabToast.show(err, 'error');
    });
  }

  function extractCodeFromScan(data) {
    try {
      const url = new URL(data);
      const code = url.searchParams.get('join');
      if (code) return code.toUpperCase();
    } catch (e) { /* not a URL */ }
    if (EMlabUtils.isValidClassCode(data)) return data.toUpperCase();
    return null;
  }

  function onQrUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    const canvas = document.getElementById('uploadCanvas');
    EMlabQR.scanImageFile(file, canvas).then(data => {
      const code = extractCodeFromScan(data);
      if (code) attemptJoin(code);
      else EMlabToast.show('That QR image was not a valid class invite.', 'error');
    }).catch(err => {
      EMlabToast.show(err.message, 'error');
    });
    e.target.value = '';
  }

  /* ---------------- Classrooms list + detail ---------------- */
  function renderClassroomsScreen() {
    const rooms = EMlabClasses.getClassrooms();
    const el = document.getElementById('classroomsFullList');
    el.innerHTML = rooms.length
      ? rooms.map(c => listCardHtml(c, 'classroom')).join('')
      : '<p class="empty-hint">No classrooms yet. Tap + to create one.</p>';
    bindListCardClicks(el, 'classroom');
  }

  function renderClassroomDetail(id) {
    currentClassroomDetailId = id;
    const room = EMlabClasses.getClassroomById(id);
    if (!room) return;
    document.getElementById('classroomDetailName').textContent = room.name;
    document.getElementById('classroomDetailDesc').textContent = room.description || 'No description yet.';
    document.getElementById('classroomDetailCode').textContent = room.code;
    EMlabQR.renderInto(document.getElementById('classroomDetailQr'), EMlabUtils.buildInviteLink(room.code));

    const membersEl = document.getElementById('classroomMembersList');
    membersEl.innerHTML = room.members.map(m => `
      <div class="member-row">
        <span class="header-avatar">${m.avatar ? `<img src="${m.avatar}" alt="">` : EMlabUtils.escapeHtml(EMlabUtils.initials(m.name))}</span>
        <span class="member-row-name">${EMlabUtils.escapeHtml(m.name)}</span>
        <span class="member-row-role">${m.role}</span>
      </div>
    `).join('') || '<p class="empty-hint">No members yet.</p>';

    const annEl = document.getElementById('announcementsList');
    annEl.innerHTML = room.announcements.length
      ? room.announcements.map(a => `
        <div class="announcement-card">
          <p>${EMlabUtils.escapeHtml(a.text)}</p>
          <div class="announcement-meta">${EMlabUtils.escapeHtml(a.author)} &middot; ${EMlabUtils.formatRelative(a.ts)}</div>
        </div>`).join('')
      : '<p class="empty-hint">No announcements yet.</p>';

    const resEl = document.getElementById('resourcesList');
    resEl.innerHTML = room.resources.length
      ? room.resources.map(r => `
        <div class="resource-card">
          <a href="${r.dataUrl}" download="${EMlabUtils.escapeHtml(r.name)}"><i class="fa-solid fa-file-arrow-down"></i> ${EMlabUtils.escapeHtml(r.name)}</a>
        </div>`).join('')
      : '<p class="empty-hint">No learning resources or assignments yet.</p>';

    const settingsEl = document.getElementById('classroomSettingsPerms');
    const perms = room.permissions;
    settingsEl.innerHTML = `
      <label class="switch-row"><span><i class="fa-solid fa-microphone"></i> Microphone</span><input type="checkbox" ${perms.mic ? 'checked' : ''} data-perm="mic" class="switch-input"></label>
      <label class="switch-row"><span><i class="fa-solid fa-video"></i> Camera</span><input type="checkbox" ${perms.cam ? 'checked' : ''} data-perm="cam" class="switch-input"></label>
      <label class="switch-row"><span><i class="fa-solid fa-comments"></i> Chat</span><input type="checkbox" ${perms.chat ? 'checked' : ''} data-perm="chat" class="switch-input"></label>
      <label class="switch-row"><span><i class="fa-solid fa-paperclip"></i> File uploads</span><input type="checkbox" ${perms.files ? 'checked' : ''} data-perm="files" class="switch-input"></label>
      <label class="switch-row"><span><i class="fa-solid fa-display"></i> Screen sharing</span><input type="checkbox" ${perms.screen ? 'checked' : ''} data-perm="screen" class="switch-input"></label>
      <label class="switch-row"><span><i class="fa-solid fa-user-plus"></i> Invitations</span><input type="checkbox" ${perms.invite ? 'checked' : ''} data-perm="invite" class="switch-input"></label>
    `;
    settingsEl.querySelectorAll('[data-perm]').forEach(input => {
      input.addEventListener('change', () => {
        const updated = { ...room.permissions, [input.dataset.perm]: input.checked };
        EMlabClasses.updateClassroom(room.id, { permissions: updated });
        EMlabToast.show('Permission updated.', 'success');
      });
    });
  }

  function onResourceUpload(e) {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    Promise.all(files.map(f => EMlabUtils.readFileAsDataUrl(f).then(dataUrl => ({
      id: EMlabUtils.generateId('res'), name: f.name, size: f.size, dataUrl, addedAt: Date.now()
    })))).then(resourceObjs => {
      resourceObjs.forEach(r => EMlabClasses.addResource(currentClassroomDetailId, r));
      renderClassroomDetail(currentClassroomDetailId);
      EMlabToast.show('Resource added.', 'success');
    });
    e.target.value = '';
  }

  /* ---------------- Profile screen ---------------- */
  function renderProfileScreen() {
    const p = EMlabProfile.get();
    if (!p) return;
    document.getElementById('profileDisplayName').textContent = p.displayName;
    document.getElementById('profileUsername').textContent = `@${p.username}`;
    EMlabProfile.renderAvatarInto(document.getElementById('profileAvatarLg'), p);
    document.getElementById('profileThemeSelect').value = p.theme;
  }

  /* ---------------- Modals ---------------- */
  function openModal(id) {
    document.querySelectorAll('.modal').forEach(m => m.hidden = true);
    document.getElementById(id).hidden = false;
    document.getElementById('modalOverlay').hidden = false;
    document.getElementById('modalOverlay').setAttribute('data-visible', '');
  }
  function closeModal() {
    document.getElementById('modalOverlay').hidden = true;
    document.getElementById('modalOverlay').removeAttribute('data-visible');
    document.querySelectorAll('.modal').forEach(m => m.hidden = true);
  }
  function showConfirm({ title, message, confirmLabel = 'Confirm', onConfirm }) {
    document.getElementById('confirmTitle').textContent = title;
    document.getElementById('confirmMessage').textContent = message;
    document.getElementById('confirmOkBtn').textContent = confirmLabel;
    confirmCallback = onConfirm;
    openModal('confirmModal');
  }

  return { init, goHome, openModal, closeModal, showConfirm };
})();

document.addEventListener('DOMContentLoaded', () => EMlabApp.init());
