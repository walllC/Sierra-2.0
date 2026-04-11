const Storage = (() => {
  const KEYS = {
    USERS:         'rb_users',
    RANTS:         'rb_rants',
    SESSION:       'rb_session',
    COMMENTS:      'rb_comments',
    NOTIFICATIONS: 'rb_notifications',
    MESSAGES:      'rb_messages',
    REPORTS:       'rb_reports',
    THEME:         'rb_theme',
  };

  // ── Users ──────────────────────────────────────────
  function getUsers() { return JSON.parse(localStorage.getItem(KEYS.USERS) || '[]'); }
  function saveUsers(u) { localStorage.setItem(KEYS.USERS, JSON.stringify(u)); }
  function getUserByUsername(username) { return getUsers().find(u => u.username === username) || null; }
  function addUser(user) { const u = getUsers(); u.push(user); saveUsers(u); }
  function updateUser(username, updates) {
    saveUsers(getUsers().map(u => u.username === username ? { ...u, ...updates } : u));
  }

  // ── Rants ──────────────────────────────────────────
  function getRants() { return JSON.parse(localStorage.getItem(KEYS.RANTS) || '[]'); }
  function saveRants(r) { localStorage.setItem(KEYS.RANTS, JSON.stringify(r)); }
  function addRant(rant) { const r = getRants(); r.unshift(rant); saveRants(r); }
  function getRantById(id) { return getRants().find(r => r.id === id) || null; }
  function updateRant(id, updates) {
    saveRants(getRants().map(r => r.id === id ? { ...r, ...updates } : r));
  }
  function deleteRant(id) { saveRants(getRants().filter(r => r.id !== id)); }
  function getRantsByUser(username) { return getRants().filter(r => r.username === username); }
  function toggleLike(rantId, username) {
    const rants = getRants();
    const rant  = rants.find(r => r.id === rantId);
    if (!rant) return [];
    if (!rant.likes) rant.likes = [];
    const idx = rant.likes.indexOf(username);
    if (idx === -1) rant.likes.push(username);
    else rant.likes.splice(idx, 1);
    saveRants(rants);
    return rant.likes;
  }
  function toggleReaction(rantId, username, emoji) {
    const rants = getRants();
    const rant  = rants.find(r => r.id === rantId);
    if (!rant) return {};
    if (!rant.reactions) rant.reactions = {};
    const prev = getUserReaction(rantId, username);
    Object.keys(rant.reactions).forEach(e => {
      rant.reactions[e] = (rant.reactions[e]||[]).filter(u => u !== username);
    });
    if (prev !== emoji) {
      if (!rant.reactions[emoji]) rant.reactions[emoji] = [];
      rant.reactions[emoji].push(username);
    }
    saveRants(rants);
    return rant.reactions;
  }
  function getUserReaction(rantId, username) {
    const rant = getRantById(rantId);
    if (!rant || !rant.reactions) return null;
    for (const [emoji, users] of Object.entries(rant.reactions)) {
      if ((users||[]).includes(username)) return emoji;
    }
    return null;
  }
  function repost(rantId, username) {
    const original = getRantById(rantId);
    if (!original) return null;
    const newRant = {
      id:        Date.now().toString(36) + Math.random().toString(36).slice(2,6),
      username,
      content:   original.content,
      createdAt: new Date().toISOString(),
      updatedAt: null,
      likes:     [],
      reactions: {},
      repostOf:  { username: original.anonymous ? 'Anonymous' : original.username, id: original.id },
    };
    addRant(newRant);
    return newRant;
  }
  function getTrendingRants() {
    const cutoff = Date.now() - 86400000;
    return getRants()
      .filter(r => new Date(r.createdAt).getTime() >= cutoff)
      .sort((a,b) => ((b.likes||[]).length+(Object.values(b.reactions||{}).flat().length)) -
                     ((a.likes||[]).length+(Object.values(a.reactions||{}).flat().length)))
      .slice(0, 8);
  }

  // ── Comments ───────────────────────────────────────
  function getComments() { return JSON.parse(localStorage.getItem(KEYS.COMMENTS) || '[]'); }
  function saveComments(c) { localStorage.setItem(KEYS.COMMENTS, JSON.stringify(c)); }
  function addComment(comment) { const c = getComments(); c.push(comment); saveComments(c); }
  function getCommentsByRant(rantId) {
    return getComments().filter(c => c.rantId === rantId && !c.parentId);
  }
  function getRepliesByComment(commentId) {
    return getComments().filter(c => c.parentId === commentId);
  }
  function deleteComment(id) {
    saveComments(getComments().filter(c => c.id !== id && c.parentId !== id));
  }
  function deleteCommentsByRant(rantId) {
    saveComments(getComments().filter(c => c.rantId !== rantId));
  }
  function toggleCommentLike(commentId, username) {
    const all = getComments();
    const cm  = all.find(c => c.id === commentId);
    if (!cm) return [];
    if (!cm.likes) cm.likes = [];
    const idx = cm.likes.indexOf(username);
    if (idx === -1) cm.likes.push(username);
    else cm.likes.splice(idx, 1);
    saveComments(all);
    return cm.likes;
  }
  function getCommentCount(rantId) {
    return getComments().filter(c => c.rantId === rantId).length;
  }

  // ── Notifications (grouped) ────────────────────────
  function getNotifications(username) {
    const all = JSON.parse(localStorage.getItem(KEYS.NOTIFICATIONS) || '[]')
      .filter(n => n.to === username).reverse();
    const groups = [];
    all.forEach(n => {
      const g = groups.find(x =>
        x.type === n.type && x.rantId === n.rantId &&
        (Date.now() - new Date(x.createdAt).getTime()) < 3600000
      );
      if (g) { if (!g.froms.includes(n.from)) g.froms.push(n.from); if (!n.read) g.read = false; }
      else groups.push({ ...n, froms: [n.from] });
    });
    return groups;
  }
  function addNotification(notif) {
    const all = JSON.parse(localStorage.getItem(KEYS.NOTIFICATIONS) || '[]');
    all.push({ ...notif, id: Date.now().toString(36)+Math.random().toString(36).slice(2,5), createdAt: new Date().toISOString(), read: false });
    localStorage.setItem(KEYS.NOTIFICATIONS, JSON.stringify(all));
  }
  function markNotificationsRead(username) {
    const all = JSON.parse(localStorage.getItem(KEYS.NOTIFICATIONS) || '[]')
      .map(n => n.to === username ? { ...n, read: true } : n);
    localStorage.setItem(KEYS.NOTIFICATIONS, JSON.stringify(all));
  }
  function clearNotifications(username) {
    localStorage.setItem(KEYS.NOTIFICATIONS,
      JSON.stringify(JSON.parse(localStorage.getItem(KEYS.NOTIFICATIONS)||'[]').filter(n => n.to !== username)));
  }
  function getUnreadCount(username) {
    return getNotifications(username).filter(n => !n.read).length;
  }

  // ── Messages ───────────────────────────────────────
  function getMessages() { return JSON.parse(localStorage.getItem(KEYS.MESSAGES) || '[]'); }
  function saveMessages(m) { localStorage.setItem(KEYS.MESSAGES, JSON.stringify(m)); }
  function sendMessage(msg) { const m = getMessages(); m.push(msg); saveMessages(m); }
  function getConversation(userA, userB) {
    return getMessages().filter(m =>
      (m.from === userA && m.to === userB) || (m.from === userB && m.to === userA)
    );
  }
  function getInboxUsers(username) {
    const msgs = getMessages().filter(m => m.from === username || m.to === username);
    const others = new Set(msgs.map(m => m.from === username ? m.to : m.from));
    return [...others];
  }
  function getUnreadMessages(username) {
    return getMessages().filter(m => m.to === username && !m.read).length;
  }
  function markMessagesRead(from, to) {
    saveMessages(getMessages().map(m =>
      m.from === from && m.to === to ? { ...m, read: true } : m
    ));
  }
  function getLastMessage(userA, userB) {
    const conv = getConversation(userA, userB);
    return conv[conv.length-1] || null;
  }

  // ── Follows ────────────────────────────────────────
  function getFollowers(username) { const u=getUserByUsername(username); return u?(u.followers||[]):[];}
  function getFollowing(username) { const u=getUserByUsername(username); return u?(u.following||[]):[];}
  function isFollowing(me,target) { return getFollowing(me).includes(target); }
  function follow(me,target) {
    const mf=getFollowing(me); if(!mf.includes(target)) updateUser(me,{following:[...mf,target]});
    const tf=getFollowers(target); if(!tf.includes(me)) updateUser(target,{followers:[...tf,me]});
  }
  function unfollow(me,target) {
    updateUser(me,{following:getFollowing(me).filter(u=>u!==target)});
    updateUser(target,{followers:getFollowers(target).filter(u=>u!==me)});
  }
  function toggleFollow(me,target) {
    if(isFollowing(me,target)){unfollow(me,target);return false;}
    follow(me,target);return true;
  }
  function getFollowingFeed(username) {
    return getRants().filter(r=>getFollowing(username).includes(r.username));
  }
  function getSuggestedUsers(username) {
    const myF=getFollowing(username);
    return getUsers()
      .filter(u=>u.username!==username&&u.role!=='admin'&&u.status==='active'&&!myF.includes(u.username)&&!isBlocked(username,u.username))
      .map(u=>({...u,mutuals:getFollowers(u.username).filter(f=>getFollowers(username).includes(f)).length}))
      .sort((a,b)=>b.mutuals-a.mutuals).slice(0,5);
  }

  // ── Reports ────────────────────────────────────────
  function getReports() { return JSON.parse(localStorage.getItem(KEYS.REPORTS)||'[]'); }
  function saveReports(r) { localStorage.setItem(KEYS.REPORTS, JSON.stringify(r)); }
  function addReport(report) {
    const r=getReports();
    r.push({...report,id:Date.now().toString(36),createdAt:new Date().toISOString(),status:'pending'});
    saveReports(r);
  }
  function resolveReport(id) { saveReports(getReports().map(r=>r.id===id?{...r,status:'resolved'}:r)); }
  function dismissReport(id) { saveReports(getReports().map(r=>r.id===id?{...r,status:'dismissed'}:r)); }
  function getPendingReports() { return getReports().filter(r=>r.status==='pending'); }

  // ── Blocks ─────────────────────────────────────────
  function getBlockedUsers(username) { const u=getUserByUsername(username); return u?(u.blocked||[]):[];}
  function blockUser(me,target) {
    const b=getBlockedUsers(me);
    if(!b.includes(target)) updateUser(me,{blocked:[...b,target]});
    unfollow(me,target); unfollow(target,me);
  }
  function unblockUser(me,target) {
    updateUser(me,{blocked:getBlockedUsers(me).filter(u=>u!==target)});
  }
  function isBlocked(me,target) { return getBlockedUsers(me).includes(target); }

  // ── Theme ──────────────────────────────────────────
  function getTheme() { return localStorage.getItem(KEYS.THEME)||'dark'; }
  function setTheme(t) { localStorage.setItem(KEYS.THEME,t); }

  // ── Session ────────────────────────────────────────
  function getSession() { return JSON.parse(sessionStorage.getItem(KEYS.SESSION)||'null'); }
  function setSession(u) { sessionStorage.setItem(KEYS.SESSION,JSON.stringify(u)); }
  function clearSession() { sessionStorage.removeItem(KEYS.SESSION); }

  return {
    getUsers,saveUsers,getUserByUsername,addUser,updateUser,
    getRants,saveRants,addRant,getRantById,updateRant,deleteRant,getRantsByUser,
    toggleLike,toggleReaction,getUserReaction,repost,getTrendingRants,
    getComments,addComment,getCommentsByRant,getRepliesByComment,deleteComment,
    deleteCommentsByRant,toggleCommentLike,getCommentCount,
    addNotification,getNotifications,markNotificationsRead,clearNotifications,getUnreadCount,
    sendMessage,getConversation,getInboxUsers,getUnreadMessages,markMessagesRead,getLastMessage,
    getFollowers,getFollowing,isFollowing,follow,unfollow,toggleFollow,getFollowingFeed,getSuggestedUsers,
    addReport,resolveReport,dismissReport,getPendingReports,getReports,
    getBlockedUsers,blockUser,unblockUser,isBlocked,
    getTheme,setTheme,
    getSession,setSession,clearSession,
  };
})();