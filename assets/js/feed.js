/**
 * ============================================================
 * MAIN APP ENTRY POINT
 * Runs after the DOM is fully loaded. Initializes the user
 * session, sets up navigation, renders the UI, and starts
 * the home feed.
 * ============================================================
 */
document.addEventListener('DOMContentLoaded', () => {

  // ── Session / Auth Guard ──────────────────────────────────
  // Get the currently logged-in user from PHP or the Auth module.
  // Redirect to login if no session exists.
  const ME = window.userFromPHP || Auth.getUser();
  if (!ME) {
    window.location.href = 'login.php';
    return;
  }

  // ── Constants ─────────────────────────────────────────────
  const MAX = 280;                                        // Maximum characters per rant
  const REACTIONS = ['❤️', '😂', '😡', '😢', '🔥', '👏']; // Available emoji reactions


  // ══════════════════════════════════════════════════════════
  // THEME
  // Applies the saved light/dark theme to <body> and updates
  // the theme toggle button icon.
  // ══════════════════════════════════════════════════════════
  function applyTheme(t) {
    document.body.classList.toggle('light', t === 'light');
    const btn = document.getElementById('theme-btn');
    if (btn) btn.textContent = t === 'light' ? '🌚' : '🌝';
  }
  applyTheme(Storage.getTheme()); // Apply persisted theme on load


  // ══════════════════════════════════════════════════════════
  // SIDEBAR INITIALIZATION
  // Populates the sidebar avatar and username display with the
  // current user's data (custom avatar or color initials).
  // ══════════════════════════════════════════════════════════
  const sbAv = document.getElementById('sb-av');
  if (sbAv) {
    Storage.getUserByUsernameAsync(ME.username).then(u => {
      if (u && u.avatar) {
        // Use uploaded profile photo if available
        sbAv.style.background = 'none';
        sbAv.innerHTML = `<img src="${u.avatar}" class="av-img" style="width:100%; height:100%; border-radius:50%; object-fit:cover;">`;
      } else {
        // Fall back to a colored initials avatar
        sbAv.style.background = Utils.getAvatarColor(ME.username);
        sbAv.textContent = Utils.getInitials(ME.username);
      }
    });
  }

  // Set sidebar username and handle text
  const sbName = document.getElementById('sb-name');
  const sbHandle = document.getElementById('sb-handle');
  if (sbName) sbName.textContent = ME.username;
  if (sbHandle) sbHandle.textContent = '@' + ME.username;

  // Sidebar user button → navigate to own profile
  const sbUserBtn = document.getElementById('sb-user');
  if (sbUserBtn) sbUserBtn.addEventListener('click', () => navigate('profile'));


  // ══════════════════════════════════════════════════════════
  // NAVIGATION
  // Handles page switching via sidebar nav items and the
  // bottom navigation bar (mobile). Also wires up the
  // "compose" button and the theme toggle.
  // ══════════════════════════════════════════════════════════
  let currentPage = 'home'; // Tracks the active page

  // Wire sidebar nav items
  document.querySelectorAll('.nav-item[data-page]').forEach(btn => {
    btn.addEventListener('click', () => navigate(btn.dataset.page));
  });

  // Wire bottom-nav items (mobile)
  document.querySelectorAll('.bn-item[data-page]').forEach(btn => {
    btn.addEventListener('click', () => navigate(btn.dataset.page));
  });

  // "Focus compose" button → open the rant modal
  const focusBtn = document.getElementById('focus-compose');
  if (focusBtn) focusBtn.addEventListener('click', () => openRantModal());

  // Theme toggle button in sidebar
  const themeBtn = document.getElementById('theme-btn');
  if (themeBtn) themeBtn.addEventListener('click', () => {
    const next = Storage.getTheme() === 'dark' ? 'light' : 'dark';
    Storage.setTheme(next); applyTheme(next);
  });

  /**
   * navigate(page, extra)
   * Switches the active page, updates nav active states,
   * renders the new page, and refreshes notification badges.
   *
   * @param {string} page  - Page key (e.g. 'home', 'profile')
   * @param {object} extra - Optional extra data (e.g. { chatWith })
   */
  function navigate(page, extra = {}) {
    currentPage = page;
    // Highlight the correct nav item
    document.querySelectorAll('.nav-item[data-page]').forEach(b => b.classList.toggle('active', b.dataset.page === page));
    document.querySelectorAll('.bn-item[data-page]').forEach(b => b.classList.toggle('active', b.dataset.page === page));
    render(page, extra);
    refreshBadges();
  }

  /**
   * render(page, extra)
   * Clears the center column and calls the appropriate
   * render function for the requested page.
   *
   * @param {string} page  - Page key
   * @param {object} extra - Optional extra data
   */
  function render(page, extra = {}) {
    const c = document.getElementById('center');
    c.innerHTML = '';
    if (page === 'home')          renderHome(c);
    else if (page === 'search')   renderSearch(c);
    else if (page === 'explore')  renderExplore(c);
    else if (page === 'notifications') renderNotifications(c);
    else if (page === 'messages') renderMessages(c, extra.chatWith);
    else if (page === 'profile')  renderProfile(c, ME.username);
    else if (page === 'settings') renderSettings(c);
    else if (page === 'userprofile') renderProfile(c, extra.username);
  }

  /**
   * refreshBadges()
   * Updates the red unread-count badges on the Notifications
   * and Messages nav items (sidebar + bottom nav).
   */
  function refreshBadges() {
    const nc = Storage.getUnreadCount(ME.username);    // Unread notification count
    const mc = Storage.getUnreadMessages(ME.username); // Unread message count

    // Show/hide notification dots and numbers
    ['notif-dot', 'notif-dot-bn'].forEach(id => { const el = document.getElementById(id); if (el) el.classList.toggle('show', nc > 0); });
    ['notif-num', 'notif-num-bn'].forEach(id => { const el = document.getElementById(id); if (el) { el.classList.toggle('show', nc > 0); el.textContent = nc || ''; } });

    // Show/hide message dots and numbers
    ['msg-dot', 'msg-dot-bn'].forEach(id => { const el = document.getElementById(id); if (el) el.classList.toggle('show', mc > 0); });
    ['msg-num', 'msg-num-bn'].forEach(id => { const el = document.getElementById(id); if (el) { el.classList.toggle('show', mc > 0); el.textContent = mc || ''; } });
  }


  // ══════════════════════════════════════════════════════════
  // RIGHT COLUMN
  // Renders the "Trending Rants" and "Suggested Users" widgets
  // in the right sidebar.
  // ══════════════════════════════════════════════════════════

  /**
   * renderRight()
   * Fetches and displays trending rants and suggested users
   * in the right-side widgets.
   */
  function renderRight() {
    // ── Trending Rants widget ─────────────────────────────
    const tl = document.getElementById('trending-list');
    if (tl) {
      tl.innerHTML = '<p style="font-size:13px;color:var(--text3)">Loading…</p>';
      Storage.getTrendingRantsAsync().then(trending => {
        tl.innerHTML = (trending && trending.length)
          ? trending.map(r => `
              <div class="trend-item" data-id="${r.rant_ID}" style="padding:8px 0;border-bottom:1px solid var(--border);cursor:pointer">
                <div style="font-weight:600;font-size:13px">@${Utils.escapeHtml(r.anonymous ? 'Anonymous' : r.username)}</div>
                <div style="font-size:12px;color:var(--text3);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${Utils.escapeHtml(r.content)}</div>
                <div style="font-size:11px;color:var(--text3);margin-top:2px">
                ❤️ ${Object.values(r.reactions || {}).reduce((a, b) => a + b, 0)}
                </div>
              </div>`).join('')
          : '<p style="font-size:13px;color:var(--text3)">No trending rants yet.</p>';
      });
    }

    // ── Suggested Users widget ────────────────────────────
    const sl = document.getElementById('suggested-list');
    if (sl) {
      sl.innerHTML = '<p style="font-size:13px;color:var(--text3)">Loading…</p>';
      Storage.getSuggestedUsersAsync().then(suggested => {
        sl.innerHTML = (suggested && suggested.length)
          ? suggested.map(u => `
              <div style="display:flex;align-items:center;gap:10px;padding:8px 0">
                ${u.avatar ? `<img src="${u.avatar}" class="av-img go-av" style="width:32px;height:32px;border-radius:50%;object-fit:cover;cursor:pointer" data-go="${u.username}" alt="@${Utils.escapeHtml(u.username)}'s avatar">` : `<div class="av sm go-av" style="background:${Utils.getAvatarColor(u.username)};cursor:pointer" data-go="${u.username}">${Utils.getInitials(u.username)}</div>`}
                <div style="flex:1;min-width:0">
                  <div style="font-weight:600;font-size:13px;cursor:pointer;white-space:nowrap;overflow:hidden;text-overflow:ellipsis" class="go-profile" data-go="${u.username}">@${Utils.escapeHtml(u.username)}</div>
                  ${u.mutuals ? `<div style="font-size:11px;color:var(--text3)">${u.mutuals} mutual</div>` : ''}
                </div>
                <button class="btn btn-ghost btn-xs msg-btn" data-to="${u.username}">Message</button>
              </div>`).join('')
          : '<p style="font-size:13px;color:var(--text3)">No suggestions.</p>';

        // Click avatar or name → go to user profile
        sl.querySelectorAll('.go-profile,.go-av').forEach(el => el.addEventListener('click', () => render('userprofile', { username: el.dataset.go })));
        // Click Message button → open DM with that user
        sl.querySelectorAll('.msg-btn').forEach(btn => btn.addEventListener('click', () => navigate('messages', { chatWith: btn.dataset.to })));
      });
    }
  }
  renderRight(); // Initial render of right column


  // ════════════════════════════════════════════════════════════
  // PAGE: HOME
  // Renders the home feed with a compose box, tab filters
  // (For You / Following), and a search bar. Posts are fetched
  // from the API and filtered client-side.
  // ════════════════════════════════════════════════════════════

  /**
   * renderHome(c)
   * Builds and injects the full home page UI including the
   * compose area, tabs, search, and initial feed load.
   *
   * @param {HTMLElement} c - The center column container
   */
  function renderHome(c) {
    let activeTab = 'all'; // 'all' = For You, 'following' = Following tab
    let isAnon = false;    // Whether the compose toggle is set to anonymous

    c.innerHTML = `
      <div class="page-hdr">
        <h2>Home</h2>
        <button class="theme-toggle" id="theme-btn" title="Toggle theme">${Storage.getTheme() === 'light' ? '🌚' : '🌝'}</button>
      </div>
      <div class="search-bar-wrap">
        <div class="search-bar">
          <span class="search-icon">🔍</span>
          <input id="home-search" type="text" placeholder="Search rants…"/>
        </div>
      </div>
      <div class="tabs">
        <button class="tab active" data-tab="all">For You</button>
        <button class="tab" data-tab="following">Following</button>
      </div>
      <div class="compose-wrap">
        <div class="av" id="home-av" style="background:${Utils.getAvatarColor(ME.username)}">${Utils.getInitials(ME.username)}</div>
        <div class="compose-right">
          <textarea class="compose-ta" id="compose-ta" placeholder="What's on your mind?" maxlength="${MAX}"></textarea>
          <div class="compose-footer">
            <label class="anon-toggle" title="Post anonymously">
              <input type="checkbox" id="anon-check"/>
              <span class="anon-track"><span class="anon-thumb"></span></span>
              <span class="anon-text">👻 Anon</span>
            </label>
            <div style="display:flex;align-items:center;gap:10px">
              <div class="char-ring">
                <svg viewBox="0 0 28 28" width="28" height="28">
                  <circle class="track" cx="14" cy="14" r="12"/>
                  <circle class="fill" id="ring-fill" cx="14" cy="14" r="12" stroke-dasharray="75.4" stroke-dashoffset="75.4"/>
                </svg>
              </div>
              <button class="btn btn-primary btn-sm" id="post-btn" disabled>Post</button>
            </div>
          </div>
        </div>
      </div>
      <div id="feed"></div>`;

    // Wire the in-page theme toggle button
    document.getElementById('theme-btn').addEventListener('click', () => {
      const next = Storage.getTheme() === 'dark' ? 'light' : 'dark';
      Storage.setTheme(next); applyTheme(next);
    });

    // ── Compose area references ───────────────────────────
    const ta      = c.querySelector('#compose-ta');
    const postBtn = c.querySelector('#post-btn');
    const ring    = c.querySelector('#ring-fill');   // SVG ring fill element
    const anonChk = c.querySelector('#anon-check');
    const homeAv  = c.querySelector('#home-av');
    const circ    = 75.4; // SVG circle circumference for the character ring

    // Load custom avatar into compose area if the user has one
    Storage.getUserByUsernameAsync(ME.username).then(uData => {
      if (uData && uData.avatar) {
        homeAv.style.background = 'none';
        homeAv.innerHTML = `<img src="${uData.avatar}" style="width:40px;height:40px;border-radius:50%;object-fit:cover"/>`;
      }
    });

    // ── Anonymous toggle ──────────────────────────────────
    // Switches the compose avatar to a ghost when anon mode is on
    anonChk.addEventListener('change', () => {
      isAnon = anonChk.checked;
      homeAv.style.background = isAnon ? '#444' : Utils.getAvatarColor(ME.username);
      homeAv.textContent = isAnon ? '👻' : Utils.getInitials(ME.username);
      homeAv.style.fontSize = isAnon ? '20px' : '';
    });

    // ── Feed tab switching ────────────────────────────────
    // Switches between "For You" and "Following" feeds
    c.querySelectorAll('.tab').forEach(tab => {
      tab.addEventListener('click', () => {
        c.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active'); activeTab = tab.dataset.tab;
        loadFeed(c.querySelector('#home-search').value.trim());
      });
    });

    // ── Compose textarea input handler ───────────────────
    // Updates the character ring, enables/disables Post button,
    // and auto-resizes the textarea.
    ta.addEventListener('input', () => {
      const len = ta.value.length, pct = len / MAX;
      ring.style.strokeDashoffset = circ - pct * circ;
      ring.style.stroke = len > MAX ? 'var(--danger)' : len > 240 ? 'var(--warning)' : 'var(--accent)';
      postBtn.disabled = len === 0 || len > MAX;
      ta.style.height = 'auto'; ta.style.height = ta.scrollHeight + 'px';
    });

    // ── Post button handler ───────────────────────────────
    // Submits a new rant via save_rant.php and resets the
    // compose area on success.
    postBtn.addEventListener('click', () => {
      const content = ta.value.trim();
      if (!content || content.length > MAX) return;
      postBtn.disabled = true; postBtn.textContent = 'Posting…';

      const formData = new FormData();
      formData.append('content', content);
      formData.append('anonymous', isAnon ? '1' : '0');

      fetch('save_rant.php', { method: 'POST', body: formData })
        .then(r => r.json())
        .then(data => {
          if (data.success) {
            // Reset compose area
            ta.value = ''; ring.style.strokeDashoffset = circ;
            anonChk.checked = false; isAnon = false;
            homeAv.style.background = Utils.getAvatarColor(ME.username);
            homeAv.textContent = Utils.getInitials(ME.username);
            homeAv.style.fontSize = '';
            Utils.showToast('Rant posted!', 'success');
            loadFeed(''); renderRight();
          } else {
            Utils.showToast(`Failed to post: ${data.message}`, 'error');
          }
          postBtn.disabled = false; postBtn.textContent = 'Post';
        })
        .catch(() => {
          Utils.showToast('Error posting rant', 'error');
          postBtn.disabled = false; postBtn.textContent = 'Post';
        });
    });

    // Search input → re-filter the feed as the user types
    c.querySelector('#home-search').addEventListener('input', e => loadFeed(e.target.value.trim()));

    loadFeed(''); // Load the initial feed with no query filter

    // ── loadFeed(q) ───────────────────────────────────────
    /**
     * Fetches all rants from the API, filters by search query,
     * blocked users, and active tab, then renders each card.
     *
     * @param {string} q - Search query string (may be empty)
     */
    function loadFeed(q) {
      const feedEl = c.querySelector('#feed');
      feedEl.innerHTML = '<div class="loading" style="text-align:center;padding:20px;color:var(--text3)">Loading rants...</div>';

      fetch('api/get_rants.php')
        .then(r => r.json())
        .then(rants => {
          if (!Array.isArray(rants)) rants = [];

          // Filter out posts from blocked users
          const blocked = Storage.getBlockedUsers(ME.username);
          rants = rants.filter(r => !blocked.includes(r.username));

          // Apply search query filter if provided
          if (q) rants = rants.filter(r =>
            r.content.toLowerCase().includes(q.toLowerCase()) ||
            (!r.anonymous && r.username.toLowerCase().includes(q.toLowerCase()))
          );

          // "Following" tab: only show rants from followed users + own rants 
          if (activeTab === 'following') {
            Storage.getFollowingAsync(ME.username).then(following => {
              following = following || [];
              const filtered = rants.filter(r => 
              (following.includes(r.username) && !r.anonymous) || r.user_ID === ME.user_ID
              );
              feedEl.innerHTML = '';
              if (!filtered.length) {
                feedEl.innerHTML = `<div class="empty"><div class="e-icon">💬</div><p>Follow someone to see their rants!</p></div>`;
                return;
              }
              filtered.forEach(r => feedEl.appendChild(buildCard(r)));
            });
            return;
          }

          // "For You" tab: show all (non-blocked) rants
          feedEl.innerHTML = '';
          if (!rants.length) {
            feedEl.innerHTML = `<div class="empty"><div class="e-icon">💬</div><p>${q ? 'No results.' : 'No rants yet!'}</p></div>`;
            return;
          }
          rants.forEach(r => feedEl.appendChild(buildCard(r)));
        })
        .catch(() => {
          feedEl.innerHTML = '<div class="empty"><div class="e-icon">⚠️</div><p>Error loading rants. Please try again.</p></div>';
        });
    }
  }


  // ════════════════════════════════════════════════════════════
  // PAGE: EXPLORE
  // Displays the top/trending rants of the day.
  // ════════════════════════════════════════════════════════════

  /**
   * renderExplore(c)
   * Fetches trending rants and renders them as post cards,
   * filtering out posts from blocked users.
   *
   * @param {HTMLElement} c - The center column container
   */
  function renderExplore(c) {
    c.innerHTML = `<div class="page-hdr"><h2>Explore</h2></div>
      <div style="padding:12px 20px;border-bottom:1px solid var(--border);font-size:13px;color:var(--text3)">Top rants today</div>
      <div id="explore-feed"><div style="text-align:center;padding:20px;color:var(--text3)">Loading…</div></div>`;

    const ef = c.querySelector('#explore-feed');
    Storage.getTrendingRantsAsync().then(trending => {
      const blocked = Storage.getBlockedUsers(ME.username);
      const visible = (trending || []).filter(r => !blocked.includes(r.username));
      ef.innerHTML = '';
      if (!visible.length) {
        ef.innerHTML = `<div class="empty"><div class="e-icon">📈</div><p>Nothing trending yet.</p></div>`;
        return;
      }
      visible.forEach(r => ef.appendChild(buildCard(r)));
    });
  }


  // ════════════════════════════════════════════════════════════
  // PAGE: SEARCH
  // Full-text search across users and rants with tab filters:
  // All, People, Rants, Top (sorted by likes).
  // ════════════════════════════════════════════════════════════

  /**
   * renderSearch(c)
   * Renders the search page with a text input and tab filters.
   * Results update as the user types.
   *
   * @param {HTMLElement} c - The center column container
   */
  function renderSearch(c) {
    c.innerHTML = `
      <div class="page-hdr"><h2>Search</h2></div>
      <div class="search-bar-wrap">
        <div class="search-bar">
          <span class="search-icon">🔍</span>
          <input id="s-input" type="text" placeholder="Search people or rants…" autofocus/>
        </div>
      </div>
      <div class="tabs">
        <button class="tab active" data-stab="all">All</button>
        <button class="tab" data-stab="people">People</button>
        <button class="tab" data-stab="rants">Rants</button>
        <button class="tab" data-stab="top">Top</button>
      </div>
      <div id="s-results"></div>`;

    let activeTab = 'all';
    const inp = c.querySelector('#s-input');
    const res = c.querySelector('#s-results');

    // Tab switch handler
    c.querySelectorAll('.tab[data-stab]').forEach(tab => {
      tab.addEventListener('click', () => {
        c.querySelectorAll('.tab[data-stab]').forEach(t => t.classList.remove('active'));
        tab.classList.add('active'); activeTab = tab.dataset.stab;
        doSearch(inp.value.trim());
      });
    });

    // Live search as the user types
    inp.addEventListener('input', () => doSearch(inp.value.trim()));

    /**
     * doSearch(q)
     * Performs a combined user + rant search, renders people
     * rows and rant cards according to the active tab filter.
     *
     * @param {string} q - Search query
     */
    async function doSearch(q) {
      res.innerHTML = '';
      if (!q) return;
      const ql = q.toLowerCase();
      const blocked = Storage.getBlockedUsers(ME.username);

      const [allUsers, allRants] = await Promise.all([
  fetch('storage_api.php?action=get_users').then(r => r.json()).catch(() => []),
  fetch('api/get_rants.php').then(r => r.json()).catch(() => [])
]);

      // Filter users: exclude admins, blocked, and non-matching
      const users = (allUsers || []).filter(u =>
        u.role !== 'admin' &&
        !blocked.includes(u.username) &&
        u.username.toLowerCase().includes(ql)
      );

      // Filter rants: exclude blocked users and non-matching content
      let rants = (allRants || []).filter(r =>
        !blocked.includes(r.username) &&
        (r.content.toLowerCase().includes(ql) ||
        (!r.anonymous && r.username.toLowerCase().includes(ql)))
      );

      // Top tab sorts rants by like count descending
      const topRants = [...rants].sort((a, b) => (b.likes || []).length - (a.likes || []).length);

      // Render People section
      if ((activeTab === 'all' || activeTab === 'people') && users.length) {
        res.innerHTML += `<div style="padding:10px 20px 4px;font-size:12px;font-weight:700;color:var(--text3);text-transform:uppercase;letter-spacing:.06em">People</div>`;
        users.forEach(u => {
          const row = document.createElement('div'); row.className = 'follow-list-item';
          const avatarHtml = u.avatar
            ? `<img src="${u.avatar}" class="av-img" style="width:32px;height:32px;border-radius:50%;object-fit:cover;" alt="@${Utils.escapeHtml(u.username)}'s avatar">`
            : `<div class="av sm" style="background:${Utils.getAvatarColor(u.username)}">${Utils.getInitials(u.username)}</div>`;
          row.innerHTML = `${avatarHtml}
            <div class="follow-list-info"><div class="fl-name">@${Utils.escapeHtml(u.username)}</div><div class="fl-handle">${Utils.escapeHtml(u.bio || 'No bio')}</div></div>`;
          row.addEventListener('click', () => render('userprofile', { username: u.username }));
          res.appendChild(row);
        });
      }

      // Render Rants section (or Top Rants for the Top tab)
      const rantList = activeTab === 'top' ? topRants : rants;
      if ((activeTab === 'all' || activeTab === 'rants' || activeTab === 'top') && rantList.length) {
        res.innerHTML += `<div style="padding:10px 20px 4px;font-size:12px;font-weight:700;color:var(--text3);text-transform:uppercase;letter-spacing:.06em">${activeTab === 'top' ? 'Top Rants' : 'Rants'}</div>`;
        rantList.forEach(r => res.appendChild(buildCard(r)));
      }

      // Empty state
      if (!users.length && !rants.length) {
        res.innerHTML = `<div class="empty"><div class="e-icon">🔍</div><p>No results for "${Utils.escapeHtml(q)}"</p></div>`;
      }
    }
  }


  // ════════════════════════════════════════════════════════════
  // PAGE: NOTIFICATIONS
  // Lists grouped notifications (likes, comments, follows, etc.)
  // and marks them all as read on open.
  // ════════════════════════════════════════════════════════════

  /**
   * renderNotifications(c)
   * Marks all notifications read, then fetches and renders
   * each notification item with icon, sender name, and time.
   *
   * @param {HTMLElement} c - The center column container
   */
  function renderNotifications(c) {
    Storage.markNotificationsRead(ME.username);
    refreshBadges();

    c.innerHTML = `<div class="page-hdr"><h2>Notifications</h2></div>
      <div class="empty"><div class="e-icon">🔔</div><p>Loading…</p></div>`;

    Storage.getNotificationsAsync(ME.username).then(notifs => {
      notifs = notifs || [];
      c.innerHTML = `
        <div class="page-hdr">
          <h2>Notifications</h2>
          ${notifs.length ? `<button class="btn btn-ghost btn-sm" id="clear-notifs" style="margin-left:auto">Clear all</button>` : ''}
        </div>`;

      if (!notifs.length) {
        c.innerHTML += `<div class="empty"><div class="e-icon">🔔</div><p>Nothing here yet.</p></div>`;
        return;
      }

      // "Clear all" button wipes notifications and re-renders the page
      const clearBtn = c.querySelector('#clear-notifs');
      if (clearBtn) clearBtn.addEventListener('click', () => {
        Storage.clearNotifications(ME.username);
        renderNotifications(c);
      });

      // Render each notification item
      notifs.forEach(n => {
        // Choose icon based on notification type
        const icon = n.type === 'like'     ? '❤️' :
                     n.type === 'comment'  ? '💬' :
                     n.type === 'follow'   ? '👤' :
                     n.type === 'repost'   ? '🔁' :
                     n.type === 'reaction' ? '😊' : '📢';

        // Build "X and N others" sender string
        const froms = n.froms || [n.from_user];
        const names = froms.length === 1
          ? `@${Utils.escapeHtml(froms[0])}`
          : froms.length === 2
            ? `@${Utils.escapeHtml(froms[0])} and @${Utils.escapeHtml(froms[1])}`
            : `@${Utils.escapeHtml(froms[0])} and ${froms.length - 1} others`;

        const el = document.createElement('div');
        el.className = 'notif-item' + (n.read ? '' : ' unread');
        el.innerHTML = `<div class="notif-icon">${icon}</div>
          <div>
            <div class="notif-text"><strong>${names}</strong> ${Utils.escapeHtml(n.message || '')}</div>
            <div class="notif-time">${Utils.timeAgo(n.created_at)}</div>
          </div>`;

        // Click notification → view the sender's profile
        el.addEventListener('click', () => { if (froms[0]) render('userprofile', { username: froms[0] }); });
        c.appendChild(el);
      });
    });
  }


  // ════════════════════════════════════════════════════════════
  // PAGE: MESSAGES
  // Two-panel DM layout: inbox list on the left, chat thread
  // on the right. Supports opening a specific conversation
  // via navigate('messages', { chatWith: 'username' }).
  // ════════════════════════════════════════════════════════════

  /**
   * renderMessages(c, openWith)
   * Renders the full messaging UI. If openWith is provided,
   * that conversation is opened immediately.
   *
   * @param {HTMLElement} c         - The center column container
   * @param {string|undefined} openWith - Username to open a chat with
   */
  function renderMessages(c, openWith) {
    c.innerHTML = `<div class="page-hdr"><h2>Messages</h2></div>
      <div style="text-align:center;padding:20px;color:var(--text3)">Loading…</div>`;

    Storage.getInboxUsersAsync().then(inboxUsers => {
      inboxUsers = inboxUsers || [];

      // If openWith isn't in the inbox yet, prepend them
      if (openWith && !inboxUsers.includes(openWith)) inboxUsers.unshift(openWith);

      c.innerHTML = `<div class="page-hdr"><h2>Messages</h2></div>`;

      if (!inboxUsers.length && !openWith) {
        c.innerHTML += `<div class="empty"><div class="e-icon">💬</div><p>No conversations yet.</p></div>`;
        return;
      }

      // ── Two-panel layout ──────────────────────────────
      const layout = document.createElement('div');
      layout.style.cssText = 'display:flex;height:calc(100vh - 57px)';

      const list = document.createElement('div');
      list.style.cssText = 'width:240px;border-right:1px solid var(--border);overflow-y:auto;flex-shrink:0';

      const chatArea = document.createElement('div');
      chatArea.style.cssText = 'flex:1;display:flex;flex-direction:column;min-width:0';

      /**
       * buildInboxItem(u)
       * Creates a sidebar inbox list item for a given username,
       * with a preview of the last message.
       *
       * @param {string} u - Username
       * @returns {HTMLElement}
       */
      function buildInboxItem(u) {
        const item = document.createElement('div');
        item.className = 'inbox-item'; item.dataset.user = u;
        item.innerHTML = `
          <div class="av sm" style="background:${Utils.getAvatarColor(u)}">${Utils.getInitials(u)}</div>
          <div class="inbox-info">
            <div class="inbox-name">@${Utils.escapeHtml(u)}</div>
            <div class="inbox-preview" style="font-size:12px;color:var(--text3);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">Say hi!</div>
          </div>`;

        // Replace avatar with uploaded photo if available.
        Storage.getUserByUsernameAsync(u).then(user => {
          if (user?.avatar) {
            const av = item.querySelector('.av.sm');
            if (av) av.outerHTML = `<img src="${user.avatar}" class="av-img" style="width:32px;height:32px;border-radius:50%;object-fit:cover;" alt="@${Utils.escapeHtml(u)}'s avatar">`;
          }
        });

        // Populate last message preview
        Storage.getLastMessageAsync(u).then(last => {
          const preview = item.querySelector('.inbox-preview');
          if (preview && last) preview.textContent = last.msg_text || 'Say hi!';
        });

        // Click → open that user's chat thread
        item.addEventListener('click', () => {
          list.querySelectorAll('.inbox-item').forEach(i => i.classList.remove('active'));
          item.classList.add('active');
          openChat(u);
        });
        return item;
      }

      inboxUsers.forEach(u => list.appendChild(buildInboxItem(u)));
      layout.appendChild(list);
      layout.appendChild(chatArea);
      c.appendChild(layout);

      /**
       * openChat(toUser)
       * Renders the chat thread for a specific user, handles
       * loading messages, and wires up the send button.
       *
       * @param {string} toUser - The other participant's username
       */
      function openChat(toUser) {
        // Mark messages from this user as read
        fetch('storage_api.php', {
          method: 'POST',
          body: (() => {
            const fd = new FormData();
            fd.append('action', 'mark_messages_read');
            fd.append('from', toUser);
            return fd;
          })()
        });
        refreshBadges();

        chatArea.innerHTML = `
          <div class="page-hdr" style="border-bottom:1px solid var(--border);padding:12px 16px;display:flex;align-items:center;gap:10px">
            <div class="av sm" style="background:${Utils.getAvatarColor(toUser)}">${Utils.getInitials(toUser)}</div>
            <h2 style="font-size:16px;margin:0">@${Utils.escapeHtml(toUser)}</h2>
            <button class="btn btn-ghost btn-xs" style="margin-left:auto" id="view-prof-btn">View Profile</button>
          </div>
          <div class="chat-messages" id="chat-msgs" style="flex:1;overflow-y:auto;padding:16px;display:flex;flex-direction:column;gap:8px"></div>
          <div class="chat-input-row" style="padding:12px 16px;border-top:1px solid var(--border);display:flex;gap:8px">
            <input id="chat-in" type="text" placeholder="Message @${Utils.escapeHtml(toUser)}…" maxlength="500" style="flex:1"/>
            <button class="btn btn-primary btn-sm" id="chat-send">Send</button>
          </div>`;

        Storage.getUserByUsernameAsync(toUser).then(user => {
          if (user?.avatar) {
            const av = chatArea.querySelector('.av.sm');
            if (av) av.outerHTML = `<img src="${user.avatar}" class="av-img" style="width:32px;height:32px;border-radius:50%;object-fit:cover;" alt="@${Utils.escapeHtml(toUser)}'s avatar">`;
          }
        });

        // "View Profile" button in chat header
        chatArea.querySelector('#view-prof-btn').addEventListener('click', () => render('userprofile', { username: toUser }));

        /**
         * loadMsgs()
         * Fetches the conversation thread and renders each
         * message bubble with timestamps and a "Seen" indicator
         * for the last sent message.
         */
        function loadMsgs() {
          const box = chatArea.querySelector('#chat-msgs');
          fetch(`storage_api.php?action=get_conversation&with=${encodeURIComponent(toUser)}`)
            .then(r => r.json())
            .then(msgs => {
              if (!Array.isArray(msgs)) msgs = [];
              box.innerHTML = '';

              if (!msgs.length) {
                box.innerHTML = `<div class="empty" style="padding:40px 20px;text-align:center"><p>Start the conversation! 👋</p></div>`;
                return;
              }

              msgs.forEach((m, i) => {
                const mine = m.from_user === ME.username;

                const wrapper = document.createElement('div');
                wrapper.style.cssText = `display:flex;flex-direction:column;align-items:${mine ? 'flex-end' : 'flex-start'}`;

                const row = document.createElement('div');
                row.style.cssText = `display:flex;align-items:flex-end;gap:6px;${mine ? 'flex-direction:row-reverse' : ''}`;

                // Show avatar only for messages from the other user
                if (!mine) {
                  const av = document.createElement('div');
                  av.className = 'av xs';
                  av.style.background = Utils.getAvatarColor(toUser);
                  av.textContent = Utils.getInitials(toUser);
                  row.appendChild(av);
                }

                // Message bubble
                const bubble = document.createElement('div');
                bubble.className = 'chat-bubble' + (mine ? ' mine' : '');
                bubble.textContent = m.msg_text;
                bubble.style.cssText = `
                  max-width:320px;padding:8px 12px;border-radius:${mine ? '18px 18px 4px 18px' : '18px 18px 18px 4px'};
                  background:${mine ? 'var(--accent)' : 'var(--surface2)'};
                  color:${mine ? 'white' : 'var(--text1)'};
                  font-size:14px;line-height:1.4;word-break:break-word`;
                row.appendChild(bubble);
                wrapper.appendChild(row);

                // Timestamp below the bubble
                const ts = document.createElement('div');
                ts.style.cssText = 'font-size:11px;color:var(--text3);margin-top:2px;padding:0 4px';
                ts.textContent = Utils.timeAgo(m.created_at);
                wrapper.appendChild(ts);

                // "Seen" indicator on the last sent message (if read by recipient)
                if (mine && i === msgs.length - 1 && m.is_read) {
                  const seen = document.createElement('div');
                  seen.style.cssText = 'font-size:11px;color:var(--text3);padding:0 4px';
                  seen.textContent = '✓ Seen';
                  wrapper.appendChild(seen);
                }

                box.appendChild(wrapper);
              });
              box.scrollTop = box.scrollHeight; // Scroll to latest message
            })
            .catch(() => {
              box.innerHTML = `<div class="empty"><p>Failed to load messages.</p></div>`;
            });
        }

        loadMsgs();

        const chatIn   = chatArea.querySelector('#chat-in');
        const chatSend = chatArea.querySelector('#chat-send');

        /**
         * sendMsg()
         * Sends a new direct message to toUser via storage_api.php
         * and refreshes the thread on success.
         */
        function sendMsg() {
          const text = chatIn.value.trim();
          if (!text) return;
          chatSend.disabled = true;
          chatIn.value = '';

          const fd = new FormData();
          fd.append('action', 'send_message');
          fd.append('to', toUser);
          fd.append('text', text);

          fetch('storage_api.php', { method: 'POST', body: fd })
            .then(r => r.json())
            .then(data => {
              chatSend.disabled = false;
              if (data.success) {
                loadMsgs();
                // Update inbox preview text
                const preview = list.querySelector(`[data-user="${toUser}"] .inbox-preview`);
                if (preview) preview.textContent = text;
                // Add inbox item if this is a new conversation
                if (!list.querySelector(`[data-user="${toUser}"]`)) {
                  list.prepend(buildInboxItem(toUser));
                }
                Storage.addNotification({ to: toUser, from: ME.username, type: 'message', message: 'sent you a message.' });
                refreshBadges();
              } else {
                Utils.showToast('Failed to send message', 'error');
                chatIn.value = text; // Restore unsent text
              }
            })
            .catch(() => {
              chatSend.disabled = false;
              Utils.showToast('Network error', 'error');
              chatIn.value = text;
            });
        }

        chatSend.addEventListener('click', sendMsg);
        chatIn.addEventListener('keydown', e => { if (e.key === 'Enter') sendMsg(); });
        chatIn.focus();
      }

      // Auto-open a conversation if provided, or open the first inbox item
      if (openWith) {
        const item = list.querySelector(`[data-user="${openWith}"]`);
        if (item) item.classList.add('active');
        openChat(openWith);
      } else if (inboxUsers.length) {
        const first = list.querySelector('.inbox-item');
        if (first) { first.classList.add('active'); openChat(first.dataset.user); }
      } else {
        // No conversations at all → empty state prompt
        chatArea.innerHTML = `
          <div style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;color:var(--text3)">
            <div style="font-size:48px">💬</div>
            <div style="font-size:16px;font-weight:600;color:var(--text2)">No messages yet</div>
            <div style="font-size:13px;text-align:center;max-width:240px">Go to someone's profile and click <strong>Message</strong> to start a conversation.</div>
          </div>`;
      }
    });
  }


  // ════════════════════════════════════════════════════════════
  // PAGE: PROFILE
  // Shows a user's cover photo, avatar, bio, follow stats,
  // and their rant feed. Supports own profile editing and
  // follow/block/message actions for other users.
  // ════════════════════════════════════════════════════════════

  /**
   * renderProfile(c, username)
   * Renders the full profile page for a given username.
   * Shows edit controls for the current user's own profile.
   *
   * @param {HTMLElement} c        - The center column container
   * @param {string}      username - Username to display
   */
  function renderProfile(c, username) {
    const isMe  = username === ME.username;
    const color = Utils.getAvatarColor(username);

    c.innerHTML = `
      ${!isMe
        ? `<div class="page-hdr"><button class="back-btn" id="back-btn">←</button><h2>@${Utils.escapeHtml(username)}</h2></div>`
        : '<div class="page-hdr"><h2>Profile</h2></div>'}
      <div class="profile-cover">
        <!-- SVG gradient cover art (default; replaced if user has a custom cover) -->
        <svg width="100%" height="160" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid slice">
          <defs>
            <linearGradient id="cg" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#4c1d95"/><stop offset="45%" stop-color="#7c3aed"/><stop offset="100%" stop-color="#06b6d4"/></linearGradient>
            <radialGradient id="g1" cx="20%" cy="50%" r="50%"><stop offset="0%" stop-color="#a78bfa" stop-opacity="0.5"/><stop offset="100%" stop-color="#a78bfa" stop-opacity="0"/></radialGradient>
            <radialGradient id="g2" cx="80%" cy="30%" r="45%"><stop offset="0%" stop-color="#06b6d4" stop-opacity="0.4"/><stop offset="100%" stop-color="#06b6d4" stop-opacity="0"/></radialGradient>
            <radialGradient id="dk" cx="50%" cy="100%" r="60%"><stop offset="0%" stop-color="#000" stop-opacity="0.5"/><stop offset="100%" stop-color="#000" stop-opacity="0"/></radialGradient>
          </defs>
          <rect width="100%" height="160" fill="url(#cg)"/>
          <rect width="100%" height="160" fill="url(#g1)"/>
          <rect width="100%" height="160" fill="url(#g2)"/>
          <rect width="100%" height="160" fill="url(#dk)"/>
          ${Array.from({ length: 8 }, (_, row) => Array.from({ length: 20 }, (_, col) => `<circle cx="${col * 60 + 30}" cy="${row * 24 + 12}" r="1" fill="white" fill-opacity="0.06"/>`).join('')).join('')}
        </svg>
      </div>
      <div class="profile-info-wrap">
        <div class="profile-av-row">
          <div class="av-upload-wrap" id="av-wrap">
            <div class="av lg profile-av-ring" id="profile-av" style="background:${color}">${Utils.getInitials(username)}</div>
            ${isMe ? `<label class="av-upload-overlay" for="av-input" title="Change photo">📷</label><input type="file" id="av-input" accept="image/*"/>` : ''}
          </div>
          <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap" id="profile-actions">
            ${isMe
              ? `<button class="btn btn-ghost btn-sm" id="edit-profile-btn">Edit profile</button>`
              : `<button class="btn btn-ghost btn-sm" id="msg-user-btn">Message</button>
                 <button class="btn-follow" id="follow-btn">Follow</button>
                 <button class="btn btn-ghost btn-sm" id="block-btn" style="color:var(--danger)">🚫</button>`}
          </div>
        </div>
        <div class="profile-uname">${Utils.escapeHtml(username)}</div>
        <div class="profile-handle-text">@${Utils.escapeHtml(username)}</div>
        <div class="profile-bio" id="profile-bio">No bio yet.</div>
        <div class="profile-meta"><span id="profile-joined">📅 Joined</span></div>
        <div class="follow-stats">
          <div class="follow-stat" id="show-following"><strong id="following-count">0</strong> <span>Following</span></div>
          <div class="follow-stat" id="show-followers"><strong id="followers-count">0</strong> <span>Followers</span></div>
          <div class="profile-stat"><strong id="rants-count">0</strong> <span>rants</span></div>
        </div>
      </div>
      <div class="tabs">
        <button class="tab active" data-ptab="rants">Rants</button>
        ${isMe ? `<button class="tab" data-ptab="archived">🗃️ Archived</button>` : ''}
      </div>
      <div id="p-feed"><div style="text-align:center;padding:20px;color:var(--text3)">Loading…</div></div>`;

    if (!isMe) {
      c.querySelector('#back-btn').addEventListener('click', () => navigate('home'));
    }

    // ── Fetch all data needed to fully hydrate the profile ─
    Promise.all([
      Storage.getUserByUsernameAsync(username),
      Storage.getFollowersAsync(username),
      Storage.getFollowingAsync(username),
      fetch('storage_api.php?action=get_blocked').then(r => r.json()).catch(() => []),
      !isMe ? Storage.getFollowingAsync(ME.username) : Promise.resolve([]),
    ]).then(([user, followers, following, blocked, myFollowing]) => {

      const blockCheck = { blocked: (blocked || []).includes(username) };

      // ── Replace avatar with uploaded photo if available ──
      const avEl = c.querySelector('#profile-av');
      if (user && user.avatar && avEl) {
        avEl.outerHTML = `<img src="${user.avatar}" class="av-img" style="width:64px;height:64px;border:4px solid var(--bg);border-radius:50%;object-fit:cover;cursor:${isMe ? 'pointer' : 'default'}">`;
      }

      // Replace default SVG cover with user's custom cover photo
      if (user?.cover) {
        const coverEl = c.querySelector('.profile-cover');
        if (coverEl) coverEl.innerHTML = `<img src="${user.cover}" style="width:100%;height:160px;object-fit:cover;display:block"/>`;
      }

      // Populate bio and join date
      c.querySelector('#profile-bio').textContent = user?.bio || 'No bio yet.';
      if (user?.created_at) {
        c.querySelector('#profile-joined').textContent = '📅 Joined ' + new Date(user.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'long' });
      }

      // Populate follow counts
      c.querySelector('#following-count').textContent = following.length;
      c.querySelector('#followers-count').textContent = followers.length;

      if (!isMe) {
        // ── Other user's profile: Follow / Block / Message buttons ──
        const amFollowing = (myFollowing || []).includes(username);
        const amBlocked   = blockCheck?.blocked || false;
        const actionsEl   = c.querySelector('#profile-actions');

        if (amBlocked) {
          // Show Unblock button only
          actionsEl.innerHTML = `<button class="btn btn-ghost btn-sm" id="unblock-btn">Unblock</button>`;
          actionsEl.querySelector('#unblock-btn').addEventListener('click', () => {
            Storage.unblockUser(ME.username, username);
            Utils.showToast(`@${username} unblocked.`, 'success');
            renderProfile(c, username);
          });
        } else {
          // ── Follow toggle button ────────────────────────
          const followBtn = c.querySelector('#follow-btn');
          if (followBtn) {
            followBtn.textContent = amFollowing ? 'Following' : 'Follow';
            followBtn.classList.toggle('following', amFollowing);
            followBtn.addEventListener('click', () => {
              const nowF = Storage.toggleFollow(ME.username, username);
              followBtn.textContent = nowF ? 'Following' : 'Follow';
              followBtn.classList.toggle('following', nowF);
              // Update follower count display immediately
              const fc = c.querySelector('#followers-count');
              if (fc) fc.textContent = parseInt(fc.textContent) + (nowF ? 1 : -1);
              if (nowF) {
                Storage.addNotification({ to: username, from: ME.username, type: 'follow', message: 'started following you.', rantId: null });
                Utils.showToast(`Following @${username}`, 'success');
              } else {
                Utils.showToast(`Unfollowed @${username}`, 'info');
              }
              refreshBadges();
            });
          }

          // Message button → open DM with this user
          const msgBtn = c.querySelector('#msg-user-btn');
          if (msgBtn) msgBtn.addEventListener('click', () => navigate('messages', { chatWith: username }));

          // Block button → confirm and block the user
          const blockBtn = c.querySelector('#block-btn');
          if (blockBtn) blockBtn.addEventListener('click', () => {
            if (!confirm(`Block @${username}?`)) return;
            Storage.blockUser(ME.username, username);
            Utils.showToast(`@${username} blocked.`, 'info');
            renderProfile(c, username);
          });
        }
      } else {
        // ── Own profile: avatar upload via file input ─────
        const avInput = c.querySelector('#av-input');
        if (avInput) avInput.addEventListener('change', () => {
          const file = avInput.files[0]; if (!file) return;
          const fd = new FormData();
          fd.append('image', file);
          fd.append('type', 'avatar');
          fetch('upload_image.php', { method: 'POST', body: fd })
            .then(r => r.json())
            .then(data => {
              if (data.success) {
                Utils.showToast('Profile photo updated!', 'success');
                renderProfile(c, username);
              } else {
                Utils.showToast(data.error || 'Upload failed', 'error');
              }
            })
            .catch(() => Utils.showToast('Network error', 'error'));
        });
      }

      // Clickable follower/following counts open a modal list
      c.querySelector('#show-followers').addEventListener('click', () => openFollowModal('Followers', followers));
      c.querySelector('#show-following').addEventListener('click', () => openFollowModal('Following', following));

      const pf = c.querySelector('#p-feed');

      /**
       * loadProfileRants()
       * Fetches all rants and filters to only this user's posts,
       * then renders them as cards.
       */
      function loadProfileRants() {
        pf.innerHTML = '<div style="text-align:center;padding:20px;color:var(--text3)">Loading…</div>';
        fetch('api/get_rants.php')
          .then(r => r.json())
          .then(allRants => {
            if (!Array.isArray(allRants)) allRants = [];
            const userRants = allRants.filter(r =>
              r.username === username && !(blocked || []).includes(r.username)
            );
            c.querySelector('#rants-count').textContent = userRants.length;
            pf.innerHTML = '';
            if (!userRants.length) {
              pf.innerHTML = `<div class="empty"><div class="e-icon">🤐</div><p>No rants yet.</p></div>`;
              return;
            }
            userRants.forEach(r => pf.appendChild(buildCard(r, !isMe)));
          })
          .catch(() => {
            pf.innerHTML = `<div class="empty"><div class="e-icon">⚠️</div><p>Error loading rants.</p></div>`;
          });
      }

      /**
       * loadArchivedRants()
       * Fetches the current user's archived rants and renders
       * them with an Unarchive button.
       */
      function loadArchivedRants() {
        pf.innerHTML = '<div style="text-align:center;padding:20px;color:var(--text3)">Loading…</div>';
        Storage.getArchivedRantsAsync()
          .then(rants => {
            if (!Array.isArray(rants)) {
              throw new Error(rants?.error || 'Unexpected archived rants response');
            }
            pf.innerHTML = '';
            if (!rants.length) {
              pf.innerHTML = `<div class="empty"><div class="e-icon">🗃️</div><p>No archived rants.</p></div>`;
              return;
            }
            rants.forEach(r => {
  const card = buildCard(r, true);  // true = readOnly
  const actions = card.querySelector('.post-actions');
  if (actions) {
    // Wipe ALL action buttons, keep only Unarchive + Delete
    actions.innerHTML = `
      <button class="action-btn unarchive-btn" title="Unarchive"><span class="a-icon">📤</span></button>
      <button class="action-btn del-archived-btn" title="Delete"><span class="a-icon">🗑️</span></button>
    `;

    actions.querySelector('.unarchive-btn').addEventListener('click', () => {
      const fd = new FormData();
      fd.append('action', 'unarchive_rant');
      fd.append('rant_id', r.rant_ID || r.id);
      fetch('storage_api.php', { method: 'POST', body: fd })
        .then(res => res.json())
        .then(data => {
          if (data.success) { card.remove(); Utils.showToast('Rant unarchived!', 'success'); }
          else Utils.showToast(data.error || 'Failed to unarchive', 'error');
        })
        .catch(() => Utils.showToast('Network error', 'error'));
    });

    actions.querySelector('.del-archived-btn').addEventListener('click', () => {
      if (!confirm('Delete this rant permanently?')) return;
      const fd = new FormData();
      fd.append('rant_id', r.rant_ID || r.id);
      fetch('api/delete_rant.php', { method: 'POST', body: fd })
        .then(res => res.json())
        .then(data => {
          if (data.success) { card.remove(); Utils.showToast('Deleted.', 'info'); }
          else Utils.showToast(data.message || 'Failed to delete', 'error');
        })
        .catch(() => Utils.showToast('Network error', 'error'));
    });
  }
  pf.appendChild(card);
});
          })
          .catch(err => {
            console.error('Archived rants error:', err);
            pf.innerHTML = `<div class="empty"><div class="e-icon">⚠️</div><p>${Utils.escapeHtml(err.message || 'Error loading archived rants.')}</p></div>`;
          });
      }

      // Profile tab switching (Rants / Archived)
      c.querySelectorAll('.tab[data-ptab]').forEach(tab => {
        tab.addEventListener('click', () => {
          c.querySelectorAll('.tab[data-ptab]').forEach(t => t.classList.remove('active'));
          tab.classList.add('active');
          if (tab.dataset.ptab === 'rants') loadProfileRants();
          else loadArchivedRants();
        });
      });

      loadProfileRants(); // Initial tab load
    });

    // Delayed wire-up for "Edit profile" button (DOM must be ready)
    if (isMe) {
      setTimeout(() => {
        const epBtn = c.querySelector('#edit-profile-btn');
        if (epBtn) epBtn.addEventListener('click', () => openEditProfile());
      }, 100);
    }
  }

  /**
   * openFollowModal(title, userList)
   * Opens a modal listing all followers or following users.
   * Clicking a user navigates to their profile.
   *
   * @param {string}   title    - "Followers" or "Following"
   * @param {string[]} userList - Array of usernames
   */
  function openFollowModal(title, userList) {
    const modal = document.createElement('div'); modal.className = 'modal-overlay';
    const items = userList.length
      ? userList.map(u => `<div class="follow-list-item" data-u="${Utils.escapeHtml(u)}">
          <div class="av sm" style="background:${Utils.getAvatarColor(u)}">${Utils.getInitials(u)}</div>
          <div class="follow-list-info"><div class="fl-name">@${Utils.escapeHtml(u)}</div></div>
        </div>`).join('')
      : `<div class="empty" style="padding:32px"><p>Nobody here yet.</p></div>`;

    modal.innerHTML = `<div class="modal-box" style="padding:0;overflow:hidden;max-height:80vh;display:flex;flex-direction:column">
      <div style="display:flex;align-items:center;justify-content:space-between;padding:18px 20px;border-bottom:1px solid var(--border)">
        <h3 style="margin:0">${title}</h3>
        <button class="btn btn-ghost btn-sm" id="fl-close">✕</button>
      </div>
      <div style="overflow-y:auto">${items}</div></div>`;

    document.body.appendChild(modal);
    requestAnimationFrame(() => modal.classList.add('open'));

    const close = () => { modal.classList.remove('open'); setTimeout(() => modal.remove(), 200); };
    modal.querySelector('#fl-close').addEventListener('click', close);
    modal.querySelectorAll('.follow-list-item').forEach(item => {
      item.addEventListener('click', () => { close(); render('userprofile', { username: item.dataset.u }); });
    });
    modal.addEventListener('click', e => { if (e.target === modal) close(); });
  }

  /**
   * openEditProfile()
   * Opens a modal that allows the current user to update their
   * avatar, cover photo, and bio. Uploads images via upload_image.php.
   */
  function openEditProfile() {
    Storage.getUserByUsernameAsync(ME.username).then(user => {
      const modal = document.createElement('div'); modal.className = 'modal-overlay';
      modal.innerHTML = `<div class="modal-box">
          <h3>Edit Profile</h3>
          <!-- Avatar upload field -->
          <div class="settings-field">
              <label>Profile Photo</label>
              <div style="display:flex;align-items:center;gap:12px;margin-top:6px">
                  <div id="ep-av-preview" style="width:56px;height:56px;border-radius:50%;background:${Utils.getAvatarColor(ME.username)};display:flex;align-items:center;justify-content:center;font-size:20px;font-weight:700;overflow:hidden">
                      ${user?.avatar ? `<img src="${user.avatar}" style="width:100%;height:100%;object-fit:cover"/>` : Utils.getInitials(ME.username)}
                  </div>
                  <label class="btn btn-ghost btn-sm" for="ep-av-input" style="cursor:pointer">📷 Change Photo</label>
                  <input type="file" id="ep-av-input" accept="image/*" style="display:none"/>
              </div>
          </div>
          <!-- Cover photo upload field -->
          <div class="settings-field" style="margin-top:14px">
              <label>Cover Photo</label>
              <div style="margin-top:6px;border-radius:8px;overflow:hidden;height:80px;background:linear-gradient(135deg,#4c1d95,#7c3aed,#06b6d4);position:relative">
                  <div id="ep-cover-preview" style="width:100%;height:100%;background-size:cover;background-position:center">
                      ${user?.cover ? `<img src="${user.cover}" style="width:100%;height:100%;object-fit:cover"/>` : ''}
                  </div>
                  <label class="btn btn-ghost btn-xs" for="ep-cover-input" style="position:absolute;bottom:6px;right:6px;cursor:pointer;background:rgba(0,0,0,0.5)">📷 Change</label>
                  <input type="file" id="ep-cover-input" accept="image/*" style="display:none"/>
              </div>
          </div>
          <!-- Bio textarea -->
          <div class="settings-field" style="margin-top:14px">
              <label>Bio</label>
              <textarea id="bio-in" rows="3" placeholder="Tell people about yourself…">${Utils.escapeHtml(user?.bio || '')}</textarea>
          </div>
          <div class="modal-actions">
              <button class="btn btn-ghost btn-sm" id="ep-cancel">Cancel</button>
              <button class="btn btn-primary btn-sm" id="ep-save">Save</button>
          </div>
      </div>`;

      document.body.appendChild(modal);
      requestAnimationFrame(() => modal.classList.add('open'));

      // Avatar file input: preview the selected image inline
      modal.querySelector('#ep-av-input').addEventListener('change', function () {
        const file = this.files[0]; if (!file) return;
        const reader = new FileReader();
        reader.onload = e => {
          modal.querySelector('#ep-av-preview').innerHTML = `<img src="${e.target.result}" style="width:100%;height:100%;object-fit:cover"/>`;
          modal.querySelector('#ep-av-input')._base64 = e.target.result;
        };
        reader.readAsDataURL(file);
      });

      // Cover photo file input: preview inline
      modal.querySelector('#ep-cover-input').addEventListener('change', function () {
        const file = this.files[0]; if (!file) return;
        const reader = new FileReader();
        reader.onload = e => {
          modal.querySelector('#ep-cover-preview').innerHTML = `<img src="${e.target.result}" style="width:100%;height:100%;object-fit:cover"/>`;
          modal.querySelector('#ep-cover-input')._base64 = e.target.result;
        };
        reader.readAsDataURL(file);
      });

      // Cancel button
      modal.querySelector('#ep-cancel').addEventListener('click', () => {
        modal.classList.remove('open'); setTimeout(() => modal.remove(), 200);
      });

      // Save button: upload avatar, cover, and bio in sequence
      modal.querySelector('#ep-save').addEventListener('click', async () => {
        const saveBtn = modal.querySelector('#ep-save');
        saveBtn.disabled = true; saveBtn.textContent = 'Saving…';

        const bio     = modal.querySelector('#bio-in').value.trim();
        const avFile  = modal.querySelector('#ep-av-input').files[0];
        const covFile = modal.querySelector('#ep-cover-input').files[0];

        // Upload avatar if a new file was selected
        if (avFile) {
          const fd = new FormData();
          fd.append('image', avFile); fd.append('type', 'avatar');
          const res = await fetch('upload_image.php', { method: 'POST', body: fd }).then(r => r.json());
          if (!res.success) {
            Utils.showToast(res.error || 'Avatar upload failed', 'error');
            saveBtn.disabled = false; saveBtn.textContent = 'Save'; return;
          }
        }

        // Upload cover photo if a new file was selected
        if (covFile) {
          const fd = new FormData();
          fd.append('image', covFile); fd.append('type', 'cover');
          const res = await fetch('upload_image.php', { method: 'POST', body: fd }).then(r => r.json());
          if (!res.success) {
            Utils.showToast(res.error || 'Cover upload failed', 'error');
            saveBtn.disabled = false; saveBtn.textContent = 'Save'; return;
          }
        }

        // Save bio locally and close
        Storage.updateUser(ME.username, { bio });
        modal.classList.remove('open'); setTimeout(() => modal.remove(), 200);
        Utils.showToast('Profile updated!', 'success');
        navigate('profile');
      });
    });
  }


  // ════════════════════════════════════════════════════════════
  // PAGE: SETTINGS
  // Account settings: theme toggle, bio editor, password change,
  // blocked users list, and logout.
  // ════════════════════════════════════════════════════════════

  /**
   * renderSettings(c)
   * Renders the Settings page with all account management
   * options.
   *
   * @param {HTMLElement} c - The center column container
   */
  function renderSettings(c) {
    const theme = Storage.getTheme();
    c.innerHTML = `
      <div class="page-hdr"><h2>Settings</h2></div>
      <!-- Appearance section -->
      <div class="settings-section">
        <h3>Appearance</h3>
        <div class="settings-row">
          <div><label>Dark Mode</label><small>Toggle between dark and light theme</small></div>
          <label class="toggle-switch">
            <input type="checkbox" id="theme-check" ${theme === 'dark' ? 'checked' : ''}/>
            <span class="toggle-track"></span>
          </label>
        </div>
      </div>
      <!-- Account / bio section -->
      <div class="settings-section">
        <h3>Account</h3>
        <div class="settings-field"><label>Username</label><input type="text" value="${Utils.escapeHtml(ME.username)}" disabled style="opacity:0.5"/></div>
        <div class="settings-field"><label>Bio</label><textarea id="set-bio" rows="3" placeholder="Loading…"></textarea></div>
        <button class="btn btn-primary btn-sm" id="save-bio">Save Bio</button>
      </div>
      <!-- Password change section -->
      <div class="settings-section">
        <h3>Change Password</h3>
        <div class="settings-field"><label>Current Password</label><input type="password" id="cur-pw" placeholder="••••••••"/></div>
        <div class="settings-field"><label>New Password</label><input type="password" id="new-pw" placeholder="••••••••"/></div>
        <div class="settings-field"><label>Confirm New</label><input type="password" id="con-pw" placeholder="••••••••"/></div>
        <button class="btn btn-primary btn-sm" id="save-pw">Update Password</button>
      </div>
      <!-- Blocked users section (populated async) -->
      <div class="settings-section" id="blocked-section">
        <h3>Blocked Users</h3>
        <p style="font-size:14px;color:var(--text3)">Loading…</p>
      </div>
      <!-- Danger zone: logout -->
      <div class="settings-section">
        <h3>Danger Zone</h3>
        <button class="btn btn-danger-soft btn-sm" id="logout-set">Log Out</button>
      </div>`;

    // Pre-fill bio textarea with saved value
    Storage.getUserByUsernameAsync(ME.username).then(user => {
      const bioEl = c.querySelector('#set-bio');
      if (bioEl) bioEl.value = user?.bio || '';
    });

    // Render blocked users list with Unblock buttons
    fetch('storage_api.php?action=get_blocked').then(r => r.json()).then(blocked => {
      const sec = c.querySelector('#blocked-section');
      sec.innerHTML = `<h3>Blocked Users</h3>` + (blocked.length
        ? blocked.map(u => `<div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid var(--border)">
              <div class="av xs" style="background:${Utils.getAvatarColor(u)}">${Utils.getInitials(u)}</div>
              <span style="flex:1;font-size:14px">@${Utils.escapeHtml(u)}</span>
              <button class="btn btn-ghost btn-xs unblock-btn" data-u="${u}">Unblock</button>
            </div>`).join('')
        : '<p style="font-size:14px;color:var(--text3)">No blocked users.</p>');
      sec.querySelectorAll('.unblock-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          Storage.unblockUser(ME.username, btn.dataset.u);
          Utils.showToast('Unblocked.', 'success');
          renderSettings(c);
        });
      });
    });

    // Wire settings action handlers
    c.querySelector('#theme-check').addEventListener('change', e => {
      const next = e.target.checked ? 'dark' : 'light';
      Storage.setTheme(next); applyTheme(next);
    });
    c.querySelector('#save-bio').addEventListener('click', () => {
      Storage.updateUser(ME.username, { bio: c.querySelector('#set-bio').value.trim() });
      Utils.showToast('Bio saved!', 'success');
    });
    c.querySelector('#logout-set').addEventListener('click', () => Auth.logout());
    c.querySelector('#save-pw').addEventListener('click', () => {
      const cur = c.querySelector('#cur-pw').value;
      const nw  = c.querySelector('#new-pw').value;
      const cn  = c.querySelector('#con-pw').value;
      if (nw.length < 6) { Utils.showToast('New password too short.', 'error'); return; }
      if (nw !== cn)     { Utils.showToast('Passwords do not match.', 'error'); return; }
      Storage.updateUser(ME.username, { password: nw });
      Utils.showToast('Password updated!', 'success');
      c.querySelector('#cur-pw').value = '';
      c.querySelector('#new-pw').value = '';
      c.querySelector('#con-pw').value = '';
    });
  }


  // ════════════════════════════════════════════════════════════
  // REPORT MODAL
  // Allows a user to flag a rant for one of several preset
  // reasons. Submitted via report_rant.php.
  // ════════════════════════════════════════════════════════════

  /**
   * openReportModal(rant)
   * Opens a modal with radio-button reason choices and
   * submits the report to the server.
   *
   * @param {object} rant - The rant object being reported
   */
  function openReportModal(rant) {
    const modal = document.createElement('div'); modal.className = 'modal-overlay';

    const reasons = [
      ['hate_speech',      'Hate speech'],
      ['harassment',       'Harassment'],
      ['spam',             'Spam'],
      ['misinformation',   'Misinformation'],
      ['explicit_content', 'Explicit content'],
      ['other',            'Other']
    ];

    const reasonsHTML = reasons.map(([val, label]) =>
  `<label style="display:flex;align-items:center;gap:12px;cursor:pointer;font-size:14px;padding:10px 14px;border-radius:8px;border:1px solid var(--border);width:100%;box-sizing:border-box;">
    <input type="radio" name="report-reason" value="${val}" style="width:16px;height:16px;flex-shrink:0;accent-color:var(--accent);cursor:pointer;"/>
    <span style="flex:1;">${label}</span>
  </label>`
).join('');

    modal.innerHTML = `<div class="modal-box">
  <h3>Report Rant</h3>
  <p style="font-size:14px;color:var(--text2);margin-bottom:16px">Why are you reporting this rant?</p>
  <div style="display:flex;flex-direction:column;gap:8px">${reasonsHTML}</div>
  <div id="other-desc-wrap" style="display:none;margin-top:10px">
    <textarea id="other-desc" rows="3" placeholder="Please describe the issue..." 
      style="width:100%;box-sizing:border-box;padding:10px;border-radius:8px;border:1px solid var(--border);background:var(--surface2);color:var(--text1);font-size:14px;resize:vertical"></textarea>
  </div>
  <div class="modal-actions">
    <button class="btn btn-ghost btn-sm" id="r-cancel">Cancel</button>
    <button class="btn btn-danger-soft btn-sm" id="r-submit">Submit Report</button>
  </div></div>`;

    document.body.appendChild(modal);
    requestAnimationFrame(() => modal.classList.add('open'));
    // Show textarea when "Other" is selected
modal.querySelectorAll('input[name="report-reason"]').forEach(radio => {
  radio.addEventListener('change', () => {
    const wrap = modal.querySelector('#other-desc-wrap');
    wrap.style.display = radio.value === 'other' ? 'block' : 'none';
  });
});

    modal.querySelector('#r-cancel').addEventListener('click', () => {
      modal.classList.remove('open'); setTimeout(() => modal.remove(), 200);
    });

    modal.querySelector('#r-submit').addEventListener('click', () => {
  const reason = modal.querySelector('input[name="report-reason"]:checked');
  if (!reason) { Utils.showToast('Pick a reason.', 'warning'); return; }

  const otherDesc = modal.querySelector('#other-desc').value.trim();
  if (reason.value === 'other' && !otherDesc) {
    Utils.showToast('Please describe the issue.', 'warning'); return;
  }

  const submitBtn = modal.querySelector('#r-submit');
  submitBtn.disabled = true; submitBtn.textContent = 'Submitting…';

  const formData = new FormData();
  formData.append('rant_id', rant.id || rant.rant_ID);
  formData.append('reason', reason.value);
  if (reason.value === 'other') formData.append('description', otherDesc);

  fetch('report_rant.php', { method: 'POST', body: formData })
    .then(r => r.json())
    .then(data => {
      modal.classList.remove('open'); setTimeout(() => modal.remove(), 200);
      if (data.ok)                                Utils.showToast('Reported. Thank you.', 'success');
      else if (data.error === 'Already reported') Utils.showToast('You already reported this rant.', 'warning');
      else                                        Utils.showToast(data.error || 'Something went wrong.', 'error');
    })
    .catch(() => {
      Utils.showToast('Network error. Try again.', 'error');
      submitBtn.disabled = false; submitBtn.textContent = 'Submit Report';
    });
});

    // Click outside modal → close
    modal.addEventListener('click', e => {
      if (e.target === modal) { modal.classList.remove('open'); setTimeout(() => modal.remove(), 200); }
    });
  }


  // ════════════════════════════════════════════════════════════
  // COMMENTS
  // Handles fetching, rendering, reacting to, replying to,
  // and deleting comments on individual rant posts.
  // ════════════════════════════════════════════════════════════

  /**
   * loadComments(rantId, container)
   * Fetches comments for a rant from get_comments.php and
   * renders each one via buildCommentItem().
   *
   * @param {string|number} rantId    - The rant's ID
   * @param {HTMLElement}   container - The card's right-side element
   */
  function loadComments(rantId, container) {
    const list = container.querySelector(`#cl-${rantId}`);
    if (!list) return;
    list.innerHTML = '<div style="font-size:13px;color:var(--text3);padding:8px 0">Loading…</div>';

    fetch(`get_comments.php?rant_id=${rantId}`)
      .then(r => r.json())
      .then(comments => {
        list.innerHTML = '';
        if (!Array.isArray(comments) || !comments.length) {
          list.innerHTML = `<div style="font-size:13px;color:var(--text3);padding:8px 0">No comments yet.</div>`;
          return;
        }
        comments.forEach(cm => list.appendChild(
          buildCommentItem(
            { id: cm.comment_ID || cm.comment_id, username: cm.username, text: cm.comment_text, createdAt: cm.created_at, reactions: cm.reactions || {}, user_reaction: cm.user_reaction || null },
            rantId, container
          )
        ));
      })
      .catch(() => {
        list.innerHTML = `<div style="font-size:13px;color:var(--danger);padding:8px 0">Failed to load comments.</div>`;
      });
  }

  /**
   * buildCommentItem(cm, rantId, container)
   * Builds and returns a comment DOM element including the
   * avatar, text, reactions, reply input, and delete option.
   *
   * @param {object}      cm        - Comment data object
   * @param {string|number} rantId  - Parent rant ID
   * @param {HTMLElement} container - The card's right-side element
   * @returns {HTMLElement}
   */
  function buildCommentItem(cm, rantId, container) {
    const isOwn = cm.username === ME.username;

    // Build initial reaction chips HTML
    const initReactions   = cm.reactions || {};
    const initUserReaction = cm.user_reaction || null;
    const initChips = Object.entries(initReactions)
      .filter(([, count]) => count > 0)
      .map(([emoji, count]) =>
        `<div class="reaction-chip cm-reaction-chip ${initUserReaction === emoji ? 'mine' : ''}" data-emoji="${emoji}" data-cid="${cm.id}">${emoji} ${count}</div>`
      ).join('');

    const wrap = document.createElement('div'); wrap.className = 'comment-wrap'; wrap.dataset.cid = cm.id;
    const row  = document.createElement('div'); row.className = 'comment-item';

    // Avatar (clickable → user profile)
    const av = Utils.avatar(cm.username, 'xs');
    av.style.cursor = 'pointer';
    av.addEventListener('click', () => render('userprofile', { username: cm.username }));

    const body = document.createElement('div'); body.className = 'comment-body';
    body.innerHTML = `
      <div class="comment-header">
        <span class="comment-name" style="cursor:pointer">@${Utils.escapeHtml(cm.username)}</span>
        <span class="comment-time">${Utils.timeAgo(cm.createdAt)}</span>
      </div>
      <div class="comment-text">${Utils.escapeHtml(cm.text)}</div>
      <div class="reactions-row" id="crr-${cm.id}">${initChips}</div>
      <div class="comment-actions">
        <div class="reactions-wrap">
          <button class="cm-action-btn cm-react-btn" title="React"><span class="cm-react-icon">${initUserReaction || '😊'}</span></button>
          <div class="reaction-picker" id="crp-${cm.id}">${REACTIONS.map(e => `<button class="r-emoji cm-r-emoji" data-emoji="${e}" data-cid="${cm.id}">${e}</button>`).join('')}</div>
        </div>
        <button class="cm-action-btn cm-reply-btn">↩ Reply</button>
        ${isOwn ? `<button class="cm-action-btn cm-del-btn" style="color:var(--danger)">🗑</button>` : ''}
      </div>
      <!-- Inline reply input (hidden by default) -->
      <div class="cm-reply-input" style="display:none;margin-top:8px">
        <div style="display:flex;gap:8px;align-items:center">
          <div class="av xs" style="background:${Utils.getAvatarColor(ME.username)}">${Utils.getInitials(ME.username)}</div>
          <input type="text" class="cm-reply-ta" placeholder="Reply to @${Utils.escapeHtml(cm.username)}…" maxlength="200"/>
          <button class="btn btn-primary btn-xs cm-send-reply">Post</button>
          <button class="btn btn-ghost btn-xs cm-cancel-reply">✕</button>
        </div>
      </div>`;

    // Username click → profile
    body.querySelector('.comment-name').addEventListener('click', () => render('userprofile', { username: cm.username }));

    /**
     * postCommentReaction(emoji, cid)
     * Sends a reaction to a specific comment and updates
     * the reaction chips display.
     *
     * @param {string} emoji - The emoji reaction
     * @param {string} cid   - Comment ID
     */
    async function postCommentReaction(emoji, cid) {
      const formData = new FormData();
      formData.append('comment_id', cid); formData.append('reaction_type', emoji);
      try {
        const response = await fetch('save_comment_reaction.php', { method: 'POST', body: formData });
        const data = await response.json();
        if (data.success) {
          updateCommentReactionChips(cid, data.reactions, data.user_reaction, body);
          body.querySelector('.cm-react-icon').textContent = data.user_reaction || '😊';
          body.querySelector(`#crp-${cid}`).classList.remove('open');
        } else Utils.showToast(data.message || 'Failed to react', 'error');
      } catch (err) { Utils.showToast('Network error', 'error'); }
    }

    // React button toggles picker; picker emoji clicks submit reaction
    body.querySelector('.cm-react-btn').addEventListener('click', e => {
      e.stopPropagation();
      document.querySelectorAll('.reaction-picker.open').forEach(p => p.classList.remove('open'));
      body.querySelector(`#crp-${cm.id}`).classList.toggle('open');
    });
    body.querySelectorAll('.cm-r-emoji').forEach(btn =>
      btn.addEventListener('click', e => { e.stopPropagation(); postCommentReaction(btn.dataset.emoji, btn.dataset.cid); })
    );
    // Clicking an existing reaction chip also toggles it
    body.addEventListener('click', e => {
      const chip = e.target.closest('.cm-reaction-chip');
      if (chip) { e.stopPropagation(); postCommentReaction(chip.dataset.emoji, chip.dataset.cid); }
    });

    // Reply button toggles the inline reply input
    body.querySelector('.cm-reply-btn').addEventListener('click', () => {
      const inp = body.querySelector('.cm-reply-input');
      const isOpen = inp.style.display !== 'none';
      inp.style.display = isOpen ? 'none' : 'block';
      if (!isOpen) inp.querySelector('.cm-reply-ta').focus();
    });
    body.querySelector('.cm-cancel-reply').addEventListener('click', () => {
      body.querySelector('.cm-reply-input').style.display = 'none';
    });

    /**
     * sendReply()
     * Submits a reply to this comment via save_comment.php
     * with the parent_id set. Reloads comments on success.
     */
    function sendReply() {
      const ta = body.querySelector('.cm-reply-ta');
      const text = ta.value.trim(); if (!text) return;
      const formData = new FormData();
      formData.append('rant_id', rantId);
      formData.append('comment_text', text);
      if (cm.id) formData.append('parent_id', cm.id);
      fetch('save_comment.php', { method: 'POST', body: formData })
        .then(r => r.json())
        .then(data => {
          if (data.success) {
            ta.value = '';
            body.querySelector('.cm-reply-input').style.display = 'none';
            loadComments(rantId, container);
          } else {
            Utils.showToast('Error: ' + (data.message || 'Unknown error'), 'error');
          }
        })
        .catch(() => Utils.showToast('Network error posting reply', 'error'));
    }
    body.querySelector('.cm-send-reply').addEventListener('click', sendReply);
    body.querySelector('.cm-reply-ta').addEventListener('keydown', e => { if (e.key === 'Enter') sendReply(); });

    // Delete button (own comments only)
    if (isOwn) {
      body.querySelector('.cm-del-btn').addEventListener('click', () => {
        if (!confirm('Delete this comment?')) return;
        const formData = new FormData(); formData.append('comment_id', cm.id);
        fetch('delete_comment.php', { method: 'POST', body: formData })
          .then(r => r.json())
          .then(data => {
            if (data.success) { wrap.remove(); Utils.showToast('Comment deleted.', 'info'); }
            else Utils.showToast(data.message || 'Failed to delete', 'error');
          })
          .catch(() => Utils.showToast('Network error', 'error'));
      });
    }

    row.appendChild(av); row.appendChild(body); wrap.appendChild(row);
    return wrap;
  }

  /**
   * updateCommentReactionChips(cid, reactions, userReaction, container)
   * Re-renders the emoji reaction chips for a comment after
   * a reaction is posted.
   *
   * @param {string}  cid          - Comment ID
   * @param {object}  reactions    - { emoji: count } map
   * @param {string}  userReaction - The current user's chosen emoji
   * @param {HTMLElement} container - Comment body element
   */
  function updateCommentReactionChips(cid, reactions, userReaction, container) {
    const row = container.querySelector(`#crr-${cid}`); if (!row) return;
    const entries = Object.entries(reactions || {});
    row.innerHTML = entries.length
      ? entries.map(([emoji, count]) =>
          `<div class="reaction-chip cm-reaction-chip ${userReaction === emoji ? 'mine' : ''}" data-emoji="${emoji}" data-cid="${cid}">${emoji} ${count}</div>`
        ).join('')
      : '';
  }


  // ════════════════════════════════════════════════════════════
  // BUILD POST CARD
  // Creates the full DOM element for a single rant post,
  // including avatar, content, reactions, comments toggle,
  // repost, edit, archive, and delete actions.
  // ════════════════════════════════════════════════════════════

  /**
   * buildCard(rant, readOnly)
   * Constructs and returns a post card element for a given rant.
   *
   * @param {object}  rant     - Rant data object from the API
   * @param {boolean} readOnly - If true, hides edit/delete controls
   * @returns {HTMLElement}
   */
  function buildCard(rant, readOnly = false) {
    const isOwn      = rant.username === ME.username;
    const isAnon     = !!rant.anonymous;
    const isArchived = !!rant.is_archived || !!rant.isArchived;
    // Show real username only if: not anon, OR it's the user's own anon post, OR viewer is admin
    const showReal   = !isAnon || isOwn || ME.role === 'admin';
    const dispName    = showReal ? rant.username : 'Anonymous';
    const dispColor   = showReal ? Utils.getAvatarColor(rant.username) : '#444455';
    const reactions   = rant.reactions || {};
    const initialReactIcon  = rant.user_reaction || '😊';
    const rantId            = rant.id || rant.rant_ID;
    const totalComments     = rant.comment_count || 0;

    const card = document.createElement('div');
    card.className = 'post-card'; card.dataset.id = rantId;

    // ── Avatar column ─────────────────────────────────────
    const av = document.createElement('div');
    av.className = 'av'; av.style.background = dispColor; av.style.flexShrink = '0';
    if (showReal && rant.avatar) {
      av.style.background = 'none';
      av.innerHTML = `<img src="${rant.avatar}" style="width:40px;height:40px;border-radius:50%;object-fit:cover;cursor:pointer"/>`;
    } else {
      av.textContent = showReal ? Utils.getInitials(rant.username) : '👻';
      if (!showReal) av.style.fontSize = '20px';
    }
    if (showReal) { av.style.cursor = 'pointer'; av.addEventListener('click', () => render('userprofile', { username: rant.username })); }
    card.appendChild(av);

    // ── Right content column ──────────────────────────────
    const right = document.createElement('div'); right.className = 'post-right';

    // Repost banner (if this is a reposted rant)
    const repostHTML = rant.repostOf
      ? `<div class="repost-banner">🔁 Reposted from <strong>@${Utils.escapeHtml(rant.repostOf.username)}</strong></div>`
      : '';
    // Notice shown when the original of a repost has been deleted
    const deletedNotice = (rant.repost_of_id && rant.is_original_deleted)
      ? `<div class="deleted-notice" style="font-size:13px;color:var(--text3);font-style:italic;padding:8px 0">🗑️ The original rant has been deleted.</div>`
      : '';
    // Reaction chip HTML for current reaction state
    const reactionChips = Object.entries(reactions)
      .filter(([, count]) => count > 0)
      .map(([emoji, count]) =>
        `<div class="reaction-chip ${rant.user_reaction === emoji ? 'mine' : ''}" data-emoji="${emoji}" data-id="${rantId}">${emoji} ${count}</div>`
      ).join('');

    right.innerHTML = `
      ${repostHTML}
      ${deletedNotice}
      <div class="post-top">
        <span class="post-name ${showReal ? '' : 'anon-name'}" ${showReal ? `data-u="${rant.username}"` : ''}>${isAnon ? '👻 ' : ''}@${Utils.escapeHtml(dispName)}</span>
        ${isAnon && isOwn ? '<span class="anon-badge">only you</span>' : ''}
        <span class="post-sep">·</span>
        <span class="post-time" data-ts="${rant.created_at || rant.createdAt}">${Utils.timeAgo(rant.created_at || rant.createdAt)}</span>
        ${rant.updated_at || rant.updatedAt ? '<span class="post-edited">edited</span>' : ''}
      </div>
      <div class="post-text">${rant.is_original_deleted ? '' : Utils.escapeHtml(rant.content)}</div>
      <!-- Live reaction chips row -->
      <div class="reactions-row" id="rr-${rantId}">${reactionChips}</div>
      <!-- Action bar -->
      <div class="post-actions">
        <div class="reactions-wrap">
          <button class="action-btn react-btn" data-id="${rantId}" title="React"><span class="a-icon">${initialReactIcon}</span></button>
          <div class="reaction-picker" id="rp-${rantId}">${REACTIONS.map(e => `<button class="r-emoji" data-emoji="${e}" data-id="${rantId}">${e}</button>`).join('')}</div>
        </div>
        <button class="action-btn comment-toggle-btn" data-id="${rantId}">
          <span class="a-icon">💬</span><span class="comment-count">${totalComments || ''}</span>
        </button>
        ${!isAnon ? `<button class="action-btn repost-btn" data-id="${rantId}" title="Repost"><span class="a-icon">🔁</span></button>` : ''}
        ${!readOnly && isOwn ? (isArchived
            ? `<button class="action-btn del-act"><span class="a-icon">🗑️</span></button>`
            : `<button class="action-btn edit-btn"><span class="a-icon">✏️</span></button><button class="action-btn archive-btn" title="Archive"><span class="a-icon">🗃️</span></button><button class="action-btn del-act"><span class="a-icon">🗑️</span></button>`)
          : ''}
        ${!isOwn ? `<button class="action-btn report-btn" data-id="${rantId}" title="Report" style="margin-left:auto"><span class="a-icon">🚩</span></button>` : ''}
      </div>
      <!-- Inline edit form (hidden by default) -->
      <div class="inline-edit" id="edit-${rantId}">
        <textarea maxlength="${MAX}">${Utils.escapeHtml(rant.content)}</textarea>
        <div class="inline-edit-bar">
          <span class="ec">${rant.content.length} / ${MAX}</span>
          <div style="display:flex;gap:8px">
            <button class="btn btn-ghost btn-xs cancel-edit">Cancel</button>
            <button class="btn btn-primary btn-xs save-edit">Save</button>
          </div>
        </div>
      </div>
      <!-- Comment section (hidden by default) -->
      <div class="comments-section" id="cs-${rantId}">
        <div class="comment-input-row">
          <div class="av xs" style="background:${Utils.getAvatarColor(ME.username)}">${Utils.getInitials(ME.username)}</div>
          <input type="text" placeholder="Add a comment…" class="comment-input" maxlength="200"/>
          <button class="btn btn-primary btn-xs send-comment">Post</button>
        </div>
        <div class="comment-list" id="cl-${rantId}"></div>
      </div>`;

    card.appendChild(right);

    // Clicking the author name → their profile
    if (showReal) {
      const nameEl = right.querySelector('.post-name');
      nameEl.style.cursor = 'pointer';
      nameEl.addEventListener('click', () => render('userprofile', { username: rant.username }));
    }

    // ── Reaction picker toggle ────────────────────────────
    right.querySelector('.react-btn').addEventListener('click', e => {
      e.stopPropagation();
      document.querySelectorAll('.reaction-picker.open').forEach(p => p.classList.remove('open'));
      right.querySelector(`#rp-${rantId}`).classList.toggle('open');
    });

    /**
     * handleReaction(emoji, id)
     * Sends a reaction to a rant via the API and updates the
     * chip display and button icon. Sends a notification if
     * reacting to someone else's public rant.
     *
     * @param {string} emoji - Emoji character
     * @param {string} id    - Rant ID
     */
    async function handleReaction(emoji, id) {
      const formData = new FormData();
      formData.append('rant_id', id); formData.append('reaction_type', emoji);
      try {
        const response = await fetch('api/save_reaction.php', { method: 'POST', body: formData });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();
        if (data.success) {
          updateReactionChips(id, data.reactions, data.user_reaction, right);
          right.querySelector('.react-btn .a-icon').textContent = data.user_reaction || '😊';
          right.querySelector(`#rp-${id}`).classList.remove('open');
          // Notify the rant author if it's not our own post
          if (rant.username !== ME.username && !rant.anonymous && data.user_reaction) {
            Storage.addNotification({ to: rant.username, from: ME.username, type: 'reaction', message: `reacted ${emoji} to your rant.`, rantId: id });
            refreshBadges();
          }
        } else Utils.showToast(data.message || 'Failed to react', 'error');
      } catch (err) { Utils.showToast('Network error posting reaction', 'error'); }
    }

    // Wire emoji buttons in the picker
    right.querySelectorAll('.r-emoji').forEach(btn =>
      btn.addEventListener('click', e => { e.stopPropagation(); handleReaction(btn.dataset.emoji, btn.dataset.id); })
    );
    // Clicking an existing chip also toggles/changes the reaction
    right.addEventListener('click', e => {
      const chip = e.target.closest('.reaction-chip:not(.cm-reaction-chip)');
      if (chip) { e.stopPropagation(); handleReaction(chip.dataset.emoji, chip.dataset.id); }
    });

    // ── Repost button ─────────────────────────────────────
    const repostBtn = right.querySelector('.repost-btn');
    if (repostBtn) repostBtn.addEventListener('click', () => {
      if (!confirm(`Repost this rant from @${rant.username}?`)) return;
      Storage.repostAsync(rantId).then(data => {
        if (data && data.error) {
          Utils.showToast(data.error === 'Already reposted' ? 'You already reposted this!' : data.error, 'warning');
          return;
        }
        Utils.showToast('Reposted!', 'success');
        if (currentPage === 'home') render('home');
        if (rant.username !== ME.username) {
          Storage.addNotification({ to: rant.username, from: ME.username, type: 'repost', message: 'reposted your rant.', rantId });
          refreshBadges();
        }
      });
    });

    // ── Report button ─────────────────────────────────────
    const reportBtn = right.querySelector('.report-btn');
    if (reportBtn) reportBtn.addEventListener('click', () => openReportModal(rant));

    // ── Comments toggle ───────────────────────────────────
    right.querySelector('.comment-toggle-btn').addEventListener('click', () => {
      const cs = right.querySelector(`#cs-${rantId}`);
      cs.classList.toggle('open');
      if (cs.classList.contains('open')) loadComments(rantId, right); // Load on first open
    });

    /**
     * sendComment()
     * Submits a new top-level comment via save_comment.php,
     * reloads the comment list, and sends a notification.
     */
    function sendComment() {
      const inp  = right.querySelector('.comment-input');
      const text = inp.value.trim(); if (!text) return;
      const formData = new FormData();
      formData.append('rant_id', rantId); formData.append('comment_text', text);
      fetch('save_comment.php', { method: 'POST', body: formData })
        .then(r => r.json())
        .then(data => {
          if (data.success) {
            inp.value = ''; loadComments(rantId, right);
            if (rant.username !== ME.username && !isAnon) {
              Storage.addNotification({ to: rant.username, from: ME.username, type: 'comment', message: 'commented on your rant.', rantId });
              refreshBadges();
            }
            if (data.comment_count !== undefined) right.querySelector('.comment-count').textContent = data.comment_count || '';
            Utils.showToast('Comment posted!', 'success');
          } else {
            Utils.showToast(`Failed to post comment: ${data.message || 'Unknown error'}`, 'error');
          }
        })
        .catch(() => Utils.showToast('Error posting comment', 'error'));
    }
    right.querySelector('.send-comment').addEventListener('click', sendComment);
    right.querySelector('.comment-input').addEventListener('keydown', e => { if (e.key === 'Enter') sendComment(); });

    // ── Edit / Archive / Delete (own posts only) ──────────
    if (!readOnly && isOwn) {
      const editSection = right.querySelector(`#edit-${rantId}`);
      const editTa      = editSection.querySelector('textarea');
      const ec          = editSection.querySelector('.ec');

      // Edit button: show inline editor, hide post content and actions
      right.querySelector('.edit-btn').addEventListener('click', () => {
        editSection.style.display = 'block';
        right.querySelector('.post-text').style.display    = 'none';
        right.querySelector('.post-actions').style.display = 'none';
        editTa.focus();
      });

      // Cancel edit: restore original view
      editSection.querySelector('.cancel-edit').addEventListener('click', () => {
        editSection.style.display = 'none';
        right.querySelector('.post-text').style.display    = '';
        right.querySelector('.post-actions').style.display = '';
      });

      // Character counter in inline editor
      editTa.addEventListener('input', () => {
        const l = editTa.value.length;
        ec.textContent = `${l} / ${MAX}`;
        ec.className = 'ec' + (l > MAX ? ' over' : '');
        editSection.querySelector('.save-edit').disabled = l === 0 || l > MAX;
      });

      // Save edit: submit to edit_rant.php
      editSection.querySelector('.save-edit').addEventListener('click', () => {
        const nc = editTa.value.trim(); if (!nc || nc.length > MAX) return;
        const fd = new FormData(); fd.append('rant_id', rantId); fd.append('content', nc);
        fetch('edit_rant.php', { method: 'POST', body: fd })
          .then(r => r.json())
          .then(data => {
            if (data.success) {
              Utils.showToast('Updated!', 'success');
              right.querySelector('.post-text').textContent    = nc;
              editSection.style.display = 'none';
              right.querySelector('.post-text').style.display    = '';
              right.querySelector('.post-actions').style.display = '';
            } else {
              Utils.showToast(data.message || 'Failed to update', 'error');
            }
          })
          .catch(() => Utils.showToast('Network error', 'error'));
      });

      // Delete rant: confirm, then call api/delete_rant.php
      right.querySelector('.del-act').addEventListener('click', () => {
        if (!confirm('Delete this rant?')) return;
        const formData = new FormData(); formData.append('rant_id', rantId);
        fetch('api/delete_rant.php', { method: 'POST', body: formData })
          .then(res => res.json())
          .then(data => {
            if (data.success) {
              Utils.showToast('Deleted.', 'info');
              render(currentPage); renderRight();
            } else {
              Utils.showToast(data.message || 'Failed to delete', 'error');
            }
          })
          .catch(() => Utils.showToast('Network error deleting rant', 'error'));
      });
    }

    // ── Archive button ────────────────────────────────────
    const archiveBtn = right.querySelector('.archive-btn');
    if (archiveBtn) archiveBtn.addEventListener('click', () => {
      if (!confirm('Archive this rant? It will be hidden from your feed.')) return;
      const fd = new FormData(); fd.append('action', 'archive_rant'); fd.append('rant_id', rantId);
      fetch('storage_api.php', { method: 'POST', body: fd })
        .then(r => r.json())
        .then(data => {
          if (data.success) { card.remove(); Utils.showToast('Rant archived.', 'info'); }
          else Utils.showToast(data.error || 'Failed to archive', 'error');
        });
    });

    return card;
  }

  /**
   * updateReactionChips(rantId, reactions, userReaction, container)
   * Re-renders the emoji reaction chips row for a rant card
   * after a reaction change.
   *
   * @param {string}  rantId       - Rant ID
   * @param {object}  reactions    - { emoji: count } map
   * @param {string}  userReaction - The viewer's chosen emoji (or null)
   * @param {HTMLElement} container - The card's right-side element
   */
  function updateReactionChips(rantId, reactions, userReaction, container) {
    const row = container.querySelector(`#rr-${rantId}`); if (!row) return;
    const entries = Object.entries(reactions || {});
    row.innerHTML = entries.length
      ? entries.map(([emoji, count]) =>
          `<div class="reaction-chip ${userReaction === emoji ? 'mine' : ''}" data-emoji="${emoji}" data-id="${rantId}">${emoji} ${count}</div>`
        ).join('')
      : '';
  }


  // ════════════════════════════════════════════════════════════
  // RANT MODAL
  // The floating "+ Post Rant" modal triggered by the sidebar
  // compose button. Posts without anonymous mode.
  // ════════════════════════════════════════════════════════════

  /**
   * openRantModal()
   * Opens the pre-built rant modal and focuses its textarea.
   */
  function openRantModal() {
    const modal = document.getElementById('rant-modal');
    modal.classList.add('open');
    document.getElementById('modal-ta').focus();
  }

  // Wire modal controls
  const modalCancel = document.getElementById('modal-cancel');
  const modalTa     = document.getElementById('modal-ta');
  const modalPost   = document.getElementById('modal-post');
  const modalCc     = document.getElementById('modal-cc');

  // Cancel button: close modal and clear textarea
  if (modalCancel) modalCancel.addEventListener('click', () => {
    document.getElementById('rant-modal').classList.remove('open');
    modalTa.value = '';
  });

  // Character counter for the modal textarea
  if (modalTa) modalTa.addEventListener('input', () => {
    const len = modalTa.value.length;
    modalCc.textContent = `${len} / ${MAX}`;
    modalPost.disabled  = len === 0 || len > MAX;
  });

  // Modal Post button: submit rant, then refresh home feed
  if (modalPost) modalPost.addEventListener('click', () => {
    const content = modalTa.value.trim(); if (!content || content.length > MAX) return;
    modalPost.disabled = true; modalPost.textContent = 'Posting…';
    const formData = new FormData();
    formData.append('content', content); formData.append('anonymous', '0');
    fetch('save_rant.php', { method: 'POST', body: formData })
      .then(r => r.json())
      .then(data => {
        if (data.success) {
          document.getElementById('rant-modal').classList.remove('open');
          modalTa.value = '';
          Utils.showToast('Rant posted!', 'success');
          if (currentPage === 'home') render('home');
          renderRight();
        } else {
          Utils.showToast(`Failed to post: ${data.message}`, 'error');
        }
        modalPost.disabled = false; modalPost.textContent = 'Post';
      })
      .catch(() => {
        Utils.showToast('Error posting rant', 'error');
        modalPost.disabled = false; modalPost.textContent = 'Post';
      });
  });

  // ── App bootstrap ─────────────────────────────────────────
  refreshBadges(); // Show any pre-existing unread counts
  render('home');  // Land on the home page
});