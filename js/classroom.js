/*
 * classroom.js - the live classroom UI: media controls, participants,
 * host controls, reactions, raise hand, screen share, PiP, fullscreen.
 *
 * HONESTY NOTE: this is a frontend only beta. Camera/mic streams shown
 * here are the LOCAL device's own camera and microphone, previewed to
 * the user. Other "participants" rendered on screen are local demo
 * placeholders, not real people connecting over the internet. No audio
 * or video is transmitted anywhere. A future version will add a
 * WebRTC signaling server and backend for real multi device calls.
 */
const EMlabClassroom = (() => {
  let activeClass = null;
  let localStream = null;
  let screenStream = null;
  let micOn = true;
  let camOn = true;
  let handRaised = false;
  let timerInterval = null;
  let secondsElapsed = 0;
  let isHost = false;
  let pinnedId = null;
  let demoParticipants = [];

  function enter(classData) {
    activeClass = classData;
    isHost = classData.hostId === EMlabProfile.get()?.id;
    micOn = true;
    camOn = true;
    handRaised = false;
    secondsElapsed = 0;
    pinnedId = null;

    document.getElementById('liveClassName').textContent = classData.name;
    document.getElementById('participantCountBadge').innerHTML =
      `<i class="fa-solid fa-users"></i> ${classData.members.length || 1}`;

    buildDemoParticipants();
    renderParticipants();
    renderVideoGrid();
    startTimer();
    requestLocalMedia();
    bindControlBar();
    EMlabChat.init(activeClass);

    EMlabNav.show('classroom');
    document.body.dataset.inClassroom = 'true';
  }

  function buildDemoParticipants() {
    // Represent the real local user plus any stored members as demo tiles.
    const profile = EMlabProfile.get();
    demoParticipants = (activeClass.members || []).map(m => ({
      id: m.id || EMlabUtils.generateId('p'),
      name: m.name || 'Guest',
      avatar: m.avatar || null,
      role: m.role || 'participant',
      isLocal: m.id === profile?.id,
      muted: false,
      camOff: false,
      handRaised: false
    }));
    if (demoParticipants.length === 0) {
      demoParticipants.push({
        id: profile?.id || 'local', name: profile?.displayName || 'You',
        avatar: profile?.avatar || null, role: isHost ? 'host' : 'participant',
        isLocal: true, muted: false, camOff: false, handRaised: false
      });
    }
  }

  async function requestLocalMedia() {
    try {
      localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      const localVideo = document.querySelector('[data-tile-video="local"]');
      if (localVideo) {
        localVideo.srcObject = localStream;
        localVideo.play().catch(() => {});
      }
      enumerateDevices();
    } catch (e) {
      EMlabToast.show('Camera or microphone not available. You can still use the classroom.', 'info');
      camOn = false;
      updateMicCamButtons();
    }
  }

  async function enumerateDevices() {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      fillSelect('cameraSelect', devices.filter(d => d.kind === 'videoinput'));
      fillSelect('micSelect', devices.filter(d => d.kind === 'audioinput'));
      fillSelect('speakerSelect', devices.filter(d => d.kind === 'audiooutput'));
    } catch (e) { /* ignore, not critical */ }
  }

  function fillSelect(id, list) {
    const sel = document.getElementById(id);
    if (!sel) return;
    sel.innerHTML = list.length
      ? list.map((d, i) => `<option value="${d.deviceId}">${EMlabUtils.escapeHtml(d.label || `Device ${i + 1}`)}</option>`).join('')
      : '<option>No devices found</option>';
  }

  function renderVideoGrid() {
    const grid = document.getElementById('videoGrid');
    grid.innerHTML = demoParticipants.map(p => tileHtml(p)).join('');
  }

  function tileHtml(p) {
    const pinnedClass = pinnedId === p.id ? ' pinned' : '';
    const crown = p.role === 'host' ? '<span class="video-tile-host-crown"><i class="fa-solid fa-crown"></i></span>' : '';
    const videoEl = p.isLocal
      ? `<video data-tile-video="local" playsinline muted style="${camOn ? '' : 'display:none'}"></video>`
      : '';
    const avatarVisible = p.isLocal ? !camOn : true;
    return `
      <div class="video-tile" data-participant-id="${p.id}">
        ${crown}
        ${videoEl}
        <div class="video-tile-avatar" style="${avatarVisible ? '' : 'display:none'}">
          ${p.avatar ? `<img src="${p.avatar}" alt="">` : EMlabUtils.escapeHtml(EMlabUtils.initials(p.name))}
        </div>
        <div class="video-tile-badges">
          ${p.isLocal && !micOn ? '<span class="video-tile-badge muted"><i class="fa-solid fa-microphone-slash"></i></span>' : ''}
          ${p.handRaised ? '<span class="video-tile-badge hand">✋</span>' : ''}
        </div>
        <div class="video-tile-name"><i class="fa-solid ${p.isLocal && !micOn ? 'fa-microphone-slash' : 'fa-microphone'}"></i> ${EMlabUtils.escapeHtml(p.name)}${p.isLocal ? ' (You)' : ''}</div>
      </div>`;
  }

  function renderParticipants() {
    const list = document.getElementById('participantsList');
    list.innerHTML = demoParticipants.map(p => `
      <li class="participant-row" data-pid="${p.id}">
        <span class="header-avatar">${p.avatar ? `<img src="${p.avatar}" alt="">` : EMlabUtils.escapeHtml(EMlabUtils.initials(p.name))}</span>
        <span class="participant-row-name">${EMlabUtils.escapeHtml(p.name)}${p.isLocal ? ' (You)' : ''} ${p.role === 'host' ? '<i class="fa-solid fa-crown" style="color:var(--yellow)"></i>' : ''}</span>
        <span class="participant-row-icons">
          ${p.handRaised ? '✋' : ''}
          <i class="fa-solid ${p.isLocal ? (micOn ? 'fa-microphone' : 'fa-microphone-slash is-muted') : 'fa-microphone'}"></i>
        </span>
        ${isHost && !p.isLocal ? `<button class="participant-menu-btn" data-host-action="${p.id}"><i class="fa-solid fa-ellipsis-vertical"></i></button>` : ''}
      </li>
    `).join('');

    document.querySelectorAll('[data-host-action]').forEach(btn => {
      btn.onclick = () => showHostParticipantMenu(btn.dataset.hostAction);
    });
  }

  function showHostParticipantMenu(participantId) {
    const p = demoParticipants.find(x => x.id === participantId);
    if (!p) return;
    EMlabApp.showConfirm({
      title: `Manage ${p.name}`,
      message: 'As host, you can mute, remove, or transfer host to this participant from Host Controls in the More menu.',
      confirmLabel: 'Open Host Controls',
      onConfirm: () => openHostControls()
    });
  }

  function startTimer() {
    clearInterval(timerInterval);
    timerInterval = setInterval(() => {
      secondsElapsed++;
      const m = String(Math.floor(secondsElapsed / 60)).padStart(2, '0');
      const s = String(secondsElapsed % 60).padStart(2, '0');
      document.getElementById('meetingTimer').innerHTML = `<i class="fa-solid fa-clock"></i> ${m}:${s}`;
    }, 1000);
  }

  function bindControlBar() {
    document.getElementById('micBtn').onclick = toggleMic;
    document.getElementById('camBtn').onclick = toggleCam;
    document.getElementById('screenShareBtn').onclick = toggleScreenShare;
    document.getElementById('raiseHandBtn').onclick = toggleRaiseHand;
    document.getElementById('reactBtn').onclick = toggleReactionMenu;
    document.getElementById('pipBtn').onclick = togglePip;
    document.getElementById('chatToggleBtn').onclick = () => openSidePanel('chat');
    document.getElementById('participantsToggleBtn').onclick = () => openSidePanel('participants');
    document.getElementById('moreBtn').onclick = toggleMoreMenu;
    document.getElementById('leaveClassBtn').onclick = leave;
    document.getElementById('fullscreenBtn').onclick = toggleFullscreen;
    document.getElementById('sidePanelCloseBtn').onclick = closeSidePanel;
    document.getElementById('hostControlsMenuBtn').onclick = openHostControls;
    document.getElementById('lockClassMenuBtn').onclick = toggleLock;
    document.getElementById('deviceSettingsMenuBtn').onclick = openDeviceSettings;

    document.querySelectorAll('.side-tab').forEach(tab => {
      tab.onclick = () => openSidePanel(tab.dataset.sideTab);
    });
    document.querySelectorAll('.chip-btn').forEach(btn => {
      btn.onclick = () => setView(btn.dataset.view);
    });
    document.querySelectorAll('.reaction-menu button').forEach(btn => {
      btn.onclick = () => sendReaction(btn.dataset.emoji);
    });

    // Show host-only menu items
    document.getElementById('hostControlsMenuBtn').style.display = isHost ? 'flex' : 'none';
    document.getElementById('lockClassMenuBtn').style.display = isHost ? 'flex' : 'none';

    if (!isHost) hideIfExists('hostControlsMenuBtn');
  }

  function hideIfExists(id) {
    const el = document.getElementById(id);
    if (el) el.style.display = 'none';
  }

  function toggleMic() {
    micOn = !micOn;
    if (localStream) localStream.getAudioTracks().forEach(t => t.enabled = micOn);
    updateMicCamButtons();
    renderVideoGrid();
    renderParticipants();
  }

  function toggleCam() {
    camOn = !camOn;
    if (localStream) localStream.getVideoTracks().forEach(t => t.enabled = camOn);
    updateMicCamButtons();
    renderVideoGrid();
  }

  function updateMicCamButtons() {
    const micBtn = document.getElementById('micBtn');
    const camBtn = document.getElementById('camBtn');
    micBtn.classList.toggle('off', !micOn);
    micBtn.innerHTML = micOn ? '<i class="fa-solid fa-microphone"></i><span>Mute</span>' : '<i class="fa-solid fa-microphone-slash"></i><span>Unmute</span>';
    camBtn.classList.toggle('off', !camOn);
    camBtn.innerHTML = camOn ? '<i class="fa-solid fa-video"></i><span>Camera</span>' : '<i class="fa-solid fa-video-slash"></i><span>Camera</span>';
  }

  async function toggleScreenShare() {
    const btn = document.getElementById('screenShareBtn');
    if (screenStream) {
      screenStream.getTracks().forEach(t => t.stop());
      screenStream = null;
      btn.classList.remove('active-panel');
      EMlabToast.show('Screen sharing stopped.', 'info');
      return;
    }
    if (!navigator.mediaDevices.getDisplayMedia) {
      EMlabToast.show('Screen sharing is not supported in this browser.', 'error');
      return;
    }
    try {
      screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
      btn.classList.add('active-panel');
      EMlabToast.show('You are sharing your screen to this local preview.', 'success');
      screenStream.getVideoTracks()[0].addEventListener('ended', () => {
        screenStream = null;
        btn.classList.remove('active-panel');
      });
    } catch (e) {
      // user cancelled, no error needed
    }
  }

  function toggleRaiseHand() {
    handRaised = !handRaised;
    const btn = document.getElementById('raiseHandBtn');
    btn.classList.toggle('raised', handRaised);
    const me = demoParticipants.find(p => p.isLocal);
    if (me) me.handRaised = handRaised;
    renderVideoGrid();
    renderParticipants();
    EMlabToast.show(handRaised ? 'Hand raised.' : 'Hand lowered.', 'info');
  }

  function toggleReactionMenu() {
    const menu = document.getElementById('reactionMenu');
    menu.hidden = !menu.hidden;
  }

  function sendReaction(emoji) {
    document.getElementById('reactionMenu').hidden = true;
    const overlay = document.getElementById('reactionsOverlay');
    const span = document.createElement('span');
    span.className = 'floating-emoji';
    span.textContent = emoji;
    span.style.left = `${20 + Math.random() * 60}%`;
    overlay.appendChild(span);
    setTimeout(() => span.remove(), 2300);
  }

  async function togglePip() {
    const video = document.querySelector('[data-tile-video="local"]');
    if (!video || !document.pictureInPictureEnabled) {
      EMlabToast.show('Picture in picture is not supported here.', 'error');
      return;
    }
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
      } else {
        await video.requestPictureInPicture();
      }
    } catch (e) {
      EMlabToast.show('Could not toggle picture in picture.', 'error');
    }
  }

  function openSidePanel(tab) {
    document.getElementById('sidePanel').classList.add('open');
    document.querySelectorAll('.side-tab').forEach(t => t.classList.toggle('active', t.dataset.sideTab === tab));
    document.querySelectorAll('.side-content').forEach(c => c.classList.toggle('active', c.dataset.sideContent === tab));
  }
  function closeSidePanel() {
    document.getElementById('sidePanel').classList.remove('open');
  }

  function setView(view) {
    document.querySelectorAll('.chip-btn').forEach(b => b.classList.toggle('active', b.dataset.view === view));
    // In this demo, gallery vs speaker just pins/unpins the first participant.
    if (view === 'speaker' && demoParticipants[0]) {
      pinnedId = demoParticipants[0].id;
    } else {
      pinnedId = null;
    }
    renderVideoGrid();
  }

  function toggleMoreMenu() {
    const menu = document.getElementById('moreMenu');
    menu.hidden = !menu.hidden;
  }

  function toggleFullscreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.().catch(() => {
        EMlabToast.show('Fullscreen is not supported here.', 'info');
      });
    } else {
      document.exitFullscreen?.();
    }
  }

  function openHostControls() {
    document.getElementById('moreMenu').hidden = true;
    const room = activeClass;
    const perms = room.permissions || EMlabClasses.defaultPermissions();
    document.getElementById('hostPermMic').checked = perms.mic;
    document.getElementById('hostPermCam').checked = perms.cam;
    document.getElementById('hostPermChat').checked = perms.chat;
    document.getElementById('hostPermFiles').checked = perms.files;
    document.getElementById('hostPermScreen').checked = perms.screen;
    document.getElementById('hostPermInvite').checked = perms.invite;

    const list = document.getElementById('raisedHandsList');
    const raised = demoParticipants.filter(p => p.handRaised);
    list.innerHTML = raised.length
      ? raised.map(p => `<div class="raised-hand-row">✋ <strong>${EMlabUtils.escapeHtml(p.name)}</strong></div>`).join('')
      : '<p class="empty-hint">No hands raised.</p>';

    ['hostPermMic', 'hostPermCam', 'hostPermChat', 'hostPermFiles', 'hostPermScreen', 'hostPermInvite'].forEach(id => {
      document.getElementById(id).onchange = (e) => {
        const key = id.replace('hostPerm', '').toLowerCase();
        const newPerms = { ...perms, [key]: e.target.checked };
        activeClass.permissions = newPerms;
        if (activeClass.type === 'permanent') EMlabClasses.updateClassroom(activeClass.id, { permissions: newPerms });
        EMlabToast.show('Permission updated.', 'success');
      };
    });

    EMlabApp.openModal('hostControlsModal');
  }

  function toggleLock() {
    document.getElementById('moreMenu').hidden = true;
    activeClass.locked = !activeClass.locked;
    if (activeClass.type === 'permanent') EMlabClasses.updateClassroom(activeClass.id, { locked: activeClass.locked });
    EMlabToast.show(activeClass.locked ? 'Classroom locked. New joins are blocked.' : 'Classroom unlocked.', 'info');
  }

  function openDeviceSettings() {
    document.getElementById('moreMenu').hidden = true;
    EMlabApp.openModal('deviceSettingsModal');
  }

  function leave() {
    EMlabApp.showConfirm({
      title: 'Leave class?',
      message: 'You can rejoin anytime using the class code.',
      confirmLabel: 'Leave',
      onConfirm: doLeave
    });
  }

  function doLeave() {
    clearInterval(timerInterval);
    if (localStream) { localStream.getTracks().forEach(t => t.stop()); localStream = null; }
    if (screenStream) { screenStream.getTracks().forEach(t => t.stop()); screenStream = null; }
    document.body.removeAttribute('data-in-classroom');
    activeClass = null;
    EMlabApp.goHome(true);
  }

  function getActiveClass() {
    return activeClass;
  }

  return { enter, getActiveClass, isHost: () => isHost };
})();
