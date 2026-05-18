document.addEventListener('DOMContentLoaded', () => {
  const ME = window.userFromPHP || Auth.getUser();
  if (!ME) {
    window.location.href = 'login.php';
    return;
  }
  const MAX = 280;
  const REACTIONS = ['❤️', '😂', '😡', '😢', '🔥', '👏'];

  // ── Theme ──
  function applyTheme(t) {
    document.body.classList.toggle('light', t === 'light');
    const btn = document.getElementById('theme-btn');
    if (btn) btn.textContent = t === 'light' ? '🌙' : '☀️';
  }
  applyTheme(Storage.getTheme());

  // ── Sidebar init ──
  const sbAv = document.getElementById('sb-av');
  if (sbAv) {
    const u = Storage.getUserByUsername(ME.username);
    if (u && u.avatar) {
      sbAv.style.background = 'none';
      sbAv.innerHTML = `<img src="${u.avatar}" class="av-img" style="width:100%; height:100%; border-radius:50%; object-fit:cover;">`;
    } else {
      sbAv.style.background = Utils.getAvatarColor(ME.username);
      sbAv.textContent = Utils.getInitials(ME.username);
    }
  }
  const sbName = document.getElementById('sb-name');
  const sbHandle = document.getElementById('sb-handle');
  if (sbName) sbName.textContent = ME.username;
  if (sbHandle) sbHandle.textContent = '@' + ME.username;

  const sbUserBtn = document.getElementById('sb-user');
  if (sbUserBtn) sbUserBtn.addEventListener('click', () => navigate('profile'));

  // ── Nav ──
  let currentPage = 'home';
  document.querySelectorAll('.nav-item[data-page]').forEach(btn => {
    btn.addEventListener('click', () => navigate(btn.dataset.page));
  });
  document.querySelectorAll('.bn-item[data-page]').forEach(btn => {
    btn.addEventListener('click', () => navigate(btn.dataset.page));
  });

  const focusBtn = document.getElementById('focus-compose');
  if (focusBtn) focusBtn.addEventListener('click', () => openRantModal());

  const themeBtn = document.getElementById('theme-btn');
  if (themeBtn) themeBtn.addEventListener('click', () => {
    const next = Storage.getTheme() === 'dark' ? 'light' : 'dark';
    Storage.setTheme(next); applyTheme(next);
  });

  function navigate(page, extra = {}) {
    currentPage = page;
    document.querySelectorAll('.nav-item[data-page]').forEach(b => b.classList.toggle('active', b.dataset.page === page));
    document.querySelectorAll('.bn-item[data-page]').forEach(b => b.classList.toggle('active', b.dataset.page === page));
    render(page, extra);
    refreshBadges();
  }

  function render(page, extra = {}) {
    const c = document.getElementById('center');
    c.innerHTML = '';
    if (page === 'home') renderHome(c);
    else if (page === 'search') renderSearch(c);
    else if (page === 'explore') renderExplore(c);
    else if (page === 'notifications') renderNotifications(c);
    else if (page === 'messages') renderMessages(c, extra.chatWith);
    else if (page === 'profile') renderProfile(c, ME.username);
    else if (page === 'settings') renderSettings(c);
    else if (page === 'userprofile') renderProfile(c, extra.username);
  }

  function refreshBadges() {
    const nc = Storage.getUnreadCount(ME.username);
    const mc = Storage.getUnreadMessages(ME.username);
    ['notif-dot', 'notif-dot-bn'].forEach(id => { const el = document.getElementById(id); if (el) el.classList.toggle('show', nc > 0); });
    ['notif-num', 'notif-num-bn'].forEach(id => { const el = document.getElementById(id); if (el) { el.classList.toggle('show', nc > 0); el.textContent = nc || ''; } });
    ['msg-dot', 'msg-dot-bn'].forEach(id => { const el = document.getElementById(id); if (el) el.classList.toggle('show', mc > 0); });
    ['msg-num', 'msg-num-bn'].forEach(id => { const el = document.getElementById(id); if (el) { el.classList.toggle('show', mc > 0); el.textContent = mc || ''; } });
  }

  function navigate_msg(toUser) {
    document.querySelectorAll('.nav-item[data-page], .bn-item[data-page]').forEach(b => b.classList.toggle('active', b.dataset.page === 'messages'));
    currentPage = 'messages';
    render('messages', { chatWith: toUser });
    refreshBadges();
  }

  // ── Right col ──
  function renderRight() {
    const tl = document.getElementById('trending-list');
    if (tl) {
      const trending = Storage.getTrendingRants();
      tl.innerHTML = trending.length
        ? trending.map(r => `
            <div class="trend-item" data-id="${r.id}" style="padding:8px 0;border-bottom:1px solid var(--border);cursor:pointer">
              <div style="font-weight:600;font-size:13px">@${Utils.escapeHtml(r.anonymous ? 'Anonymous' : r.username)}</div>
              <div style="font-size:12px;color:var(--text3);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${Utils.escapeHtml(r.content)}</div>
              <div style="font-size:11px;color:var(--text3);margin-top:2px">❤️ ${(r.likes || []).length}</div>
            </div>`).join('')
        : '<p style="font-size:13px;color:var(--text3)">No trending rants yet.</p>';
    }
    const sl = document.getElementById('suggested-list');
    if (sl) {
      const suggested = Storage.getSuggestedUsers(ME.username);
      sl.innerHTML = suggested.length
        ? suggested.map(u => `
            <div style="display:flex;align-items:center;gap:10px;padding:8px 0">
              <div class="av sm go-av" style="background:${Utils.getAvatarColor(u.username)};cursor:pointer" data-go="${u.username}">${Utils.getInitials(u.username)}</div>
              <div style="flex:1;min-width:0">
                <div style="font-weight:600;font-size:13px;cursor:pointer;white-space:nowrap;overflow:hidden;text-overflow:ellipsis" class="go-profile" data-go="${u.username}">@${Utils.escapeHtml(u.username)}</div>
                ${u.mutuals ? `<div style="font-size:11px;color:var(--text3)">${u.mutuals} mutual</div>` : ''}
              </div>
              <button class="btn btn-ghost btn-xs msg-btn" data-to="${u.username}">Message</button>
            </div>`).join('')
        : '<p style="font-size:13px;color:var(--text3)">No suggestions.</p>';
      sl.querySelectorAll('.go-profile,.go-av').forEach(el => el.addEventListener('click', () => render('userprofile', { username: el.dataset.go })));
      sl.querySelectorAll('.msg-btn').forEach(btn => btn.addEventListener('click', () => navigate_msg(btn.dataset.to)));
    }
  }
  renderRight();

  // ════════════════════════════════════════
  // HOME
  // ════════════════════════════════════════
  function renderHome(c) {
    let activeTab = 'all';
    let isAnon = false;
    c.innerHTML = `
      <div class="page-hdr">
        <h2>Home</h2>
        <button class="theme-toggle" id="theme-btn" title="Toggle theme">${Storage.getTheme() === 'light' ? '🌙' : '☀️'}</button>
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
          <textarea class="compose-ta" id="compose-ta" placeholder="What's on your mind?" maxlength="300"></textarea>
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

    document.getElementById('theme-btn').addEventListener('click', () => {
      const next = Storage.getTheme() === 'dark' ? 'light' : 'dark';
      Storage.setTheme(next); applyTheme(next);
    });

    const ta = c.querySelector('#compose-ta');
    const postBtn = c.querySelector('#post-btn');
    const ring = c.querySelector('#ring-fill');
    const anonChk = c.querySelector('#anon-check');
    const homeAv = c.querySelector('#home-av');
    const circ = 75.4;

    const uData = Storage.getUserByUsername(ME.username);
    if (uData && uData.avatar) {
      homeAv.style.background = 'none';
      homeAv.innerHTML = `<img src="${uData.avatar}" style="width:40px;height:40px;border-radius:50%;object-fit:cover"/>`;
    }

    anonChk.addEventListener('change', () => {
      isAnon = anonChk.checked;
      homeAv.style.background = isAnon ? '#444' : Utils.getAvatarColor(ME.username);
      homeAv.textContent = isAnon ? '👻' : Utils.getInitials(ME.username);
      homeAv.style.fontSize = isAnon ? '20px' : '';
    });

    c.querySelectorAll('.tab').forEach(tab => {
      tab.addEventListener('click', () => {
        c.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active'); activeTab = tab.dataset.tab;
        loadFeed(c.querySelector('#home-search').value.trim());
      });
    });

    ta.addEventListener('input', () => {
      const len = ta.value.length, pct = len / MAX;
      ring.style.strokeDashoffset = circ - pct * circ;
      ring.style.stroke = len > MAX ? 'var(--danger)' : len > 240 ? 'var(--warning)' : 'var(--accent)';
      postBtn.disabled = len === 0 || len > MAX;
      ta.style.height = 'auto'; ta.style.height = ta.scrollHeight + 'px';
    });

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

    c.querySelector('#home-search').addEventListener('input', e => loadFeed(e.target.value.trim()));
    loadFeed('');

    function loadFeed(q) {
      const feedEl = c.querySelector('#feed');
      feedEl.innerHTML = '<div class="loading" style="text-align:center;padding:20px;color:var(--text3)">Loading rants...</div>';

      fetch('api/get_rants.php')
        .then(r => r.json())
        .then(rants => {
          if (!Array.isArray(rants)) rants = [];
          const blocked = Storage.getBlockedUsers(ME.username);
          rants = rants.filter(r => !blocked.includes(r.username));
          if (q) rants = rants.filter(r => r.content.toLowerCase().includes(q.toLowerCase()) || (!r.anonymous && r.username.toLowerCase().includes(q.toLowerCase())));
          if (activeTab === 'following') {
            const following = Storage.getFollowing(ME.username) || [];
            rants = rants.filter(r => following.includes(r.username) || r.user_ID === ME.user_ID);
          }
          feedEl.innerHTML = '';
          if (!rants.length) {
            feedEl.innerHTML = `<div class="empty"><div class="e-icon">💬</div><p>${activeTab === 'following' ? 'Follow someone to see their rants!' : q ? 'No results.' : 'No rants yet!'}</p></div>`;
            return;
          }
          rants.forEach(r => feedEl.appendChild(buildCard(r)));
        })
        .catch(() => {
          feedEl.innerHTML = '<div class="empty"><div class="e-icon">⚠️</div><p>Error loading rants. Please try again.</p></div>';
        });
    }
  }

  // ════════════════════════════════════════
  // EXPLORE
  // ════════════════════════════════════════
  function renderExplore(c) {
    const trending = Storage.getTrendingRants();
    const blocked = Storage.getBlockedUsers(ME.username);
    c.innerHTML = `<div class="page-hdr"><h2>Explore</h2></div>
      <div style="padding:12px 20px;border-bottom:1px solid var(--border);font-size:13px;color:var(--text3)">Top rants in the last 24 hours</div>
      <div id="explore-feed"></div>`;
    const ef = c.querySelector('#explore-feed');
    const visible = trending.filter(r => !blocked.includes(r.username));
    if (!visible.length) { ef.innerHTML = `<div class="empty"><div class="e-icon">🔥</div><p>Nothing trending yet.</p></div>`; return; }
    visible.forEach(r => ef.appendChild(buildCard(r)));
  }

  // ════════════════════════════════════════
  // SEARCH
  // ════════════════════════════════════════
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
    const blocked = Storage.getBlockedUsers(ME.username);

    c.querySelectorAll('.tab[data-stab]').forEach(tab => {
      tab.addEventListener('click', () => {
        c.querySelectorAll('.tab[data-stab]').forEach(t => t.classList.remove('active'));
        tab.classList.add('active'); activeTab = tab.dataset.stab;
        doSearch(inp.value.trim());
      });
    });

    inp.addEventListener('input', () => doSearch(inp.value.trim()));

    function doSearch(q) {
      res.innerHTML = '';
      if (!q) return;
      const ql = q.toLowerCase();
      const users = Storage.getUsers().filter(u => u.role !== 'admin' && !blocked.includes(u.username) && u.username.toLowerCase().includes(ql));
      let rants = Storage.getRants().filter(r => !blocked.includes(r.username) && (r.content.toLowerCase().includes(ql) || (!r.anonymous && r.username.toLowerCase().includes(ql))));
      const topRants = [...rants].sort((a, b) => (b.likes || []).length - (a.likes || []).length);

      if ((activeTab === 'all' || activeTab === 'people') && users.length) {
        res.innerHTML += `<div style="padding:10px 20px 4px;font-size:12px;font-weight:700;color:var(--text3);text-transform:uppercase;letter-spacing:.06em">People</div>`;
        users.forEach(u => {
          const row = document.createElement('div'); row.className = 'follow-list-item';
          row.innerHTML = `<div class="av sm" style="background:${Utils.getAvatarColor(u.username)}">${Utils.getInitials(u.username)}</div>
            <div class="follow-list-info"><div class="fl-name">@${Utils.escapeHtml(u.username)}</div><div class="fl-handle">${Utils.escapeHtml(u.bio || 'No bio')}</div></div>`;
          row.addEventListener('click', () => render('userprofile', { username: u.username }));
          res.appendChild(row);
        });
      }
      const rantList = activeTab === 'top' ? topRants : rants;
      if ((activeTab === 'all' || activeTab === 'rants' || activeTab === 'top') && rantList.length) {
        res.innerHTML += `<div style="padding:10px 20px 4px;font-size:12px;font-weight:700;color:var(--text3);text-transform:uppercase;letter-spacing:.06em">${activeTab === 'top' ? 'Top Rants' : 'Rants'}</div>`;
        rantList.forEach(r => res.appendChild(buildCard(r)));
      }
      if (!users.length && !rants.length) res.innerHTML = `<div class="empty"><div class="e-icon">🔍</div><p>No results for "${Utils.escapeHtml(q)}"</p></div>`;
    }
  }

  // ════════════════════════════════════════
  // NOTIFICATIONS
  // ════════════════════════════════════════
  function renderNotifications(c) {
    Storage.markNotificationsRead(ME.username);
    refreshBadges();
    const notifs = Storage.getNotifications(ME.username);
    c.innerHTML = `
      <div class="page-hdr">
        <h2>Notifications</h2>
        ${notifs.length ? `<button class="btn btn-ghost btn-sm" id="clear-notifs" style="margin-left:auto">Clear all</button>` : ''}
      </div>`;
    if (!notifs.length) { c.innerHTML += `<div class="empty"><div class="e-icon">🔔</div><p>Nothing here yet.</p></div>`; return; }

    const clearBtn = c.querySelector('#clear-notifs');
    if (clearBtn) clearBtn.addEventListener('click', () => { Storage.clearNotifications(ME.username); renderNotifications(c); });

    notifs.forEach(n => {
      const icon = n.type === 'like' ? '❤️' : n.type === 'comment' ? '💬' : n.type === 'follow' ? '👤' : n.type === 'repost' ? '🔁' : '📢';
      const names = n.froms.length === 1 ? `@${Utils.escapeHtml(n.froms[0])}` :
        n.froms.length === 2 ? `@${Utils.escapeHtml(n.froms[0])} and @${Utils.escapeHtml(n.froms[1])}` :
          `@${Utils.escapeHtml(n.froms[0])} and ${n.froms.length - 1} others`;
      const el = document.createElement('div');
      el.className = 'notif-item' + (n.read ? '' : ' unread');
      el.innerHTML = `<div class="notif-icon">${icon}</div>
        <div>
          <div class="notif-text"><strong>${names}</strong> ${Utils.escapeHtml(n.message)}</div>
          <div class="notif-time">${Utils.timeAgo(n.createdAt)}</div>
        </div>`;
      el.addEventListener('click', () => { if (n.froms[0]) render('userprofile', { username: n.froms[0] }); });
      c.appendChild(el);
    });
  }

  // ════════════════════════════════════════
  // MESSAGES
  // ════════════════════════════════════════
  function renderMessages(c, openWith) {
    const inboxUsers = Storage.getInboxUsers(ME.username);
    if (openWith && !inboxUsers.includes(openWith)) inboxUsers.unshift(openWith);
    c.innerHTML = `<div class="page-hdr"><h2>Messages</h2></div>`;
    if (!inboxUsers.length && !openWith) {
      c.innerHTML += `<div class="empty"><div class="e-icon">💬</div><p>No conversations yet.</p></div>`; return;
    }
    const layout = document.createElement('div');
    layout.style.cssText = 'display:flex;height:calc(100vh - 57px)';
    const list = document.createElement('div');
    list.style.cssText = 'width:240px;border-right:1px solid var(--border);overflow-y:auto;flex-shrink:0';
    const chatArea = document.createElement('div');
    chatArea.style.cssText = 'flex:1;display:flex;flex-direction:column;min-width:0';

    inboxUsers.forEach(u => {
      const last = Storage.getLastMessage(ME.username, u);
      const unread = Storage.getConversation(ME.username, u).filter(m => m.to === ME.username && !m.read).length;
      const item = document.createElement('div');
      item.className = 'inbox-item'; item.dataset.user = u;
      item.innerHTML = `<div class="av sm" style="background:${Utils.getAvatarColor(u)}">${Utils.getInitials(u)}</div>
        <div class="inbox-info">
          <div class="inbox-name">@${Utils.escapeHtml(u)}</div>
          <div class="inbox-preview">${last ? Utils.escapeHtml(last.text) : 'Say hi!'}</div>
        </div>
        ${unread ? `<span class="inbox-unread">${unread}</span>` : ''}`;
      item.addEventListener('click', () => { openChat(u); list.querySelectorAll('.inbox-item').forEach(i => i.classList.toggle('active', i.dataset.user === u)); });
      list.appendChild(item);
    });

    layout.appendChild(list); layout.appendChild(chatArea);
    c.appendChild(layout);

    function openChat(toUser) {
      Storage.markMessagesRead(toUser, ME.username); refreshBadges();
      chatArea.innerHTML = `
        <div class="page-hdr" style="position:relative;top:0">
          <div class="av sm" style="background:${Utils.getAvatarColor(toUser)}">${Utils.getInitials(toUser)}</div>
          <h2 style="font-size:16px">@${Utils.escapeHtml(toUser)}</h2>
          <button class="btn btn-ghost btn-xs" style="margin-left:auto" id="view-prof-btn">View Profile</button>
        </div>
        <div class="chat-messages" id="chat-msgs"></div>
        <div class="chat-input-row">
          <input id="chat-in" type="text" placeholder="Message @${Utils.escapeHtml(toUser)}…" maxlength="500"/>
          <button class="btn btn-primary btn-sm" id="chat-send">Send</button>
        </div>`;
      chatArea.querySelector('#view-prof-btn').addEventListener('click', () => render('userprofile', { username: toUser }));

      function loadMsgs() {
        const msgs = Storage.getConversation(ME.username, toUser);
        const box = chatArea.querySelector('#chat-msgs');
        box.innerHTML = '';
        if (!msgs.length) { box.innerHTML = `<div class="empty" style="padding:40px 20px"><p>Start the conversation!</p></div>`; return; }
        msgs.forEach((m, i) => {
          const mine = m.from === ME.username;
          const row = document.createElement('div'); row.className = 'chat-bubble-row ' + (mine ? 'mine' : 'other');
          if (!mine) { const av = Utils.avatar(toUser, 'xs'); row.appendChild(av); }
          const bubble = document.createElement('div'); bubble.className = 'chat-bubble';
          bubble.textContent = m.text; row.appendChild(bubble);
          if (mine && i === msgs.length - 1 && m.read) {
            const seen = document.createElement('div'); seen.className = 'seen-tag'; seen.textContent = 'Seen';
            const wrap = document.createElement('div'); wrap.style.cssText = 'display:flex;flex-direction:column;align-items:flex-end';
            wrap.appendChild(bubble); wrap.appendChild(seen); row.appendChild(wrap);
          }
          box.appendChild(row);
        });
        box.scrollTop = box.scrollHeight;
      }
      loadMsgs();

      const chatIn = chatArea.querySelector('#chat-in');
      const chatSend = chatArea.querySelector('#chat-send');
      function sendMsg() {
        const text = chatIn.value.trim(); if (!text) return;
        Storage.sendMessage({ id: Date.now().toString(36), from: ME.username, to: toUser, text, createdAt: new Date().toISOString(), read: false });
        chatIn.value = ''; loadMsgs();
        Storage.addNotification({ to: toUser, from: ME.username, type: 'message', message: 'sent you a message.' });
        refreshBadges();
      }
      chatSend.addEventListener('click', sendMsg);
      chatIn.addEventListener('keydown', e => { if (e.key === 'Enter') sendMsg(); });
    }

    if (openWith) { const item = list.querySelector(`[data-user="${openWith}"]`); if (item) { item.classList.add('active'); openChat(openWith); } else openChat(openWith); }
    else if (inboxUsers.length) { const first = list.querySelector('.inbox-item'); if (first) { first.classList.add('active'); openChat(first.dataset.user); } }
  }

  // ════════════════════════════════════════
  // PROFILE
  // ════════════════════════════════════════
  function renderProfile(c, username) {
    const isMe = username === ME.username;
    const user = Storage.getUserByUsername(username);
    const rants = Storage.getRantsByUser(username);
    const color = Utils.getAvatarColor(username);
    const followers = Storage.getFollowers(username);
    const following = Storage.getFollowing(username);
    const amFollowing = Storage.isFollowing(ME.username, username);
    const amBlocked = Storage.isBlocked(ME.username, username);
    const blocked = Storage.getBlockedUsers(ME.username);

    const avHTML = user && user.avatar
      ? `<img src="${user.avatar}" class="av-img" style="width:64px;height:64px;border:4px solid var(--bg);box-shadow:0 0 0 1px var(--border2);cursor:${isMe ? 'pointer' : 'default'}">`
      : `<div class="av lg profile-av-ring" style="background:${color};cursor:${isMe ? 'pointer' : 'default'}">${Utils.getInitials(username)}</div>`;

    c.innerHTML = `
      ${!isMe ? `<div class="page-hdr"><button class="back-btn" id="back-btn">←</button><h2>@${Utils.escapeHtml(username)}</h2></div>` : '<div class="page-hdr"><h2>Profile</h2></div>'}
      <div class="profile-cover">
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
            ${avHTML}
            ${isMe ? `<label class="av-upload-overlay" for="av-input" title="Change photo">📷</label><input type="file" id="av-input" accept="image/*"/>` : ``}
          </div>
          <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
            ${isMe
        ? `<button class="btn btn-ghost btn-sm" id="edit-profile-btn">Edit profile</button>`
        : amBlocked
          ? `<button class="btn btn-ghost btn-sm" id="unblock-btn">Unblock</button>`
          : `<button class="btn btn-ghost btn-sm" id="msg-user-btn">Message</button>
                   <button class="btn-follow ${amFollowing ? 'following' : ''}" id="follow-btn">${amFollowing ? 'Following' : 'Follow'}</button>
                   <button class="btn btn-ghost btn-sm" id="block-btn" title="Block user" style="color:var(--danger)">🚫</button>`
      }
          </div>
        </div>
        <div class="profile-uname">${Utils.escapeHtml(username)}</div>
        <div class="profile-handle-text">@${Utils.escapeHtml(username)}</div>
        <div class="profile-bio">${Utils.escapeHtml(user?.bio || 'No bio yet.')}</div>
        <div class="profile-meta"><span>📅 Joined ${user ? new Date(user.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'long' }) : ''}</span></div>
        <div class="follow-stats">
          <div class="follow-stat" id="show-following"><strong>${following.length}</strong> <span>Following</span></div>
          <div class="follow-stat" id="show-followers"><strong>${followers.length}</strong> <span>Followers</span></div>
          <div class="profile-stat"><strong>${rants.length}</strong> <span>rants</span></div>
        </div>
      </div>
      <div class="tabs"><button class="tab active">Rants</button></div>
      <div id="p-feed"></div>`;

    if (isMe) {
      const avInput = c.querySelector('#av-input');
      if (avInput) avInput.addEventListener('change', () => {
        const file = avInput.files[0]; if (!file) return;
        const reader = new FileReader();
        reader.onload = e => { Storage.updateUser(ME.username, { avatar: e.target.result }); Utils.showToast('Profile photo updated!', 'success'); render('profile'); };
        reader.readAsDataURL(file);
      });
    }

    if (!isMe) {
      const backBtn = c.querySelector('#back-btn');
      if (backBtn) backBtn.addEventListener('click', () => navigate('home'));

      if (!amBlocked) {
        const msgBtn = c.querySelector('#msg-user-btn');
        if (msgBtn) msgBtn.addEventListener('click', () => navigate_msg(username));

        const followBtn = c.querySelector('#follow-btn');
        if (followBtn) followBtn.addEventListener('click', () => {
          const nowF = Storage.toggleFollow(ME.username, username);
          followBtn.textContent = nowF ? 'Following' : 'Follow';
          followBtn.classList.toggle('following', nowF);
          if (nowF) { Storage.addNotification({ to: username, from: ME.username, type: 'follow', message: 'started following you.', rantId: null }); Utils.showToast(`Following @${username}`, 'success'); }
          else Utils.showToast(`Unfollowed @${username}`, 'info');
          refreshBadges();
          const fs = c.querySelector('#show-followers strong');
          if (fs) fs.textContent = Storage.getFollowers(username).length;
        });

        const blockBtn = c.querySelector('#block-btn');
        if (blockBtn) blockBtn.addEventListener('click', () => {
          if (!confirm(`Block @${username}? They won't be able to see your profile or message you.`)) return;
          Storage.blockUser(ME.username, username);
          Utils.showToast(`@${username} blocked.`, 'info');
          render('userprofile', { username });
        });
      } else {
        const unblockBtn = c.querySelector('#unblock-btn');
        if (unblockBtn) unblockBtn.addEventListener('click', () => {
          Storage.unblockUser(ME.username, username);
          Utils.showToast(`@${username} unblocked.`, 'success');
          render('userprofile', { username });
        });
      }
    } else {
      c.querySelector('#edit-profile-btn').addEventListener('click', () => openEditProfile());
    }

    c.querySelector('#show-followers').addEventListener('click', () => openFollowModal('Followers', Storage.getFollowers(username)));
    c.querySelector('#show-following').addEventListener('click', () => openFollowModal('Following', Storage.getFollowing(username)));

    const pf = c.querySelector('#p-feed');
    const visibleRants = rants.filter(r => !blocked.includes(r.username));
    if (!visibleRants.length) { pf.innerHTML = `<div class="empty"><div class="e-icon">🤐</div><p>No rants yet.</p></div>`; return; }
    visibleRants.forEach(r => pf.appendChild(buildCard(r, !isMe)));
  }

  function openFollowModal(title, userList) {
    const modal = document.createElement('div'); modal.className = 'modal-overlay';
    const items = userList.length
      ? userList.map(u => `<div class="follow-list-item" data-u="${Utils.escapeHtml(u)}"><div class="av sm" style="background:${Utils.getAvatarColor(u)}">${Utils.getInitials(u)}</div><div class="follow-list-info"><div class="fl-name">@${Utils.escapeHtml(u)}</div></div></div>`).join('')
      : `<div class="empty" style="padding:32px"><p>Nobody here yet.</p></div>`;
    modal.innerHTML = `<div class="modal-box" style="padding:0;overflow:hidden;max-height:80vh;display:flex;flex-direction:column">
      <div style="display:flex;align-items:center;justify-content:space-between;padding:18px 20px;border-bottom:1px solid var(--border)">
        <h3 style="margin:0">${title}</h3>
        <button class="btn btn-ghost btn-sm" id="fl-close">✕</button>
      </div>
      <div style="overflow-y:auto">${items}</div></div>`;
    document.body.appendChild(modal);
    requestAnimationFrame(() => modal.classList.add('open'));
    modal.querySelector('#fl-close').addEventListener('click', () => { modal.classList.remove('open'); setTimeout(() => modal.remove(), 200); });
    modal.querySelectorAll('.follow-list-item').forEach(item => {
      item.addEventListener('click', () => { modal.classList.remove('open'); setTimeout(() => modal.remove(), 200); render('userprofile', { username: item.dataset.u }); });
    });
    modal.addEventListener('click', e => { if (e.target === modal) { modal.classList.remove('open'); setTimeout(() => modal.remove(), 200); } });
  }

  function openEditProfile() {
    const user = Storage.getUserByUsername(ME.username);
    const modal = document.createElement('div'); modal.className = 'modal-overlay';
    modal.innerHTML = `<div class="modal-box">
      <h3>Edit Profile</h3>
      <div class="settings-field"><label>Bio</label><textarea id="bio-in" rows="3" placeholder="Tell people about yourself…">${Utils.escapeHtml(user?.bio || '')}</textarea></div>
      <div class="modal-actions">
        <button class="btn btn-ghost btn-sm" id="ep-cancel">Cancel</button>
        <button class="btn btn-primary btn-sm" id="ep-save">Save</button>
      </div></div>`;
    document.body.appendChild(modal);
    requestAnimationFrame(() => modal.classList.add('open'));
    modal.querySelector('#ep-cancel').addEventListener('click', () => { modal.classList.remove('open'); setTimeout(() => modal.remove(), 200); });
    modal.querySelector('#ep-save').addEventListener('click', () => {
      Storage.updateUser(ME.username, { bio: modal.querySelector('#bio-in').value.trim() });
      modal.classList.remove('open'); setTimeout(() => modal.remove(), 200);
      Utils.showToast('Profile updated!', 'success'); navigate('profile');
    });
  }

  // ════════════════════════════════════════
  // SETTINGS
  // ════════════════════════════════════════
  function renderSettings(c) {
    const user = Storage.getUserByUsername(ME.username);
    const theme = Storage.getTheme();
    const blocked = Storage.getBlockedUsers(ME.username);
    c.innerHTML = `
      <div class="page-hdr"><h2>Settings</h2></div>
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
      <div class="settings-section">
        <h3>Account</h3>
        <div class="settings-field"><label>Username</label><input type="text" value="${Utils.escapeHtml(ME.username)}" disabled style="opacity:0.5"/></div>
        <div class="settings-field"><label>Bio</label><textarea id="set-bio" rows="3">${Utils.escapeHtml(user?.bio || '')}</textarea></div>
        <button class="btn btn-primary btn-sm" id="save-bio">Save Bio</button>
      </div>
      <div class="settings-section">
        <h3>Change Password</h3>
        <div class="settings-field"><label>Current Password</label><input type="password" id="cur-pw" placeholder="••••••••"/></div>
        <div class="settings-field"><label>New Password</label><input type="password" id="new-pw" placeholder="••••••••"/></div>
        <div class="settings-field"><label>Confirm New</label><input type="password" id="con-pw" placeholder="••••••••"/></div>
        <button class="btn btn-primary btn-sm" id="save-pw">Update Password</button>
      </div>
      <div class="settings-section">
        <h3>Blocked Users</h3>
        ${blocked.length
        ? blocked.map(u => `<div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid var(--border)">
              <div class="av xs" style="background:${Utils.getAvatarColor(u)}">${Utils.getInitials(u)}</div>
              <span style="flex:1;font-size:14px">@${Utils.escapeHtml(u)}</span>
              <button class="btn btn-ghost btn-xs unblock-btn" data-u="${u}">Unblock</button>
            </div>`).join('')
        : '<p style="font-size:14px;color:var(--text3)">No blocked users.</p>'
      }
      </div>
      <div class="settings-section">
        <h3>Danger Zone</h3>
        <button class="btn btn-danger-soft btn-sm" id="logout-set">Log Out</button>
      </div>`;

    c.querySelector('#theme-check').addEventListener('change', e => { const next = e.target.checked ? 'dark' : 'light'; Storage.setTheme(next); applyTheme(next); });
    c.querySelector('#save-bio').addEventListener('click', () => { Storage.updateUser(ME.username, { bio: c.querySelector('#set-bio').value.trim() }); Utils.showToast('Bio saved!', 'success'); });
    c.querySelector('#logout-set').addEventListener('click', () => Auth.logout());
    c.querySelector('#save-pw').addEventListener('click', () => {
      const usr = Storage.getUserByUsername(ME.username);
      const cur = c.querySelector('#cur-pw').value, nw = c.querySelector('#new-pw').value, cn = c.querySelector('#con-pw').value;
      if (usr.password !== cur) { Utils.showToast('Current password wrong.', 'error'); return; }
      if (nw.length < 6) { Utils.showToast('New password too short.', 'error'); return; }
      if (nw !== cn) { Utils.showToast('Passwords do not match.', 'error'); return; }
      Storage.updateUser(ME.username, { password: nw });
      Utils.showToast('Password updated!', 'success');
      c.querySelector('#cur-pw').value = ''; c.querySelector('#new-pw').value = ''; c.querySelector('#con-pw').value = '';
    });
    c.querySelectorAll('.unblock-btn').forEach(btn => {
      btn.addEventListener('click', () => { Storage.unblockUser(ME.username, btn.dataset.u); Utils.showToast('Unblocked.', 'success'); renderSettings(c); });
    });
  }

  // ════════════════════════════════════════
  // REPORT MODAL
  // ════════════════════════════════════════
  function openReportModal(rant) {
    const modal = document.createElement('div'); modal.className = 'modal-overlay';
    modal.innerHTML = `<div class="modal-box">
      <h3>Report Rant</h3>
      <p style="font-size:14px;color:var(--text2);margin-bottom:16px">Why are you reporting this rant?</p>
      <div style="display:flex;flex-direction:column;gap:8px">
        ${['Hate speech', 'Harassment', 'Spam', 'Misinformation', 'Explicit content', 'Other'].map(r => `
          <label style="display:flex;align-items:center;gap:10px;cursor:pointer;font-size:14px;padding:8px;border-radius:var(--radius);border:1px solid var(--border)">
            <input type="radio" name="report-reason" value="${r}"/> ${r}
          </label>`).join('')}
      </div>
      <div class="modal-actions">
        <button class="btn btn-ghost btn-sm" id="r-cancel">Cancel</button>
        <button class="btn btn-danger-soft btn-sm" id="r-submit">Submit Report</button>
      </div></div>`;
    document.body.appendChild(modal);
    requestAnimationFrame(() => modal.classList.add('open'));
    modal.querySelector('#r-cancel').addEventListener('click', () => { modal.classList.remove('open'); setTimeout(() => modal.remove(), 200); });
    modal.querySelector('#r-submit').addEventListener('click', () => {
      const reason = modal.querySelector('input[name="report-reason"]:checked');
      if (!reason) { Utils.showToast('Pick a reason.', 'warning'); return; }
      Storage.addReport({ rantId: rant.id, rantContent: rant.content, rantAuthor: rant.username, reportedBy: ME.username, reason: reason.value });
      modal.classList.remove('open'); setTimeout(() => modal.remove(), 200);
      Utils.showToast('Reported. Thank you.', 'success');
    });
    modal.addEventListener('click', e => { if (e.target === modal) { modal.classList.remove('open'); setTimeout(() => modal.remove(), 200); } });
  }

  // ════════════════════════════════════════
  // COMMENTS: load & build
  // ════════════════════════════════════════

  // Fetches all comments for a rant and renders them into #cl-{rantId}
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
        comments.forEach(cm => {
          list.appendChild(buildCommentItem(
            {
              id: cm.comment_ID || cm.comment_id,
              username: cm.username,
              text: cm.comment_text,
              createdAt: cm.created_at,
              reactions: cm.reactions || {},
              user_reaction: cm.user_reaction || null,
            },
            rantId,
            container
          ));
        });
      })
      .catch(err => {
        console.error('Error loading comments:', err);
        list.innerHTML = `<div style="font-size:13px;color:var(--danger);padding:8px 0">Failed to load comments.</div>`;
      });
  }

  // Builds a single comment row (no nesting/depth — flat list)
  function buildCommentItem(cm, rantId, container) {
    const isOwn = cm.username === ME.username;

    // Build initial reaction chips HTML from pre-loaded data
    const initReactions = cm.reactions || {};
    const initUserReaction = cm.user_reaction || null;
    const initChips = Object.entries(initReactions)
      .filter(([, count]) => count > 0)
      .map(([emoji, count]) =>
        `<div class="reaction-chip cm-reaction-chip ${initUserReaction === emoji ? 'mine' : ''}"
              data-emoji="${emoji}" data-cid="${cm.id}">${emoji} ${count}</div>`
      ).join('');

    const wrap = document.createElement('div');
    wrap.className = 'comment-wrap';
    wrap.dataset.cid = cm.id;

    const row = document.createElement('div');
    row.className = 'comment-item';

    // Avatar
    const av = Utils.avatar(cm.username, 'xs');
    av.style.cursor = 'pointer';
    av.addEventListener('click', () => render('userprofile', { username: cm.username }));

    // Body
    const body = document.createElement('div');
    body.className = 'comment-body';
    body.innerHTML = `
      <div class="comment-header">
        <span class="comment-name" style="cursor:pointer">@${Utils.escapeHtml(cm.username)}</span>
        <span class="comment-time">${Utils.timeAgo(cm.createdAt)}</span>
      </div>
      <div class="comment-text">${Utils.escapeHtml(cm.text)}</div>
      <div class="reactions-row" id="crr-${cm.id}">${initChips}</div>
      <div class="comment-actions">
        <div class="reactions-wrap">
          <button class="cm-action-btn cm-react-btn" title="React">
            <span class="cm-react-icon">${initUserReaction || '😊'}</span>
          </button>
          <div class="reaction-picker" id="crp-${cm.id}">
            ${REACTIONS.map(e => `<button class="r-emoji cm-r-emoji" data-emoji="${e}" data-cid="${cm.id}">${e}</button>`).join('')}
          </div>
        </div>
        <button class="cm-action-btn cm-reply-btn">↩ Reply</button>
        ${isOwn ? `<button class="cm-action-btn cm-del-btn" style="color:var(--danger)">🗑</button>` : ''}
      </div>
      <div class="cm-reply-input" style="display:none;margin-top:8px">
        <div style="display:flex;gap:8px;align-items:center">
          <div class="av xs" style="background:${Utils.getAvatarColor(ME.username)}">${Utils.getInitials(ME.username)}</div>
          <input type="text" class="cm-reply-ta" placeholder="Reply to @${Utils.escapeHtml(cm.username)}…" maxlength="200"/>
          <button class="btn btn-primary btn-xs cm-send-reply">Post</button>
          <button class="btn btn-ghost btn-xs cm-cancel-reply">✕</button>
        </div>
      </div>`;

    // Name click
    body.querySelector('.comment-name').addEventListener('click', () => render('userprofile', { username: cm.username }));

    // ── Comment reactions ──
    async function postCommentReaction(emoji, cid) {
      const formData = new FormData();
      formData.append('comment_id', cid);
      formData.append('reaction_type', emoji);
      try {
        const response = await fetch('save_comment_reaction.php', { method: 'POST', body: formData });
        const data = await response.json();
        if (data.success) {
          updateCommentReactionChips(cid, data.reactions, data.user_reaction, body);
          body.querySelector('.cm-react-icon').textContent = data.user_reaction || '😊';
          body.querySelector(`#crp-${cid}`).classList.remove('open');
        } else {
          Utils.showToast(data.message || 'Failed to react', 'error');
        }
      } catch (err) {
        console.error('Comment reaction error:', err);
        Utils.showToast('Network error', 'error');
      }
    }

    body.querySelector('.cm-react-btn').addEventListener('click', e => {
      e.stopPropagation();
      document.querySelectorAll('.reaction-picker.open').forEach(p => p.classList.remove('open'));
      body.querySelector(`#crp-${cm.id}`).classList.toggle('open');
    });

    body.querySelectorAll('.cm-r-emoji').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        postCommentReaction(btn.dataset.emoji, btn.dataset.cid);
      });
    });

    // Reaction chip clicks (delegated)
    body.addEventListener('click', e => {
      const chip = e.target.closest('.cm-reaction-chip');
      if (chip) {
        e.stopPropagation();
        postCommentReaction(chip.dataset.emoji, chip.dataset.cid);
      }
    });

    // ── Reply ──
    body.querySelector('.cm-reply-btn').addEventListener('click', () => {
      const inp = body.querySelector('.cm-reply-input');
      const isOpen = inp.style.display !== 'none';
      inp.style.display = isOpen ? 'none' : 'block';
      if (!isOpen) inp.querySelector('.cm-reply-ta').focus();
    });

    body.querySelector('.cm-cancel-reply').addEventListener('click', () => {
      body.querySelector('.cm-reply-input').style.display = 'none';
    });

    function sendReply() {
      const ta = body.querySelector('.cm-reply-ta');
      const text = ta.value.trim();
      if (!text) return;

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
        .catch(err => {
          console.error('Reply error:', err);
          Utils.showToast('Network error posting reply', 'error');
        });
    }

    body.querySelector('.cm-send-reply').addEventListener('click', sendReply);
    body.querySelector('.cm-reply-ta').addEventListener('keydown', e => { if (e.key === 'Enter') sendReply(); });

    // ── Delete (own comments only) ──
    if (isOwn) {
      body.querySelector('.cm-del-btn').addEventListener('click', () => {
        if (!confirm('Delete this comment?')) return;
        const formData = new FormData();
        formData.append('comment_id', cm.id);
        fetch('delete_comment.php', { method: 'POST', body: formData })
          .then(r => r.json())
          .then(data => {
            if (data.success) {
              wrap.remove();
              Utils.showToast('Comment deleted.', 'info');
            } else {
              Utils.showToast(data.message || 'Failed to delete', 'error');
            }
          })
          .catch(() => Utils.showToast('Network error', 'error'));
      });
    }

    row.appendChild(av);
    row.appendChild(body);
    wrap.appendChild(row);
    return wrap;
  }

  function updateCommentReactionChips(cid, reactions, userReaction, container) {
    const row = container.querySelector(`#crr-${cid}`);
    if (!row) return;
    const entries = Object.entries(reactions || {});
    row.innerHTML = entries.length
      ? entries.map(([emoji, count]) =>
          `<div class="reaction-chip cm-reaction-chip ${userReaction === emoji ? 'mine' : ''}" data-emoji="${emoji}" data-cid="${cid}">${emoji} ${count}</div>`
        ).join('')
      : '';
  }

  // ════════════════════════════════════════
  // BUILD POST CARD
  // ════════════════════════════════════════
  function buildCard(rant, readOnly = false) {
    const isOwn = rant.username === ME.username;
    const isAnon = !!rant.anonymous;
    const showReal = !isAnon || isOwn || ME.role === 'admin';
    const dispName = showReal ? rant.username : 'Anonymous';
    const dispColor = showReal ? Utils.getAvatarColor(rant.username) : '#444455';
    const likes = rant.likes || [];
    const reactions = rant.reactions || {};
    const initialReactIcon = rant.user_reaction || '😊';
    const rantId = rant.id || rant.rant_ID;
    const totalComments = rant.comment_count || 0;

    const card = document.createElement('div');
    card.className = 'post-card'; card.dataset.id = rantId;

    // Avatar
    const av = document.createElement('div');
    av.className = 'av'; av.style.background = dispColor; av.style.flexShrink = '0';
    const uData = Storage.getUserByUsername(rant.username);
    if (showReal && uData && uData.avatar) {
      av.style.background = 'none';
      av.innerHTML = `<img src="${uData.avatar}" style="width:40px;height:40px;border-radius:50%;object-fit:cover;cursor:pointer"/>`;
    } else {
      av.textContent = showReal ? Utils.getInitials(rant.username) : '👻';
      if (!showReal) av.style.fontSize = '20px';
    }
    if (showReal) { av.style.cursor = 'pointer'; av.addEventListener('click', () => render('userprofile', { username: rant.username })); }
    card.appendChild(av);

    const right = document.createElement('div'); right.className = 'post-right';

    const repostHTML = rant.repostOf ? `<div class="repost-banner">🔁 Reposted from <strong>@${Utils.escapeHtml(rant.repostOf.username)}</strong></div>` : '';

    const reactionChips = Object.entries(reactions)
      .filter(([, count]) => count > 0)
      .map(([emoji, count]) =>
        `<div class="reaction-chip ${rant.user_reaction === emoji ? 'mine' : ''}" data-emoji="${emoji}" data-id="${rantId}">${emoji} ${count}</div>`
      ).join('');

    right.innerHTML = `
      ${repostHTML}
      <div class="post-top">
        <span class="post-name ${showReal ? '' : 'anon-name'}" ${showReal ? `data-u="${rant.username}"` : ''}>${isAnon ? '👻 ' : ''}@${Utils.escapeHtml(dispName)}</span>
        ${isAnon && isOwn ? '<span class="anon-badge">only you</span>' : ''}
        <span class="post-sep">·</span>
        <span class="post-time" data-ts="${rant.createdAt}">${Utils.timeAgo(rant.createdAt)}</span>
        ${rant.updatedAt ? '<span class="post-edited">edited</span>' : ''}
      </div>
      <div class="post-text">${Utils.escapeHtml(rant.content)}</div>
      <div class="reactions-row" id="rr-${rantId}">${reactionChips}</div>
      <div class="post-actions">
        <div class="reactions-wrap">
          <button class="action-btn react-btn" data-id="${rantId}" title="React">
            <span class="a-icon">${initialReactIcon}</span>
          </button>
          <div class="reaction-picker" id="rp-${rantId}">
            ${REACTIONS.map(e => `<button class="r-emoji" data-emoji="${e}" data-id="${rantId}">${e}</button>`).join('')}
          </div>
        </div>
        <button class="action-btn comment-toggle-btn" data-id="${rantId}">
          <span class="a-icon">💬</span>
          <span class="comment-count">${totalComments || ''}</span>
        </button>
        ${!isAnon ? `<button class="action-btn repost-btn" data-id="${rantId}" title="Repost"><span class="a-icon">🔁</span></button>` : ''}
        ${!readOnly && isOwn ? `
          <button class="action-btn edit-btn"><span class="a-icon">✏️</span></button>
          <button class="action-btn del-act"><span class="a-icon">🗑️</span></button>` : ''}
        ${!isOwn ? `<button class="action-btn report-btn" data-id="${rantId}" title="Report" style="margin-left:auto"><span class="a-icon">🚩</span></button>` : ''}
      </div>
      <div class="inline-edit" id="edit-${rantId}">
        <textarea maxlength="300">${Utils.escapeHtml(rant.content)}</textarea>
        <div class="inline-edit-bar">
          <span class="ec">${rant.content.length} / ${MAX}</span>
          <div style="display:flex;gap:8px">
            <button class="btn btn-ghost btn-xs cancel-edit">Cancel</button>
            <button class="btn btn-primary btn-xs save-edit">Save</button>
          </div>
        </div>
      </div>
      <div class="comments-section" id="cs-${rantId}">
        <div class="comment-input-row">
          <div class="av xs" style="background:${Utils.getAvatarColor(ME.username)}">${Utils.getInitials(ME.username)}</div>
          <input type="text" placeholder="Add a comment…" class="comment-input" maxlength="200"/>
          <button class="btn btn-primary btn-xs send-comment">Post</button>
        </div>
        <div class="comment-list" id="cl-${rantId}"></div>
      </div>`;

    card.appendChild(right);

    // Name click
    if (showReal) {
      const nameEl = right.querySelector('.post-name');
      nameEl.style.cursor = 'pointer';
      nameEl.addEventListener('click', () => render('userprofile', { username: rant.username }));
    }

    // ── Rant reactions ──
    right.querySelector('.react-btn').addEventListener('click', e => {
      e.stopPropagation();
      document.querySelectorAll('.reaction-picker.open').forEach(p => p.classList.remove('open'));
      right.querySelector(`#rp-${rantId}`).classList.toggle('open');
    });

    async function handleReaction(emoji, id) {
      const formData = new FormData();
      formData.append('rant_id', id);
      formData.append('reaction_type', emoji);
      try {
        const response = await fetch('api/save_reaction.php', { method: 'POST', body: formData });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();
        if (data.success) {
          updateReactionChips(id, data.reactions, data.user_reaction, right);
          right.querySelector('.react-btn .a-icon').textContent = data.user_reaction || '😊';
          right.querySelector(`#rp-${id}`).classList.remove('open');
          if (rant.username !== ME.username && !rant.anonymous && data.user_reaction) {
            Storage.addNotification({ to: rant.username, from: ME.username, type: 'reaction', message: `reacted ${emoji} to your rant.`, rantId: id });
            refreshBadges();
          }
        } else {
          Utils.showToast(data.message || 'Failed to react', 'error');
        }
      } catch (err) {
        console.error('Reaction error:', err);
        Utils.showToast('Network error posting reaction', 'error');
      }
    }

    right.querySelectorAll('.r-emoji').forEach(btn => {
      btn.addEventListener('click', e => { e.stopPropagation(); handleReaction(btn.dataset.emoji, btn.dataset.id); });
    });

    right.addEventListener('click', e => {
      const chip = e.target.closest('.reaction-chip:not(.cm-reaction-chip)');
      if (chip) { e.stopPropagation(); handleReaction(chip.dataset.emoji, chip.dataset.id); }
    });

    // ── Repost ──
    const repostBtn = right.querySelector('.repost-btn');
    if (repostBtn) repostBtn.addEventListener('click', () => {
      if (!confirm(`Repost this rant from @${rant.username}?`)) return;
      Storage.repost(rant.id, ME.username);
      Utils.showToast('Reposted!', 'success');
      if (currentPage === 'home') render('home');
      if (rant.username !== ME.username) {
        Storage.addNotification({ to: rant.username, from: ME.username, type: 'repost', message: 'reposted your rant.', rantId: rant.id });
        refreshBadges();
      }
    });

    // ── Report ──
    const reportBtn = right.querySelector('.report-btn');
    if (reportBtn) reportBtn.addEventListener('click', () => openReportModal(rant));

    // ── Comment toggle ──
    right.querySelector('.comment-toggle-btn').addEventListener('click', () => {
      const cs = right.querySelector(`#cs-${rantId}`);
      cs.classList.toggle('open');
      if (cs.classList.contains('open')) {
        loadComments(rantId, right);
      }
    });

    // ── Post comment ──
    function sendComment() {
      const inp = right.querySelector('.comment-input');
      const text = inp.value.trim(); if (!text) return;

      const formData = new FormData();
      formData.append('rant_id', rantId);
      formData.append('comment_text', text);

      fetch('save_comment.php', { method: 'POST', body: formData })
        .then(r => r.json())
        .then(data => {
          if (data.success) {
            inp.value = '';
            loadComments(rantId, right);
            if (rant.username !== ME.username && !isAnon) {
              Storage.addNotification({ to: rant.username, from: ME.username, type: 'comment', message: 'commented on your rant.', rantId });
              refreshBadges();
            }
            if (data.comment_count !== undefined) {
              right.querySelector('.comment-count').textContent = data.comment_count || '';
            }
            Utils.showToast('Comment posted!', 'success');
          } else {
            Utils.showToast(`Failed to post comment: ${data.message || 'Unknown error'}`, 'error');
          }
        })
        .catch(() => Utils.showToast('Error posting comment', 'error'));
    }

    right.querySelector('.send-comment').addEventListener('click', sendComment);
    right.querySelector('.comment-input').addEventListener('keydown', e => { if (e.key === 'Enter') sendComment(); });

    // ── Edit / Delete ──
    if (!readOnly && isOwn) {
      const editSection = right.querySelector(`#edit-${rantId}`);
      const editTa = editSection.querySelector('textarea');
      const ec = editSection.querySelector('.ec');

      right.querySelector('.edit-btn').addEventListener('click', () => {
        editSection.style.display = 'block';
        right.querySelector('.post-text').style.display = 'none';
        right.querySelector('.post-actions').style.display = 'none';
        editTa.focus();
      });
      editSection.querySelector('.cancel-edit').addEventListener('click', () => {
        editSection.style.display = 'none';
        right.querySelector('.post-text').style.display = '';
        right.querySelector('.post-actions').style.display = '';
      });
      editTa.addEventListener('input', () => {
        const l = editTa.value.length;
        ec.textContent = `${l} / ${MAX}`; ec.className = 'ec' + (l > MAX ? ' over' : '');
        editSection.querySelector('.save-edit').disabled = l === 0 || l > MAX;
      });
      editSection.querySelector('.save-edit').addEventListener('click', () => {
        const nc = editTa.value.trim(); if (!nc || nc.length > MAX) return;
        Storage.updateRant(rantId, { content: nc, updatedAt: new Date().toISOString() });
        Utils.showToast('Updated!', 'success'); render(currentPage);
      });
      right.querySelector('.del-act').addEventListener('click', () => {
        if (!confirm('Delete this rant?')) return;
        const formData = new FormData();
        formData.append('rant_id', rantId);

        fetch('api/delete_rant.php', { method: 'POST', body: formData })
          .then(res => res.json())
          .then(data => {
            if (data.success) {
              Storage.deleteRant(rantId);
              Storage.deleteCommentsByRant(rantId);
              Utils.showToast('Deleted.', 'info');
              render(currentPage);
              renderRight();
            } else {
              Utils.showToast(data.message || 'Failed to delete', 'error');
            }
          })
          .catch(() => Utils.showToast('Network error deleting rant', 'error'));
      });
    }

    return card;
  }

  function updateReactionChips(rantId, reactions, userReaction, container) {
    const row = container.querySelector(`#rr-${rantId}`);
    if (!row) return;
    const entries = Object.entries(reactions || {});
    row.innerHTML = entries.length
      ? entries.map(([emoji, count]) =>
          `<div class="reaction-chip ${userReaction === emoji ? 'mine' : ''}" data-emoji="${emoji}" data-id="${rantId}">${emoji} ${count}</div>`
        ).join('')
      : '';
  }

  // ════════════════════════════════════════
  // RANT MODAL (floating compose)
  // ════════════════════════════════════════
  function openRantModal() {
    const modal = document.getElementById('rant-modal');
    modal.classList.add('open');
    document.getElementById('modal-ta').focus();
  }

  const modalCancel = document.getElementById('modal-cancel');
  const modalTa = document.getElementById('modal-ta');
  const modalPost = document.getElementById('modal-post');
  const modalCc = document.getElementById('modal-cc');

  if (modalCancel) modalCancel.addEventListener('click', () => { document.getElementById('rant-modal').classList.remove('open'); modalTa.value = ''; });
  if (modalTa) modalTa.addEventListener('input', () => {
    const len = modalTa.value.length;
    modalCc.textContent = `${len} / ${MAX}`;
    modalPost.disabled = len === 0 || len > MAX;
  });
  if (modalPost) modalPost.addEventListener('click', () => {
    const content = modalTa.value.trim(); if (!content || content.length > MAX) return;
    modalPost.disabled = true; modalPost.textContent = 'Posting…';

    const formData = new FormData();
    formData.append('content', content);
    formData.append('anonymous', '0');

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

  // ── Tick timestamps every 30s ──
  setInterval(() => { document.querySelectorAll('[data-ts]').forEach(el => el.textContent = Utils.timeAgo(el.dataset.ts)); }, 30000);

  refreshBadges();
  render('home');
});
