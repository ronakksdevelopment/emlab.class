/*
 * classes.js - creating, joining, and managing classes and permanent
 * classrooms. All data is local to this device (see storage.js note).
 */
const EMlabClasses = (() => {

  function getClassrooms() {
    return EMlabStorage.get(EMlabStorage.KEYS.CLASSROOMS, []);
  }
  function saveClassrooms(list) {
    EMlabStorage.set(EMlabStorage.KEYS.CLASSROOMS, list);
  }
  function getRecent() {
    return EMlabStorage.get(EMlabStorage.KEYS.RECENT_CLASSES, []);
  }
  function saveRecent(list) {
    EMlabStorage.set(EMlabStorage.KEYS.RECENT_CLASSES, list.slice(0, 8));
  }
  function getActivity() {
    return EMlabStorage.get(EMlabStorage.KEYS.ACTIVITY, []);
  }
  function logActivity(text, icon = 'fa-circle-info') {
    const list = getActivity();
    list.unshift({ text, icon, ts: Date.now() });
    EMlabStorage.set(EMlabStorage.KEYS.ACTIVITY, list.slice(0, 20));
  }

  function generateUniqueCode() {
    const existingCodes = new Set([
      ...getClassrooms().map(c => c.code),
      ...getRecent().map(c => c.code)
    ]);
    let code;
    do { code = EMlabUtils.generateClassCode(); } while (existingCodes.has(code));
    return code;
  }

  function createClass({ name, type, description, permissions }) {
    const profile = EMlabProfile.get();
    const code = generateUniqueCode();
    const classData = {
      id: EMlabUtils.generateId('class'),
      code,
      name: name.trim(),
      description: (description || '').trim(),
      type, // 'instant' | 'permanent'
      hostId: profile?.id,
      hostName: profile?.displayName || 'Host',
      permissions: permissions || defaultPermissions(),
      members: [{ id: profile?.id, name: profile?.displayName || 'Host', role: 'host', avatar: profile?.avatar || null }],
      announcements: [],
      resources: [],
      createdAt: Date.now(),
      locked: false
    };

    if (type === 'permanent') {
      const rooms = getClassrooms();
      rooms.unshift(classData);
      saveClassrooms(rooms);
      logActivity(`Created classroom "${classData.name}"`, 'fa-school');
    } else {
      addToRecent(classData);
      logActivity(`Started instant class "${classData.name}"`, 'fa-bolt');
    }
    return classData;
  }

  function defaultPermissions() {
    return { mic: true, cam: true, chat: true, files: true, invite: false, screen: true };
  }

  function addToRecent(classData) {
    const recent = getRecent().filter(c => c.code !== classData.code);
    recent.unshift({
      id: classData.id, code: classData.code, name: classData.name,
      type: classData.type, joinedAt: Date.now(), hostName: classData.hostName
    });
    saveRecent(recent);
  }

  function findByCode(code) {
    const upper = (code || '').toUpperCase();
    const inClassrooms = getClassrooms().find(c => c.code === upper);
    if (inClassrooms) return inClassrooms;
    // Recent classes store only a summary, so synthesize a joinable session
    const inRecent = getRecent().find(c => c.code === upper);
    if (inRecent) {
      return {
        id: inRecent.id, code: inRecent.code, name: inRecent.name,
        type: inRecent.type, hostName: inRecent.hostName,
        permissions: defaultPermissions(), members: [], announcements: [], resources: [],
        locked: false, joinedExisting: true
      };
    }
    return null;
  }

  function joinByCode(code) {
    if (!EMlabUtils.isValidClassCode(code)) {
      return { ok: false, error: 'Please enter a valid 5 character class code.' };
    }
    const existing = findByCode(code);
    const profile = EMlabProfile.get();
    let classData;
    if (existing) {
      classData = existing;
      if (classData.locked) {
        return { ok: false, error: 'This classroom is locked by the host.' };
      }
      if (profile && !classData.members.find(m => m.id === profile.id)) {
        classData.members.push({ id: profile.id, name: profile.displayName, role: 'participant', avatar: profile.avatar });
        if (classData.type === 'permanent') {
          const rooms = getClassrooms();
          const idx = rooms.findIndex(r => r.code === classData.code);
          if (idx !== -1) { rooms[idx] = classData; saveClassrooms(rooms); }
        }
      }
    } else {
      // Unknown code in this local demo: create a lightweight joinable session
      // so the join flow is fully functional even without a backend.
      classData = {
        id: EMlabUtils.generateId('class'),
        code: code.toUpperCase(),
        name: `Class ${code.toUpperCase()}`,
        description: '',
        type: 'instant',
        hostId: 'remote_host',
        hostName: 'Class Host',
        permissions: defaultPermissions(),
        members: [{ id: profile?.id, name: profile?.displayName || 'You', role: 'participant', avatar: profile?.avatar || null }],
        announcements: [], resources: [], createdAt: Date.now(), locked: false
      };
    }
    addToRecent(classData);
    logActivity(`Joined class "${classData.name}"`, 'fa-right-to-bracket');
    return { ok: true, classData };
  }

  function getClassroomById(id) {
    return getClassrooms().find(c => c.id === id) || null;
  }

  function updateClassroom(id, updates) {
    const rooms = getClassrooms();
    const idx = rooms.findIndex(r => r.id === id);
    if (idx === -1) return null;
    rooms[idx] = { ...rooms[idx], ...updates };
    saveClassrooms(rooms);
    return rooms[idx];
  }

  function deleteClassroom(id) {
    saveClassrooms(getClassrooms().filter(r => r.id !== id));
  }

  function addAnnouncement(classroomId, text) {
    const room = getClassroomById(classroomId);
    if (!room) return null;
    const profile = EMlabProfile.get();
    room.announcements.unshift({
      id: EMlabUtils.generateId('ann'), text, author: profile?.displayName || 'Host', ts: Date.now()
    });
    updateClassroom(classroomId, { announcements: room.announcements });
    return room.announcements;
  }

  function addResource(classroomId, resource) {
    const room = getClassroomById(classroomId);
    if (!room) return null;
    room.resources.unshift(resource);
    updateClassroom(classroomId, { resources: room.resources });
    return room.resources;
  }

  return {
    getClassrooms, getRecent, getActivity, logActivity,
    createClass, joinByCode, findByCode, getClassroomById,
    updateClassroom, deleteClassroom, addAnnouncement, addResource,
    defaultPermissions
  };
})();
