// ================================================================
// storage.js  –  EchoWall / RantBox
//
// PURPOSE:
//   Acts as the single data-access layer for the entire front-end.
//   All persistent data (users, rants, follows, messages, etc.) now
//   lives in a MySQL database and is reached through storage_api.php.
//
// DESIGN PATTERN:
//   This module replaces the old localStorage-based Storage object.
//   It exposes an IDENTICAL public API so that feed.js and all other
//   existing files continue to work without any modifications.
//
//   Because the original callers were written synchronously, two
//   layers are provided for most features:
//     • Async functions  – return Promises; preferred for new code.
//     • Sync "shims"     – return cached data instantly (may be
//                          stale/empty on first call) and trigger a
//                          background fetch to populate the cache.
// ================================================================

const Storage = (() => {

  // ── API endpoint ─────────────────────────────────────────
  // All HTTP calls go to this single PHP gateway script.
  const API = 'storage_api.php';

  // ── Internal fetch helpers ────────────────────────────────
  // These two private functions are the only place that talks to
  // the network. Every other function in this module calls one of them.

  /**
   * Sends a GET request to storage_api.php.
   * @param {string} action - The API action name (maps to a PHP handler).
   * @param {Object} params - Extra query-string parameters.
   * @returns {Promise<any>} Parsed JSON response from the server.
   */
  async function get(action, params = {}) {
    // Merge `action` with any extra params and build a query string.
    const qs = new URLSearchParams({ action, ...params }).toString();
    const r  = await fetch(`${API}?${qs}`);
    return r.json();
  }

  /**
   * Sends a POST request to storage_api.php using FormData.
   * FormData is used so PHP can read values from $_POST easily.
   * @param {string} action - The API action name.
   * @param {Object} data   - Key/value pairs to send as form fields.
   * @returns {Promise<any>} Parsed JSON response from the server.
   */
  async function post(action, data = {}) {
    const fd = new FormData();
    fd.append('action', action);
    // Skip null/undefined values to keep the request clean.
    Object.entries(data).forEach(([k, v]) => {
      if (v !== undefined && v !== null) fd.append(k, v);
    });
    const r = await fetch(API, { method: 'POST', body: fd });
    return r.json();
  }

  // ── In-memory cache ───────────────────────────────────────
  // Stores the most recently fetched data so synchronous callers
  // (legacy shims) can return something immediately without waiting
  // for a network round-trip. Each key is populated lazily—only when
  // the relevant getter is called for the first time.
  //
  // Invalidation helpers (invalidateRants, etc.) at the bottom reset
  // these to null/empty so the next call fetches fresh data.
  const _cache = {
    users:         null,  // Array of all user objects
    rants:         null,  // Array of all rant objects (global feed)
    blocked:       null,  // Array of usernames the current user has blocked
    followers:     {},    // Map of username → array of follower usernames
    following:     {},    // Map of username → array of following usernames
    theme:         null,  // Current user's UI theme string ('dark' | 'light')
  };


  // ══════════════════════════════════════════════════════════
  // THEME
  // Manages the current user's colour-scheme preference.
  // The value is stored in the DB (via update_user) so it persists
  // across devices/sessions.
  // ══════════════════════════════════════════════════════════

  /**
   * Returns the current UI theme ('dark' by default).
   * Synchronous: returns the cached value immediately; if the cache
   * is empty it triggers a background fetch and returns 'dark' in the
   * meantime so the UI doesn't flash unstyled.
   */
  function getTheme() {
    if (_cache.theme) return _cache.theme;
    // Kick off async fetch; result stored in cache for next call.
    get('get_theme').then(d => { _cache.theme = d.theme || 'dark'; });
    return _cache.theme || 'dark';
  }

  /**
   * Updates the theme both locally (cache) and in the database.
   * @param {string} t - Theme name, e.g. 'dark' or 'light'.
   */
  function setTheme(t) {
    _cache.theme = t;                    // Update cache instantly for responsive UI.
    post('update_user', { theme: t });   // Persist to DB in the background.
  }


  // ══════════════════════════════════════════════════════════
  // SESSION
  // Authentication is managed entirely by PHP sessions, so these
  // client-side functions are mostly no-ops or thin wrappers.
  // window.userFromPHP is injected by PHP into the page on load.
  // ══════════════════════════════════════════════════════════

  /**
   * Returns the currently logged-in user object, or null if not logged in.
   * The value comes from window.userFromPHP, which PHP writes into
   * a <script> tag when rendering the page.
   */
  function getSession()   { return window.userFromPHP || null; }

  /**
   * No-op: PHP session handles login state, not JS.
   * Kept for API compatibility with the old localStorage version.
   */
  function setSession(u)  { /* PHP session handles this */ }

  /**
   * Logs the user out by redirecting to index.php?logout=true,
   * which destroys the PHP session server-side.
   */
  function clearSession() { window.location.href = 'index.php?logout=true'; }


  // ══════════════════════════════════════════════════════════
  // USERS
  // Two tiers:
  //   Async  – direct DB calls, return Promises.
  //   Sync   – return cached data; trigger background fetches on miss.
  // ══════════════════════════════════════════════════════════

  // ── Async versions (preferred for new code) ───────────────

  /**
   * Fetches a single user record by username from the DB.
   * @param {string} username
   * @returns {Promise<Object>} User object.
   */
  async function getUserByUsernameAsync(username) {
    return get('get_user', { username });
  }

  /**
   * Fetches all user records from the DB.
   * @returns {Promise<Array>} Array of user objects.
   */
  async function getUsersAsync() {
    return get('get_users');
  }

  /**
   * Persists arbitrary field updates for the current user.
   * @param {string} username - Ignored (PHP uses the session to identify the user).
   * @param {Object} updates  - Fields to update (e.g. { bio: 'hello' }).
   * @returns {Promise<any>}
   */
  async function updateUserAsync(username, updates) {
    return post('update_user', updates);
  }

  // ── Sync shims (legacy compatibility) ─────────────────────

  /**
   * Synchronous lookup by username against the local cache.
   * Returns null on a cache miss and triggers a background load.
   * Legacy callers that can't await should use this; new callers
   * should prefer getUserByUsernameAsync().
   */
  function getUserByUsername(username) {
    if (_cache.users) return _cache.users.find(u => u.username === username) || null;
    getUsers(); // Trigger background fetch to warm the cache.
    return null;
  }

  /**
   * Returns the full user list from cache, or an empty array while
   * the async fetch is in flight.
   */
  function getUsers() {
    if (_cache.users) return _cache.users;
    getUsersAsync().then(list => { _cache.users = list || []; });
    return _cache.users || [];
  }

  /**
   * Applies updates to the DB and optimistically patches the local
   * cache so the UI reflects changes immediately.
   * @param {string} username - The user to update.
   * @param {Object} updates  - Fields to merge into the user object.
   */
  function updateUser(username, updates) {
    updateUserAsync(username, updates);
    // Optimistic update: patch the cached entry so callers see the
    // new values right away without waiting for a round-trip.
    if (_cache.users) {
      _cache.users = _cache.users.map(u =>
        u.username === username ? { ...u, ...updates } : u
      );
    }
  }

  // No-ops: user creation and persistence are handled server-side.
  function addUser(user) { /* Handled by signup.php */ }
  function saveUsers(u)  { /* No-op – DB is the source of truth */ }


  // ══════════════════════════════════════════════════════════
  // RANTS
  // Core content objects. Same two-tier pattern as Users.
  // Actual creation is handled by save_rant.php (form POST).
  // Deletion is handled by api/delete_rant.php.
  // ══════════════════════════════════════════════════════════

  // ── Async versions ────────────────────────────────────────

  /** Fetches all rants for the global feed. */
  async function getRantsAsync()               { return get('get_rants'); }

  /** Fetches all rants authored by a specific user. */
  async function getRantsByUserAsync(username) { return get('get_rants_by_user', { username }); }

  /** Fetches all archived rants for the current user. */
  async function getArchivedRantsAsync()        { return get('get_archived_rants'); }

  /** Fetches the trending rants list (server calculates trending score). */
  async function getTrendingRantsAsync()       { return get('get_trending'); }

  /**
   * Updates fields on a rant record (e.g. like count after a reaction).
   * @param {number|string} id      - Rant ID.
   * @param {Object}        updates - Fields to update.
   */
  async function updateRantAsync(id, updates)  { return post('update_rant', { rant_id: id, ...updates }); }

  /**
   * Creates a repost of the given rant for the current user.
   * @param {number|string} rantId
   */
  async function repostAsync(rantId)           { return post('repost', { rant_id: rantId }); }

  // ── Sync shims ────────────────────────────────────────────

  /**
   * Returns all rants from cache, kicking off a background fetch on miss.
   * Used by legacy synchronous callers in feed.js.
   */
  function getRants() {
    if (_cache.rants) return _cache.rants;
    getRantsAsync().then(list => { _cache.rants = list || []; });
    return _cache.rants || [];
  }

  /**
   * Returns rants for a specific user's profile page.
   * Because the DB call is async, this method:
   *   1. Returns an empty array immediately.
   *   2. When data arrives, updates the rant-count UI element.
   *   3. Fires a 'storage:rants-loaded' CustomEvent so the profile
   *      feed listener at the bottom of this file can re-render.
   */
  function getRantsByUser(username) {
    // Return early from cache if we already loaded this user's rants.
    if (_cache.rantsByUser && _cache.rantsByUser[username])
      return _cache.rantsByUser[username];

    if (!_cache.rantsByUser) _cache.rantsByUser = {};

    getRantsByUserAsync(username).then(list => {
      _cache.rantsByUser[username] = list || [];

      // Update the rant count shown in the profile stats bar.
      const countEl = document.querySelector('.profile-stat strong');
      if (countEl) countEl.textContent = _cache.rantsByUser[username].length;

      // Notify the profile-feed listener that data is ready.
      document.dispatchEvent(new CustomEvent('storage:rants-loaded', {
        detail: { username, rants: _cache.rantsByUser[username] }
      }));
    });

    return []; // Synchronous callers get an empty array on first call.
  }

  /**
   * Finds a single rant by ID from the local cache.
   * Handles both 'rant_ID' (DB column name) and 'id' field names for
   * compatibility across different parts of the codebase.
   * @param {number|string} id
   * @returns {Object|null}
   */
  function getRantById(id) {
    return getRants().find(r => (r.rant_ID || r.id) == id) || null;
  }

  /**
   * Returns the trending rants list from cache; fetches in background on miss.
   */
  function getTrendingRants() {
    if (_cache.trending) return _cache.trending;
    getTrendingRantsAsync().then(list => { _cache.trending = list || []; });
    return _cache.trending || [];
  }

  // No-ops: rant creation/persistence handled server-side.
  function addRant(rant) { /* Handled by save_rant.php */ }
  function saveRants(r)  { /* No-op */ }

  /**
   * Sends a rant field update to the DB and patches the local cache.
   * @param {number|string} id      - Rant ID.
   * @param {Object}        updates - Fields to merge.
   */
  function updateRant(id, updates) {
    updateRantAsync(id, updates);
    // Optimistic patch so UI updates without waiting for the DB.
    if (_cache.rants) {
      _cache.rants = _cache.rants.map(r =>
        (r.rant_ID || r.id) == id ? { ...r, ...updates } : r
      );
    }
  }

  /**
   * Removes a rant from the local cache. The actual DB deletion is
   * handled by api/delete_rant.php (called separately by the UI).
   * @param {number|string} id
   */
  function deleteRant(id) {
    if (_cache.rants)
      _cache.rants = _cache.rants.filter(r => (r.rant_ID || r.id) != id);
  }

  /**
   * Triggers a repost via the async helper.
   * The `username` param is accepted for API compatibility but unused
   * because the server reads the actor from the PHP session.
   */
  function repost(rantId, username) {
    repostAsync(rantId);
  }

  // ── Likes / Reactions ─────────────────────────────────────
  // These interactions are processed entirely by api/save_reaction.php
  // (which is called directly by the UI). These stubs exist so that
  // any legacy call sites in feed.js don't throw ReferenceErrors.

  /** @deprecated Handled by api/save_reaction.php */
  function toggleLike(rantId, username)            { return []; }

  /** @deprecated Handled by api/save_reaction.php */
  function toggleReaction(rantId, username, emoji) { return {}; }

  /** @deprecated Handled by api/save_reaction.php */
  function getUserReaction(rantId, username)       { return null; }


  // ══════════════════════════════════════════════════════════
  // FOLLOWS
  // Manages the follower/following social graph.
  // All write operations go through toggleFollow(), which makes a
  // single DB call and updates the cache locally for instant UI
  // feedback.
  // ══════════════════════════════════════════════════════════

  // ── Async versions ────────────────────────────────────────

  /** Fetches the list of users who follow `username`. */
  async function getFollowersAsync(username) { return get('get_followers', { username }); }

  /** Fetches the list of users that `username` follows. */
  async function getFollowingAsync(username) { return get('get_following', { username }); }

  /**
   * Checks whether the current session user follows `target`.
   * (The `me` param is unused; PHP derives the actor from the session.)
   */
  async function isFollowingAsync(me, target) { return get('is_following', { target }); }

  /** Toggles the follow relationship between the session user and `target`. */
  async function toggleFollowAsync(target)    { return post('toggle_follow', { target }); }

  /** Fetches a list of users the current user might want to follow. */
  async function getSuggestedUsersAsync()     { return get('get_suggested'); }

  /** Fetches rants from users the current user follows. */
  async function getFollowingFeedAsync()      { return get('get_following_feed'); }

  // ── Sync shims ────────────────────────────────────────────

  /**
   * Returns the cached follower list for `username`, fetching it in
   * the background if not yet loaded.
   * When data arrives it also updates the follower-count element on
   * any open profile page.
   */
  function getFollowers(username) {
    if (_cache.followers[username]) return _cache.followers[username];
    getFollowersAsync(username).then(list => {
      _cache.followers[username] = list || [];
      // Patch follower count in profile UI if the element is visible.
      const el = document.querySelector('#show-followers strong');
      if (el) el.textContent = _cache.followers[username].length;
    });
    return [];
  }

  /**
   * Returns the cached following list for `username`, fetching in
   * background if needed. Also refreshes the Follow/Following button
   * state once data arrives.
   */
  function getFollowing(username) {
    if (_cache.following[username]) return _cache.following[username];
    getFollowingAsync(username).then(list => {
      _cache.following[username] = list || [];
      // Patch following count in profile UI.
      const el = document.querySelector('#show-following strong');
      if (el) el.textContent = _cache.following[username].length;
      // Refresh the Follow button to show correct state.
      _updateFollowButton(username);
    });
    return [];
  }

  /**
   * Synchronously checks whether `me` follows `target`.
   * Returns false on a cache miss and triggers a background load that
   * will update the Follow button once data arrives.
   */
  function isFollowing(me, target) {
    if (_cache.following[me]) return _cache.following[me].includes(target);
    // Warm cache and update button asynchronously.
    getFollowingAsync(me).then(list => {
      _cache.following[me] = list || [];
      _updateFollowButton(me);
    });
    return false;
  }

  /**
   * Private helper: reads the profile username from the page header
   * and updates the Follow/Following button label + CSS class to
   * reflect the actual relationship once async data has loaded.
   * @param {string} me - The current session user's username.
   */
  function _updateFollowButton(me) {
    const followBtn = document.querySelector('#follow-btn');
    if (!followBtn) return;

    // The profile page header contains the username being viewed.
    const hdr = document.querySelector('.page-hdr h2');
    if (!hdr) return;
    const profileUser = hdr.textContent.replace('@', '').trim();

    // Don't show a Follow button on your own profile.
    if (!profileUser || profileUser === me) return;

    const nowFollowing = (_cache.following[me] || []).includes(profileUser);
    followBtn.textContent = nowFollowing ? 'Following' : 'Follow';
    followBtn.classList.toggle('following', nowFollowing);
  }

  /**
   * Optimistically adds `target` to `me`'s following list and to
   * `target`'s followers list in the cache.
   * The actual DB write happens in toggleFollow().
   */
  function follow(me, target) {
    if (!(_cache.following[me] || []).includes(target)) {
      _cache.following[me] = [...(getFollowing(me)), target];
    }
    if (!(_cache.followers[target] || []).includes(me)) {
      _cache.followers[target] = [...(getFollowers(target)), me];
    }
  }

  /**
   * Optimistically removes `target` from `me`'s following list and
   * from `target`'s followers list in the cache.
   * The actual DB write happens in toggleFollow().
   */
  function unfollow(me, target) {
    if (_cache.following[me])
      _cache.following[me] = _cache.following[me].filter(u => u !== target);
    if (_cache.followers[target])
      _cache.followers[target] = _cache.followers[target].filter(u => u !== me);
  }

  /**
   * Public toggle: checks the current state, applies the appropriate
   * cache mutation (follow or unfollow), makes ONE DB call, then
   * invalidates the suggested-users cache so it refreshes next render.
   * @param {string} me     - Current user's username.
   * @param {string} target - Username to follow or unfollow.
   * @returns {boolean} true if the user is NOW following target.
   */
  function toggleFollow(me, target) {
    const nowFollowing = !isFollowing(me, target);
    if (nowFollowing) follow(me, target); else unfollow(me, target);
    post('toggle_follow', { target }); // Single DB round-trip.
    _cache.suggested = null;           // Force suggested list refresh.
    return nowFollowing;
  }

  /**
   * Returns rants from users the current user follows, derived from
   * the local cache. (For real-time accuracy, prefer getFollowingFeedAsync.)
   * @param {string} username
   */
  function getFollowingFeed(username) {
    return getRants().filter(r => getFollowing(username).includes(r.username));
  }

  /**
   * Returns the suggested-users list from cache; fetches in background
   * on miss. Cache is invalidated after every follow/unfollow.
   */
  function getSuggestedUsers(username) {
    if (_cache.suggested) return _cache.suggested;
    getSuggestedUsersAsync().then(list => { _cache.suggested = list || []; });
    return _cache.suggested || [];
  }


  // ══════════════════════════════════════════════════════════
  // NOTIFICATIONS
  // Server-generated events (likes, comments, follows, reposts).
  // On first call, getNotifications() returns [] and fires an async
  // fetch; when data arrives it re-renders the Notifications page
  // in-place via _renderNotificationsInto().
  // ══════════════════════════════════════════════════════════

  /** Fetches all notifications for the current session user. */
  async function getNotificationsAsync(username) { return get('get_notifications'); }

  /** Fetches the count of unread notifications. */
  async function getUnreadCountAsync(username)   { return get('get_unread_notif_count'); }

  /**
   * Synchronous getter: returns cached notifications or [] on miss,
   * then re-renders the Notifications page once data arrives from the DB.
   */
  function getNotifications(username) {
    if (_cache.notifications) return _cache.notifications;

    getNotificationsAsync(username).then(list => {
      _cache.notifications = list || [];

      // If the Notifications page is currently open, re-render it.
      const c = document.getElementById('center');
      if (c && c.querySelector('.page-hdr h2')?.textContent === 'Notifications') {
        _renderNotificationsInto(c, username);
      }
    });

    return [];
  }

  /**
   * Private helper: rebuilds the notification list DOM inside `c`.
   * Called after async data arrives so the page updates without a
   * full reload. Handles empty state, the "Clear all" button, and
   * grouping multiple actors ("@alice and 3 others liked your rant").
   *
   * @param {Element} c        - The #center container element.
   * @param {string}  username - Current user (for Clear button callback).
   */
  function _renderNotificationsInto(c, username) {
    const notifs = _cache.notifications || [];

    // Remove any previously rendered notification rows (keep the header).
    c.querySelectorAll('.notif-item, .empty').forEach(el => el.remove());

    // Inject a "Clear all" button next to the page header if needed.
    const existingClear = c.querySelector('#clear-notifs');
    if (!existingClear && notifs.length) {
      const hdr = c.querySelector('.page-hdr');
      if (hdr) {
        const btn = document.createElement('button');
        btn.className = 'btn btn-ghost btn-sm';
        btn.id        = 'clear-notifs';
        btn.style.marginLeft = 'auto';
        btn.textContent = 'Clear all';
        btn.addEventListener('click', () => {
          clearNotifications(username);
          _renderNotificationsInto(c, username); // Re-render empty state.
        });
        hdr.appendChild(btn);
      }
    }

    // Render the empty state if there are no notifications.
    if (!notifs.length) {
      const empty = document.createElement('div');
      empty.className = 'empty';
      empty.innerHTML = '<div class="e-icon">🔔</div><p>Nothing here yet.</p>';
      c.appendChild(empty);
      return;
    }

    // Render each notification row.
    notifs.forEach(n => {
      // Map notification type to a representative emoji icon.
      const icon = n.type === 'like'     ? '❤️'
                 : n.type === 'comment'  ? '💬'
                 : n.type === 'follow'   ? '👤'
                 : n.type === 'repost'   ? '🔁'
                 : n.type === 'reaction' ? '😊'
                 : '📢'; // Default for system-level announcements.

      // Support grouped notifications: n.froms is an array of actors.
      const froms = n.froms || [n.from_user];
      const names = froms.length === 1 ? `@${froms[0]}`
                  : froms.length === 2 ? `@${froms[0]} and @${froms[1]}`
                  : `@${froms[0]} and ${froms.length - 1} others`;

      const el = document.createElement('div');
      el.className = 'notif-item' + (n.read ? '' : ' unread'); // Highlight unread.
      el.innerHTML = `
        <div class="notif-icon">${icon}</div>
        <div>
          <div class="notif-text"><strong>${names}</strong> ${n.message || ''}</div>
          <div class="notif-time">${n.created_at || ''}</div>
        </div>`;

      // Clicking a notification navigates to the actor's profile.
      if (froms[0]) {
        el.addEventListener('click', () => {
          // Use feed.js's render() if available; otherwise fall through.
          if (typeof render === 'function')
            render('userprofile', { username: froms[0] });
        });
      }

      c.appendChild(el);
    });
  }

  /**
   * Creates a new notification record in the DB.
   * Called by the UI after actions like liking or commenting.
   * @param {Object} notif - { to, type, message, rantId? }
   */
  function addNotification(notif) {
    post('add_notification', {
      to:      notif.to,
      type:    notif.type,
      message: notif.message,
      rant_id: notif.rantId || null,
    });
  }

  /**
   * Marks all of the current user's notifications as read in the DB
   * and patches the cache so the unread indicators disappear instantly.
   */
  function markNotificationsRead(username) {
    post('mark_notifications_read');
    if (_cache.notifications)
      _cache.notifications = _cache.notifications.map(n => ({ ...n, read: true }));
  }

  /**
   * Deletes all notifications for the current user in the DB and
   * clears the local cache.
   */
  function clearNotifications(username) {
    post('clear_notifications');
    _cache.notifications = [];
  }

  /**
   * Returns the unread notification count from cache (0 on first call)
   * and updates the notification badge elements once the async result
   * arrives. Badge elements are identified by ID:
   *   #notif-dot / #notif-dot-bn  – the red dot indicators
   *   #notif-num / #notif-num-bn  – the numeric badge labels
   */
  function getUnreadCount(username) {
    if (_cache.unreadNotif !== undefined) return _cache.unreadNotif;

    getUnreadCountAsync(username).then(d => {
      _cache.unreadNotif = d.count || 0;

      // Toggle dot visibility.
      ['notif-dot', 'notif-dot-bn'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.toggle('show', _cache.unreadNotif > 0);
      });

      // Update numeric badge text.
      ['notif-num', 'notif-num-bn'].forEach(id => {
        const el = document.getElementById(id);
        if (el) {
          el.classList.toggle('show', _cache.unreadNotif > 0);
          el.textContent = _cache.unreadNotif || '';
        }
      });
    });

    return 0; // Placeholder until async resolves.
  }


  // ══════════════════════════════════════════════════════════
  // MESSAGES (Direct Messages / Inbox)
  // Private 1-to-1 conversations between users.
  // Conversations are keyed by a sorted "userA:userB" string to
  // ensure the same cache entry is used regardless of who initiated.
  // ══════════════════════════════════════════════════════════

  // ── Async versions ────────────────────────────────────────

  /** Fetches all inbox threads for the current session user. */
  async function getInboxUsersAsync()        { return get('get_inbox'); }

  /** Fetches the full message history between the session user and `other`. */
  async function getConversationAsync(other) { return get('get_conversation', { with: other }); }

  /** Fetches only the most recent message in a thread. */
  async function getLastMessageAsync(other)  { return get('get_last_message', { with: other }); }

  /** Fetches the count of unread messages for the session user. */
  async function getUnreadMessagesAsync()    { return get('get_unread_msg_count'); }

  // ── Sync shims ────────────────────────────────────────────

  /**
   * Returns the list of users with whom the current user has exchanged
   * messages, from cache. Fetches in background on miss.
   */
  function getInboxUsers(username) {
    if (_cache.inbox) return _cache.inbox;
    getInboxUsersAsync().then(list => { _cache.inbox = list || []; });
    return _cache.inbox || [];
  }

  /**
   * Returns the message history between userA and userB.
   * Uses a sorted composite key so the same cache slot is shared
   * regardless of the argument order. Fetches in background on miss.
   */
  function getConversation(userA, userB) {
    const key = [userA, userB].sort().join(':');
    if (_cache.conversations && _cache.conversations[key])
      return _cache.conversations[key];

    if (!_cache.conversations) _cache.conversations = {};

    // Determine which participant is "the other one" relative to the
    // current session user so the API receives the correct target.
    getConversationAsync(userA === window.userFromPHP?.username ? userB : userA)
      .then(list => { _cache.conversations[key] = list || []; });

    return _cache.conversations[key] || [];
  }

  /**
   * Sends a message to `msg.to` and updates the local cache optimistically.
   * Also invalidates the inbox cache so the thread list re-fetches.
   * @param {Object} msg - { from, to, text }
   */
  function sendMessage(msg) {
    post('send_message', { to: msg.to, text: msg.text });

    // Optimistic update: append to conversation cache immediately.
    const key = [msg.from, msg.to].sort().join(':');
    if (_cache.conversations && _cache.conversations[key]) {
      _cache.conversations[key].push(msg);
    }
    _cache.inbox = null; // Invalidate so inbox re-fetches with new thread order.
  }

  /**
   * Returns the last message in a conversation from cache.
   * Useful for inbox preview lines ("Alice: hey what's up").
   */
  function getLastMessage(userA, userB) {
    const conv = getConversation(userA, userB);
    return conv[conv.length - 1] || null;
  }

  /**
   * Returns the unread message count from cache (0 on first call).
   * Fetches in background on miss.
   */
  function getUnreadMessages(username) {
    if (_cache.unreadMsg !== undefined) return _cache.unreadMsg;
    getUnreadMessagesAsync().then(d => { _cache.unreadMsg = d.count || 0; });
    return _cache.unreadMsg || 0;
  }

  /**
   * Marks all messages from `from` as read in the DB and resets the
   * local unread counter to 0.
   * @param {string} from - Sender whose messages should be marked read.
   * @param {string} to   - Recipient (current user).
   */
  function markMessagesRead(from, to) {
    post('mark_messages_read', { from });
    _cache.unreadMsg = 0;
  }


  // ══════════════════════════════════════════════════════════
  // BLOCKS
  // Users can block others to hide their content and prevent
  // interaction. Block/unblock state is reflected immediately in
  // the cache (the UI doesn't wait for the DB round-trip).
  // ══════════════════════════════════════════════════════════

  /**
   * Returns the list of usernames blocked by the current user,
   * fetching from DB in the background if not yet cached.
   */
  function getBlockedUsers(username) {
    if (_cache.blocked) return _cache.blocked;
    get('get_blocked').then(list => { _cache.blocked = list || []; });
    return _cache.blocked || [];
  }

  /**
   * Blocks `target`: persists to DB, adds to the blocked cache, and
   * removes the mutual follow relationship from local caches so
   * blocked content disappears from feeds immediately.
   */
  function blockUser(me, target) {
    post('block_user', { target });
    _cache.blocked = [...(getBlockedUsers(me)), target];
    // Remove any existing follow relationships in both directions.
    _cache.following[me]     = (getFollowing(me)).filter(u => u !== target);
    _cache.followers[target] = (getFollowers(target)).filter(u => u !== me);
  }

  /**
   * Removes `target` from the current user's block list in the DB
   * and from the local cache.
   */
  function unblockUser(me, target) {
    post('unblock_user', { target });
    if (_cache.blocked) _cache.blocked = _cache.blocked.filter(u => u !== target);
  }

  /**
   * Synchronously checks whether `me` has blocked `target`.
   * Returns false on cache miss until data loads in background.
   */
  function isBlocked(me, target) {
    return getBlockedUsers(me).includes(target);
  }


  // ══════════════════════════════════════════════════════════
  // REPORTS
  // Content-reporting flow is handled entirely server-side.
  // These stubs exist for API compatibility only.
  // ══════════════════════════════════════════════════════════

  /** @deprecated Report submission is handled by report_rant.php */
  function addReport(report)   { /* Handled by report_rant.php */ }

  /** @deprecated Admin reads reports via admin.php, not the Storage layer */
  function getReports()        { return []; }

  /** @deprecated See getReports() */
  function getPendingReports() { return []; }

  /** @deprecated Handled by admin.php */
  function resolveReport(id)   { /* Handled by admin.php */ }

  /** @deprecated Handled by admin.php */
  function dismissReport(id)   { /* Handled by admin.php */ }


  // ══════════════════════════════════════════════════════════
  // COMMENTS
  // All comment operations are handled by dedicated PHP endpoints.
  // These shims prevent ReferenceErrors in any legacy JS that still
  // calls them, but they do not perform any action.
  // ══════════════════════════════════════════════════════════

  /** @deprecated Handled by save_comment.php */
  function getComments()                { return []; }

  /** @deprecated Handled by save_comment.php */
  function addComment(c)                { /* Handled by save_comment.php */ }

  /** @deprecated Handled by save_comment.php */
  function getCommentsByRant(rantId)    { return []; }

  /** @deprecated Handled by save_comment.php */
  function getRepliesByComment(id)      { return []; }

  /** @deprecated Handled by delete_comment.php */
  function deleteComment(id)            { /* Handled by delete_comment.php */ }

  /** @deprecated Cascade deletion handled by delete_rant.php */
  function deleteCommentsByRant(rantId) { /* Handled by delete_rant.php */ }

  /** @deprecated Handled by api/save_reaction.php */
  function toggleCommentLike(id, u)     { return []; }

  /** @deprecated Comment counts fetched inline by rant components */
  function getCommentCount(rantId)      { return 0; }


  // ══════════════════════════════════════════════════════════
  // CACHE INVALIDATION HELPERS
  // Call these after bulk mutations (e.g. after posting a new rant)
  // to force the next read to re-fetch fresh data from the DB.
  // Each helper nulls out only the relevant cache keys to minimise
  // unnecessary network traffic.
  // ══════════════════════════════════════════════════════════

  /** Clears the rants and trending caches. */
  function invalidateRants()  { _cache.rants = null; _cache.trending = null; }

  /** Clears the users and suggested-users caches. */
  function invalidateUsers()  { _cache.users = null; _cache.suggested = null; }

  /** Clears the entire follow graph cache (followers, following, suggested). */
  function invalidateFollow() { _cache.followers = {}; _cache.following = {}; _cache.suggested = null; }

  /** Clears the notifications cache and resets the unread counter. */
  function invalidateNotifs() { _cache.notifications = null; _cache.unreadNotif = undefined; }

  /** Clears the messages cache (inbox, conversations, unread count). */
  function invalidateMsgs()   { _cache.inbox = null; _cache.conversations = null; _cache.unreadMsg = undefined; }


  // ══════════════════════════════════════════════════════════
  // PUBLIC API
  // This returned object is the Storage namespace used everywhere
  // in the app. The surface is intentionally identical to the old
  // localStorage version so no callers needed to change.
  // ══════════════════════════════════════════════════════════
  return {
    // ── Users ──────────────────────────────────────────────
    getUsers, saveUsers, getUserByUsername, addUser, updateUser,
    getUserByUsernameAsync, getUsersAsync, updateUserAsync,

    // ── Rants ──────────────────────────────────────────────
    getRants, saveRants, addRant, getRantById, updateRant, deleteRant, getRantsByUser,
    toggleLike, toggleReaction, getUserReaction, repost, getTrendingRants,
    getRantsAsync, getRantsByUserAsync, getArchivedRantsAsync, getTrendingRantsAsync, repostAsync,

    // ── Comments ───────────────────────────────────────────
    getComments, addComment, getCommentsByRant, getRepliesByComment,
    deleteComment, deleteCommentsByRant, toggleCommentLike, getCommentCount,

    // ── Notifications ──────────────────────────────────────
    addNotification, getNotifications, markNotificationsRead, clearNotifications, getUnreadCount,
    getNotificationsAsync,

    // ── Messages ───────────────────────────────────────────
    sendMessage, getConversation, getInboxUsers, getUnreadMessages, markMessagesRead, getLastMessage,
    getInboxUsersAsync, getConversationAsync, getLastMessageAsync,

    // ── Follows ────────────────────────────────────────────
    getFollowers, getFollowing, isFollowing, follow, unfollow, toggleFollow,
    getFollowingFeed, getSuggestedUsers,
    getFollowersAsync, getFollowingAsync, toggleFollowAsync, getSuggestedUsersAsync,

    // ── Reports ────────────────────────────────────────────
    addReport, resolveReport, dismissReport, getPendingReports, getReports,

    // ── Blocks ─────────────────────────────────────────────
    getBlockedUsers, blockUser, unblockUser, isBlocked,

    // ── Theme ──────────────────────────────────────────────
    getTheme, setTheme,

    // ── Session ────────────────────────────────────────────
    getSession, setSession, clearSession,

    // ── Cache helpers ──────────────────────────────────────
    invalidateRants, invalidateUsers, invalidateFollow, invalidateNotifs, invalidateMsgs,
  };
})();


