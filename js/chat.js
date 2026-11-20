/*
 * chat.js - classroom chat panel: messages, file uploads, pinned
 * messages. Messages are local to this device's session only; see the
 * honesty note in classroom.js about no real time sync between devices.
 */
const EMlabChat = (() => {
  let messages = [];
  let pinned = null;
  let classRef = null;

  function init(classData) {
    classRef = classData;
    messages = [];
    pinned = null;
    render();
    bind();
  }

  function bind() {
    document.getElementById('chatSendBtn').onclick = sendFromInput;
    document.getElementById('chatInput').onkeydown = (e) => {
      if (e.key === 'Enter') sendFromInput();
    };
    document.getElementById('chatFileBtn').onclick = () => document.getElementById('chatFileInput').click();
    document.getElementById('chatFileInput').onchange = handleFile;
  }

  function sendFromInput() {
    const input = document.getElementById('chatInput');
    const text = input.value.trim();
    if (!text) return;
    addMessage({ type: 'text', text });
    input.value = '';
  }

  async function handleFile(e) {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 8 * 1024 * 1024) {
      EMlabToast.show('File too large for this local demo (max 8 MB).', 'error');
      return;
    }
    try {
      const dataUrl = await EMlabUtils.readFileAsDataUrl(file);
      addMessage({ type: 'file', fileName: file.name, fileSize: file.size, fileUrl: dataUrl, isImage: file.type.startsWith('image/') });
    } catch (err) {
      EMlabToast.show('Could not attach that file.', 'error');
    }
    e.target.value = '';
  }

  function addMessage(payload) {
    const profile = EMlabProfile.get();
    const msg = {
      id: EMlabUtils.generateId('msg'),
      author: profile?.displayName || 'You',
      ts: Date.now(),
      isMe: true,
      ...payload
    };
    messages.push(msg);
    render();
  }

  function pinMessage(id) {
    pinned = messages.find(m => m.id === id) || null;
    renderPinned();
  }

  function render() {
    const wrap = document.getElementById('chatMessages');
    wrap.innerHTML = messages.map(m => `
      <div class="chat-msg ${m.isMe ? 'me' : ''}">
        <div class="chat-msg-head">
          <span class="chat-msg-name">${EMlabUtils.escapeHtml(m.author)}</span>
          <span class="chat-msg-time">${EMlabUtils.formatTime(m.ts)}</span>
        </div>
        <div class="chat-msg-body">
          ${m.type === 'file'
            ? fileMsgHtml(m)
            : EMlabUtils.escapeHtml(m.text)}
        </div>
      </div>
    `).join('') || '<p class="empty-hint" style="color:rgba(255,255,255,0.5);background:transparent;border-color:rgba(255,255,255,0.15)">No messages yet. Say hello!</p>';
    wrap.scrollTop = wrap.scrollHeight;
  }

  function fileMsgHtml(m) {
    if (m.isImage) {
      return `<a href="${m.fileUrl}" download="${EMlabUtils.escapeHtml(m.fileName)}"><img src="${m.fileUrl}" alt="${EMlabUtils.escapeHtml(m.fileName)}" style="max-width:180px;border-radius:8px;"></a>`;
    }
    return `<a class="chat-msg-file" href="${m.fileUrl}" download="${EMlabUtils.escapeHtml(m.fileName)}"><i class="fa-solid fa-file-arrow-down"></i> ${EMlabUtils.escapeHtml(m.fileName)}</a>`;
  }

  function renderPinned() {
    const el = document.getElementById('chatPinned');
    if (!pinned) { el.hidden = true; return; }
    el.hidden = false;
    el.innerHTML = `<i class="fa-solid fa-thumbtack"></i> <strong>${EMlabUtils.escapeHtml(pinned.author)}:</strong> ${EMlabUtils.escapeHtml(pinned.text || pinned.fileName)}`;
  }

  return { init, addMessage, pinMessage };
})();
