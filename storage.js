// ================================================================
// storage.js  –  EchoWall / RantBox
// All data now comes from MySQL via storage_api.php
// Function signatures are IDENTICAL to the old localStorage version
// so feed.js and all other files work without changes.
// ================================================================

const Storage = (() => {

  const API = 'storage_api.php';

  // ── internal fetch helpers ────────────────────────────────
  async function get(action, params = {}) {
    const qs = new URLSearchParams({ action, ...params }).toString();
    const r  = await fetch(`${API}?${qs}`);
    return r.json();
  }
  async function post(action, data = {}) {
    const fd = new FormData();
    fd.append('action', action);
    Object.entries(data).forEach(([k, v]) => { if (v !== undefined && v !== null) fd.append(k, v); });
    const r = await fetch(API, { method: 'POST', body: fd });
    return r.json();
  }

  // ── in-memory cache (refreshed each page render) ──────────
  // Keeps sync-style callers working by caching the last fetched data.
  // Async callers use the Promise versions directly.
  const _cache = {
    users: null, rants: null, blocked: null,
    followers: {}, following: {}, theme: null,
  };

  // ── THEME ─────────────────────────────────────────────────
  function getTheme() {
    // Return cached value instantly; refresh in background
    if (_cache.theme) return _cache.theme;
    get('get_theme').then(d => { _cache.theme = d.theme || 'dark'; });
    return _cache.theme || 'dark';
  }
  function setTheme(t) {
    _cache.theme = t;
    post('update_user', { theme: t });
  }

  // ── SESSION (PHP handles this — these are no-ops) ─────────
  function getSession()    { return window.userFromPHP || null; }
  function setSession(u)   { /* PHP session handles this */ }
  function clearSession()  { window.location.href = 'index.php?logout=true'; }

  // ── USERS ─────────────────────────────────────────────────
  // Async versions (preferred)
  async function getUserByUsernameAsync(username) {
    return get('get_user', { username });
  }
  async function getUsersAsync() {
    return get('get_users');
  }
  async function updateUserAsync(username, updates) {
    return post('update_user', updates);
  }

  // Sync-style shims (return cached data or empty defaults)
  // These exist so legacy calls in feed.js don't crash.
  function getUserByUsername(username) {
    if (_cache.users) return _cache.users.find(u => u.username === username) || null;
    // trigger background load
    getUsers();
    return null;
  }
  function getUsers() {
    if (_cache.users) return _cache.users;
    getUsersAsync().then(list => { _cache.users = list || []; });
    return _cache.users || [];
  }
  function updateUser(username, updates) {
    updateUserAsync(username, updates);
    // update cache optimistically
    if (_cache.users) {
      _cache.users = _cache.users.map(u => u.username === username ? { ...u, ...updates } : u);
    }
  }
  function addUser(user) { /* handled by signup.php */ }
  function saveUsers(u)  { /* no-op */ }

  // ── RANTS ─────────────────────────────────────────────────
  async function getRantsAsync()              { return get('get_rants'); }
  async function getRantsByUserAsync(username){ return get('get_rants_by_user', { username }); }
  async function getTrendingRantsAsync()      { return get('get_trending'); }
  async function updateRantAsync(id, updates) { return post('update_rant', { rant_id: id, ...updates }); }
  async function repostAsync(rantId)          { return post('repost', { rant_id: rantId }); }

  // Sync shims
  function getRants() {
    if (_cache.rants) return _cache.rants;
    getRantsAsync().then(list => { _cache.rants = list || []; });
    return _cache.rants || [];
  }
  function getRantsByUser(username) {
    if (_cache.rantsByUser && _cache.rantsByUser[username]) return _cache.rantsByUser[username];
    if (!_cache.rantsByUser) _cache.rantsByUser = {};
    getRantsByUserAsync(username).then(list => {
      _cache.rantsByUser[username] = list || [];
      // Update rants count on profile
      const countEl = document.querySelector('.profile-stat strong');
      if (countEl) countEl.textContent = _cache.rantsByUser[username].length;
      // Re-render p-feed by dispatching event feed.js can catch
      document.dispatchEvent(new CustomEvent('storage:rants-loaded', {
        detail: { username, rants: _cache.rantsByUser[username] }
      }));
    });
    return [];
  }
  function getRantById(id) {
    return getRants().find(r => (r.rant_ID || r.id) == id) || null;
  }
  function getTrendingRants() {
    if (_cache.trending) return _cache.trending;
    getTrendingRantsAsync().then(list => { _cache.trending = list || []; });
    return _cache.trending || [];
  }
  function addRant(rant)  { /* handled by save_rant.php */ }
  function saveRants(r)   { /* no-op */ }
  function updateRant(id, updates) {
    updateRantAsync(id, updates);
    if (_cache.rants) {
      _cache.rants = _cache.rants.map(r => (r.rant_ID || r.id) == id ? { ...r, ...updates } : r);
    }
  }
  function deleteRant(id) {
    if (_cache.rants) _cache.rants = _cache.rants.filter(r => (r.rant_ID || r.id) != id);
    // actual delete handled by api/delete_rant.php
  }
  function repost(rantId, username) {
    repostAsync(rantId);
  }

  // Likes / reactions — handled by api/save_reaction.php (existing)
  function toggleLike(rantId, username)            { return []; }
  function toggleReaction(rantId, username, emoji) { return {}; }
  function getUserReaction(rantId, username)       { return null; }

  // ── FOLLOWS ───────────────────────────────────────────────
  async function getFollowersAsync(username) { return get('get_followers', { username }); }
  async function getFollowingAsync(username) { return get('get_following', { username }); }
  async function isFollowingAsync(me, target){ return get('is_following', { target }); }
  async function toggleFollowAsync(target)   { return post('toggle_follow', { target }); }
  async function getSuggestedUsersAsync()    { return get('get_suggested'); }
  async function getFollowingFeedAsync()     { return get('get_following_feed'); }

  // Sync shims
  function getFollowers(username) {
    if (_cache.followers[username]) return _cache.followers[username];
    getFollowersAsync(username).then(list => {
      _cache.followers[username] = list || [];
      // Update followers count on profile page if visible
      const el = document.querySelector('#show-followers strong');
      if (el) el.textContent = _cache.followers[username].length;
    });
    return [];
  }
  function getFollowing(username) {
    if (_cache.following[username]) return _cache.following[username];
    getFollowingAsync(username).then(list => {
      _cache.following[username] = list || [];
      // Update following count on profile page if visible
      const el = document.querySelector('#show-following strong');
      if (el) el.textContent = _cache.following[username].length;
      // Update follow button state after async load
      _updateFollowButton(username);
    });
    return [];
  }
  function isFollowing(me, target) {
    if (_cache.following[me]) return _cache.following[me].includes(target);
    // Async load + update follow button when ready
    getFollowingAsync(me).then(list => {
      _cache.following[me] = list || [];
      _updateFollowButton(me);
    });
    return false;
  }
  function _updateFollowButton(me) {
    const followBtn = document.querySelector('#follow-btn');
    if (!followBtn) return;
    // Get the profile username from the page header
    const hdr = document.querySelector('.page-hdr h2');
    if (!hdr) return;
    const profileUser = hdr.textContent.replace('@', '').trim();
    if (!profileUser || profileUser === me) return;
    const nowFollowing = (_cache.following[me] || []).includes(profileUser);
    followBtn.textContent = nowFollowing ? 'Following' : 'Follow';
    followBtn.classList.toggle('following', nowFollowing);
  }
  function follow(me, target) {
    // cache only — DB call handled by toggleFollow
    if (!(_cache.following[me] || []).includes(target)) {
      _cache.following[me] = [...(getFollowing(me)), target];
    }
    if (!(_cache.followers[target] || []).includes(me)) {
      _cache.followers[target] = [...(getFollowers(target)), me];
    }
  }
  function unfollow(me, target) {
    // cache only — DB call handled by toggleFollow
    if (_cache.following[me]) _cache.following[me] = _cache.following[me].filter(u => u !== target);
    if (_cache.followers[target]) _cache.followers[target] = _cache.followers[target].filter(u => u !== me);
  }
  function toggleFollow(me, target) {
    const nowFollowing = !isFollowing(me, target);
    if (nowFollowing) follow(me, target); else unfollow(me, target);
    post('toggle_follow', { target }); // single DB call
    _cache.suggested = null; // refresh suggested list
    return nowFollowing;
  }
  function getFollowingFeed(username) {
    return getRants().filter(r => getFollowing(username).includes(r.username));
  }
  function getSuggestedUsers(username) {
    if (_cache.suggested) return _cache.suggested;
    getSuggestedUsersAsync().then(list => { _cache.suggested = list || []; });
    return _cache.suggested || [];
  }

  // ── NOTIFICATIONS ─────────────────────────────────────────
  async function getNotificationsAsync(username) { return get('get_notifications'); }
  async function getUnreadCountAsync(username)   { return get('get_unread_notif_count'); }

  function getNotifications(username) {
    if (_cache.notifications) return _cache.notifications;
    // First call: fetch from DB, then re-render the notifications page
    getNotificationsAsync(username).then(list => {
      _cache.notifications = list || [];
      // Re-render notifications page once data arrives
      const c = document.getElementById('center');
      if (c && c.querySelector('.page-hdr h2')?.textContent === 'Notifications') {
        // Trigger re-render by dispatching a custom event feed.js can listen to,
        // or directly re-populate the notification items
        _renderNotificationsInto(c, username);
      }
    });
    return [];
  }

  // Internal helper: re-renders notification list into container
  function _renderNotificationsInto(c, username) {
    const notifs = _cache.notifications || [];
    // Remove old items (keep header)
    c.querySelectorAll('.notif-item, .empty').forEach(el => el.remove());
    // Update clear button visibility
    const existingClear = c.querySelector('#clear-notifs');
    if (!existingClear && notifs.length) {
      const hdr = c.querySelector('.page-hdr');
      if (hdr) {
        const btn = document.createElement('button');
        btn.className = 'btn btn-ghost btn-sm'; btn.id = 'clear-notifs';
        btn.style.marginLeft = 'auto'; btn.textContent = 'Clear all';
        btn.addEventListener('click', () => { clearNotifications(username); _renderNotificationsInto(c, username); });
        hdr.appendChild(btn);
      }
    }
    if (!notifs.length) {
      const empty = document.createElement('div');
      empty.className = 'empty';
      empty.innerHTML = '<div class="e-icon">🔔</div><p>Nothing here yet.</p>';
      c.appendChild(empty); return;
    }
    notifs.forEach(n => {
      const icon = n.type === 'like' ? '❤️' : n.type === 'comment' ? '💬' : n.type === 'follow' ? '👤' : n.type === 'repost' ? '🔁' : n.type === 'reaction' ? '😊' : '📢';
      const froms = n.froms || [n.from_user];
      const names = froms.length === 1 ? `@${froms[0]}` :
        froms.length === 2 ? `@${froms[0]} and @${froms[1]}` :
        `@${froms[0]} and ${froms.length - 1} others`;
      const el = document.createElement('div');
      el.className = 'notif-item' + (n.read ? '' : ' unread');
      el.innerHTML = `<div class="notif-icon">${icon}</div>
        <div>
          <div class="notif-text"><strong>${names}</strong> ${n.message || ''}</div>
          <div class="notif-time">${n.created_at || ''}</div>
        </div>`;
      if (froms[0]) el.addEventListener('click', () => {
        // navigate to user profile — use feed.js render if available
        if (typeof render === 'function') render('userprofile', { username: froms[0] });
      });
      c.appendChild(el);
    });
  }
  function addNotification(notif) {
    post('add_notification', {
      to:      notif.to,
      type:    notif.type,
      message: notif.message,
      rant_id: notif.rantId || null,
    });
  }
  function markNotificationsRead(username) {
    post('mark_notifications_read');
    if (_cache.notifications) _cache.notifications = _cache.notifications.map(n => ({ ...n, read: true }));
  }
  function clearNotifications(username) {
    post('clear_notifications');
    _cache.notifications = [];
  }
  function getUnreadCount(username) {
    if (_cache.unreadNotif !== undefined) return _cache.unreadNotif;
    getUnreadCountAsync(username).then(d => {
      _cache.unreadNotif = d.count || 0;
      ['notif-dot','notif-dot-bn'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.toggle('show', _cache.unreadNotif > 0);
      });
      ['notif-num','notif-num-bn'].forEach(id => {
        const el = document.getElementById(id);
        if (el) { el.classList.toggle('show', _cache.unreadNotif > 0); el.textContent = _cache.unreadNotif || ''; }
      });
    });
    return 0;
  }

  // ── MESSAGES ──────────────────────────────────────────────
  async function getInboxUsersAsync()             { return get('get_inbox'); }
  async function getConversationAsync(other)      { return get('get_conversation', { with: other }); }
  async function getLastMessageAsync(other)       { return get('get_last_message', { with: other }); }
  async function getUnreadMessagesAsync()         { return get('get_unread_msg_count'); }

  function getInboxUsers(username) {
    if (_cache.inbox) return _cache.inbox;
    getInboxUsersAsync().then(list => { _cache.inbox = list || []; });
    return _cache.inbox || [];
  }
  function getConversation(userA, userB) {
    const key = [userA, userB].sort().join(':');
    if (_cache.conversations && _cache.conversations[key]) return _cache.conversations[key];
    if (!_cache.conversations) _cache.conversations = {};
    getConversationAsync(userA === window.userFromPHP?.username ? userB : userA)
      .then(list => { _cache.conversations[key] = list || []; });
    return _cache.conversations[key] || [];
  }
  function sendMessage(msg) {
    post('send_message', { to: msg.to, text: msg.text });
    // optimistic cache update
    const key = [msg.from, msg.to].sort().join(':');
    if (_cache.conversations && _cache.conversations[key]) {
      _cache.conversations[key].push(msg);
    }
    _cache.inbox = null; // invalidate
  }
  function getLastMessage(userA, userB) {
    const conv = getConversation(userA, userB);
    return conv[conv.length - 1] || null;
  }
  function getUnreadMessages(username) {
    if (_cache.unreadMsg !== undefined) return _cache.unreadMsg;
    getUnreadMessagesAsync().then(d => { _cache.unreadMsg = d.count || 0; });
    return _cache.unreadMsg || 0;
  }
  function markMessagesRead(from, to) {
    post('mark_messages_read', { from });
    _cache.unreadMsg = 0;
  }

  // ── BLOCKS ────────────────────────────────────────────────
  function getBlockedUsers(username) {
    if (_cache.blocked) return _cache.blocked;
    get('get_blocked').then(list => { _cache.blocked = list || []; });
    return _cache.blocked || [];
  }
  function blockUser(me, target) {
    post('block_user', { target });
    _cache.blocked = [...(getBlockedUsers(me)), target];
    _cache.following[me]     = (getFollowing(me)).filter(u => u !== target);
    _cache.followers[target] = (getFollowers(target)).filter(u => u !== me);
  }
  function unblockUser(me, target) {
    post('unblock_user', { target });
    if (_cache.blocked) _cache.blocked = _cache.blocked.filter(u => u !== target);
  }
  function isBlocked(me, target) {
    return getBlockedUsers(me).includes(target);
  }

  // ── REPORTS ───────────────────────────────────────────────
  // These are handled by report_rant.php already
  function addReport(report)    { /* handled by report_rant.php */ }
  function getReports()         { return []; }
  function getPendingReports()  { return []; }
  function resolveReport(id)    { /* handled by admin.php */ }
  function dismissReport(id)    { /* handled by admin.php */ }

  // ── COMMENTS (already PHP, just keep shims) ───────────────
  function getComments()                { return []; }
  function addComment(c)                { /* handled by save_comment.php */ }
  function getCommentsByRant(rantId)    { return []; }
  function getRepliesByComment(id)      { return []; }
  function deleteComment(id)            { /* handled by delete_comment.php */ }
  function deleteCommentsByRant(rantId) { /* handled by delete_rant.php */ }
  function toggleCommentLike(id, u)     { return []; }
  function getCommentCount(rantId)      { return 0; }

  // ── cache invalidation helpers ────────────────────────────
  function invalidateRants()  { _cache.rants = null; _cache.trending = null; }
  function invalidateUsers()  { _cache.users = null; _cache.suggested = null; }
  function invalidateFollow() { _cache.followers = {}; _cache.following = {}; _cache.suggested = null; }
  function invalidateNotifs() { _cache.notifications = null; _cache.unreadNotif = undefined; }
  function invalidateMsgs()   { _cache.inbox = null; _cache.conversations = null; _cache.unreadMsg = undefined; }

  // ── public API (identical surface to old Storage) ─────────
  return {
    // users
    getUsers, saveUsers, getUserByUsername, addUser, updateUser,
    getUserByUsernameAsync, getUsersAsync, updateUserAsync,
    // rants
    getRants, saveRants, addRant, getRantById, updateRant, deleteRant, getRantsByUser,
    toggleLike, toggleReaction, getUserReaction, repost, getTrendingRants,
    getRantsAsync, getRantsByUserAsync, getTrendingRantsAsync, repostAsync,
    // comments
    getComments, addComment, getCommentsByRant, getRepliesByComment,
    deleteComment, deleteCommentsByRant, toggleCommentLike, getCommentCount,
    // notifications
    addNotification, getNotifications, markNotificationsRead, clearNotifications, getUnreadCount,
    getNotificationsAsync,
    // messages
    sendMessage, getConversation, getInboxUsers, getUnreadMessages, markMessagesRead, getLastMessage,
    getInboxUsersAsync, getConversationAsync, getLastMessageAsync,
    // follows
    getFollowers, getFollowing, isFollowing, follow, unfollow, toggleFollow,
    getFollowingFeed, getSuggestedUsers,
    getFollowersAsync, getFollowingAsync, toggleFollowAsync, getSuggestedUsersAsync,
    // reports
    addReport, resolveReport, dismissReport, getPendingReports, getReports,
    // blocks
    getBlockedUsers, blockUser, unblockUser, isBlocked,
    // theme
    getTheme, setTheme,
    // session
    getSession, setSession, clearSession,
    // cache helpers
    invalidateRants, invalidateUsers, invalidateFollow, invalidateNotifs, invalidateMsgs,
  };
})();