// ══════════════════════════════════════════════════════════════
// PROFILE RANTS LAZY LOADER (module-level event listener)
//
// This listener decouples the async data fetch from the profile-page
// rendering logic. When getRantsByUser() finishes fetching from the DB,
// it fires a 'storage:rants-loaded' CustomEvent. This handler catches
// that event and rebuilds the #p-feed element on the profile page.
//
// Why a CustomEvent instead of a direct callback?
//   • feed.js and storage.js are loaded independently; using an event
//     avoids a direct coupling between the two modules.
//   • Multiple listeners can react to the same data without storage.js
//     needing to know about them.
// ══════════════════════════════════════════════════════════════
document.addEventListener('storage:rants-loaded', function(e) {
  const { username, rants } = e.detail;

  // Find the profile feed container; bail if it doesn't exist
  // (the event fires on every page, but #p-feed only exists on profiles).
  const pFeed = document.getElementById('p-feed');
  if (!pFeed) return;

  // Verify we are on the correct user's profile page before re-rendering.
  // The page header contains the username or "Profile" for the own profile.
  const hdr = document.querySelector('.page-hdr h2');
  const pageUser = hdr ? hdr.textContent.replace('@', '').trim() : '';
  const isProfilePage = (pageUser === username || pageUser === 'Profile');
  if (!isProfilePage) return;

  // Wipe the loading/placeholder content before injecting real cards.
  pFeed.innerHTML = '';

  // Show empty state if this user has no rants yet.
  if (!rants.length) {
    pFeed.innerHTML = '<div class="empty"><div class="e-icon">🤐</div><p>No rants yet.</p></div>';
    return;
  }

  const me      = window.userFromPHP?.username;
  const isMe    = username === me;               // Are we viewing our own profile?
  const blocked = Storage.getBlockedUsers(me);   // Hide content from blocked users.

  rants
    .filter(r => !blocked.includes(r.username))  // Remove blocked users' rants.
    .forEach(r => {
      // Prefer feed.js's buildCard() for consistent card rendering.
      // Falls back to a plain HTML card if feed.js isn't loaded.
      if (typeof buildCard === 'function') {
        // Pass true for "showFollow" only when viewing someone else's profile.
        pFeed.appendChild(buildCard(r, !isMe));
      } else {
        // Minimal fallback card (content + timestamp only).
        const card = document.createElement('div');
        card.className = 'post-card';
        card.innerHTML = `
          <div class="post-right">
            <div class="post-text">${r.content || ''}</div>
            <div class="post-time">${r.created_at || ''}</div>
          </div>`;
        pFeed.appendChild(card);
      }
    });
});