// ── Profile rants lazy loader ──────────────────────────────
// Listens for rants loaded from DB and rebuilds the profile feed
document.addEventListener('storage:rants-loaded', function(e) {
  const { username, rants } = e.detail;
  const pFeed = document.getElementById('p-feed');
  if (!pFeed) return;

  // Only act if we're on this user's profile page
  const hdr = document.querySelector('.page-hdr h2');
  const pageUser = hdr ? hdr.textContent.replace('@','').trim() : '';
  const isProfilePage = (pageUser === username || pageUser === 'Profile');
  if (!isProfilePage) return;

  // Clear empty state
  pFeed.innerHTML = '';

  if (!rants.length) {
    pFeed.innerHTML = '<div class="empty"><div class="e-icon">🤐</div><p>No rants yet.</p></div>';
    return;
  }

  const me = window.userFromPHP?.username;
  const isMe = username === me;
  const blocked = Storage.getBlockedUsers(me);

  rants
    .filter(r => !blocked.includes(r.username))
    .forEach(r => {
      // buildCard is defined in feed.js — call it if available
      if (typeof buildCard === 'function') {
        pFeed.appendChild(buildCard(r, !isMe));
      } else {
        // Fallback: simple text card
        const card = document.createElement('div');
        card.className = 'post-card';
        card.innerHTML = `<div class="post-right">
          <div class="post-text">${r.content || ''}</div>
          <div class="post-time">${r.created_at || ''}</div>
        </div>`;
        pFeed.appendChild(card);
      }
    });
});