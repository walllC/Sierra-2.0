document.addEventListener('DOMContentLoaded', () => {
const ME = window.userFromPHP || Auth.getUser(); 
if (!ME) {
    window.location.href = 'login.php';
    return;
}
  const MAX = 280;
  const REACTIONS = ['❤️','😂','😡','😢','🔥','👏'];

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
      if (u && u.avatar) {
  sbAv.style.background = 'none';
  sbAv.innerHTML = `<img src="${u.avatar}" class="av-img" style="width:100%; height:100%; border-radius:50%; object-fit:cover;">`;
}
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
    if (page === 'home')          renderHome(c);
    else if (page === 'search')   renderSearch(c);
    else if (page === 'explore')  renderExplore(c);
    else if (page === 'notifications') renderNotifications(c);
    else if (page === 'messages') renderMessages(c, extra.chatWith);
    else if (page === 'profile')  renderProfile(c, ME.username);
    else if (page === 'settings') renderSettings(c);
    else if (page === 'userprofile') renderProfile(c, extra.username);
  }

  function refreshBadges() {
    const nc = Storage.getUnreadCount(ME.username);
    const mc = Storage.getUnreadMessages(ME.username);
    ['notif-dot','notif-dot-bn'].forEach(id => { const el=document.getElementById(id); if(el) el.classList.toggle('show', nc>0); });
    ['notif-num','notif-num-bn'].forEach(id => { const el=document.getElementById(id); if(el){ el.classList.toggle('show',nc>0); el.textContent=nc||''; }});
    ['msg-dot','msg-dot-bn'].forEach(id => { const el=document.getElementById(id); if(el) el.classList.toggle('show', mc>0); });
    ['msg-num','msg-num-bn'].forEach(id => { const el=document.getElementById(id); if(el){ el.classList.toggle('show',mc>0); el.textContent=mc||''; }});
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
              <div style="font-weight:600;font-size:13px">@${Utils.escapeHtml(r.anonymous?'Anonymous':r.username)}</div>
              <div style="font-size:12px;color:var(--text3);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${Utils.escapeHtml(r.content)}</div>
              <div style="font-size:11px;color:var(--text3);margin-top:2px">❤️ ${(r.likes||[]).length}</div>
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
        <button class="theme-toggle" id="theme-btn" title="Toggle theme">${Storage.getTheme()==='light'?'🌙':'☀️'}</button>
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

    // set avatar image if uploaded
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
      const len = ta.value.length, pct = len/MAX;
      ring.style.strokeDashoffset = circ - pct*circ;
      ring.style.stroke = len>MAX?'var(--danger)':len>240?'var(--warning)':'var(--accent)';
      postBtn.disabled = len===0||len>MAX;
      ta.style.height='auto'; ta.style.height=ta.scrollHeight+'px';
    });

    postBtn.addEventListener('click', () => {
      const content = ta.value.trim();
      if (!content||content.length>MAX) return;
      Storage.addRant({ id: Date.now().toString(36)+Math.random().toString(36).slice(2,6), username: ME.username, anonymous: isAnon, content, createdAt: new Date().toISOString(), updatedAt: null, likes: [], reactions: {} });
      ta.value=''; ring.style.strokeDashoffset=circ; postBtn.disabled=true;
      anonChk.checked=false; isAnon=false;
      homeAv.style.background=Utils.getAvatarColor(ME.username);
      homeAv.textContent=Utils.getInitials(ME.username);
      homeAv.style.fontSize='';
      Utils.showToast(isAnon?'👻 Posted anonymously!':'Rant posted!','success');
      loadFeed(''); renderRight();
    });

    c.querySelector('#home-search').addEventListener('input', e => loadFeed(e.target.value.trim()));
    loadFeed('');

    function loadFeed(q) {
      const feedEl = c.querySelector('#feed');
      let rants = activeTab==='following' ? Storage.getFollowingFeed(ME.username) : Storage.getRants();
      // filter blocked
      const blocked = Storage.getBlockedUsers(ME.username);
      rants = rants.filter(r => !blocked.includes(r.username));
      if (q) rants = rants.filter(r => r.content.toLowerCase().includes(q.toLowerCase()) || (!r.anonymous&&r.username.toLowerCase().includes(q.toLowerCase())));
      feedEl.innerHTML='';
      if (!rants.length) {
        feedEl.innerHTML=`<div class="empty"><div class="e-icon">💬</div><p>${activeTab==='following'?'Follow someone to see their rants!':q?'No results.':'No rants yet!'}</p></div>`;
        return;
      }
      rants.forEach(r => feedEl.appendChild(buildCard(r)));
    }
  }

  // ════════════════════════════════════════
  // EXPLORE (trending by likes)
  // ════════════════════════════════════════
  function renderExplore(c) {
    const trending = Storage.getTrendingRants();
    const blocked  = Storage.getBlockedUsers(ME.username);
    c.innerHTML = `<div class="page-hdr"><h2>Explore</h2></div>
      <div style="padding:12px 20px;border-bottom:1px solid var(--border);font-size:13px;color:var(--text3)">Top rants in the last 24 hours</div>
      <div id="explore-feed"></div>`;
    const ef = c.querySelector('#explore-feed');
    const visible = trending.filter(r => !blocked.includes(r.username));
    if (!visible.length) { ef.innerHTML=`<div class="empty"><div class="e-icon">🔥</div><p>Nothing trending yet.</p></div>`; return; }
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
      res.innerHTML='';
      if (!q) return;
      const ql = q.toLowerCase();
      const users = Storage.getUsers().filter(u => u.role!=='admin' && !blocked.includes(u.username) && u.username.toLowerCase().includes(ql));
      let rants = Storage.getRants().filter(r => !blocked.includes(r.username) && (r.content.toLowerCase().includes(ql)||(!r.anonymous&&r.username.toLowerCase().includes(ql))));
      const topRants = [...rants].sort((a,b)=>(b.likes||[]).length-(a.likes||[]).length);

      if ((activeTab==='all'||activeTab==='people') && users.length) {
        res.innerHTML+=`<div style="padding:10px 20px 4px;font-size:12px;font-weight:700;color:var(--text3);text-transform:uppercase;letter-spacing:.06em">People</div>`;
        users.forEach(u => {
          const row=document.createElement('div'); row.className='follow-list-item';
          row.innerHTML=`<div class="av sm" style="background:${Utils.getAvatarColor(u.username)}">${Utils.getInitials(u.username)}</div>
            <div class="follow-list-info"><div class="fl-name">@${Utils.escapeHtml(u.username)}</div><div class="fl-handle">${Utils.escapeHtml(u.bio||'No bio')}</div></div>`;
          row.addEventListener('click',()=>render('userprofile',{username:u.username}));
          res.appendChild(row);
        });
      }
      const rantList = activeTab==='top' ? topRants : rants;
      if ((activeTab==='all'||activeTab==='rants'||activeTab==='top') && rantList.length) {
        res.innerHTML+=`<div style="padding:10px 20px 4px;font-size:12px;font-weight:700;color:var(--text3);text-transform:uppercase;letter-spacing:.06em">${activeTab==='top'?'Top Rants':'Rants'}</div>`;
        rantList.forEach(r=>res.appendChild(buildCard(r)));
      }
      if (!users.length && !rants.length) res.innerHTML=`<div class="empty"><div class="e-icon">🔍</div><p>No results for "${Utils.escapeHtml(q)}"</p></div>`;
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
        ${notifs.length?`<button class="btn btn-ghost btn-sm" id="clear-notifs" style="margin-left:auto">Clear all</button>`:''}
      </div>`;
    if (!notifs.length) { c.innerHTML+=`<div class="empty"><div class="e-icon">🔔</div><p>Nothing here yet.</p></div>`; return; }

    const clearBtn = c.querySelector('#clear-notifs');
    if (clearBtn) clearBtn.addEventListener('click', () => { Storage.clearNotifications(ME.username); renderNotifications(c); });

    notifs.forEach(n => {
      const icon = n.type==='like'?'❤️':n.type==='comment'?'💬':n.type==='follow'?'👤':n.type==='repost'?'🔁':'📢';
      const names = n.froms.length===1 ? `@${Utils.escapeHtml(n.froms[0])}` :
        n.froms.length===2 ? `@${Utils.escapeHtml(n.froms[0])} and @${Utils.escapeHtml(n.froms[1])}` :
        `@${Utils.escapeHtml(n.froms[0])} and ${n.froms.length-1} others`;
      const el=document.createElement('div');
      el.className='notif-item'+(n.read?'':' unread');
      el.innerHTML=`<div class="notif-icon">${icon}</div>
        <div>
          <div class="notif-text"><strong>${names}</strong> ${Utils.escapeHtml(n.message)}</div>
          <div class="notif-time">${Utils.timeAgo(n.createdAt)}</div>
        </div>`;
      el.addEventListener('click',()=>{ if(n.froms[0]) render('userprofile',{username:n.froms[0]}); });
      c.appendChild(el);
    });
  }

  // ════════════════════════════════════════
  // MESSAGES
  // ════════════════════════════════════════
  function renderMessages(c, openWith) {
    const inboxUsers = Storage.getInboxUsers(ME.username);
    if (openWith && !inboxUsers.includes(openWith)) inboxUsers.unshift(openWith);
    c.innerHTML=`<div class="page-hdr"><h2>Messages</h2></div>`;
    if (!inboxUsers.length && !openWith) {
      c.innerHTML+=`<div class="empty"><div class="e-icon">💬</div><p>No conversations yet.</p></div>`; return;
    }
    const layout=document.createElement('div');
    layout.style.cssText='display:flex;height:calc(100vh - 57px)';
    const list=document.createElement('div');
    list.style.cssText='width:240px;border-right:1px solid var(--border);overflow-y:auto;flex-shrink:0';
    const chatArea=document.createElement('div');
    chatArea.style.cssText='flex:1;display:flex;flex-direction:column;min-width:0';

    inboxUsers.forEach(u => {
      const last=Storage.getLastMessage(ME.username,u);
      const unread=Storage.getConversation(ME.username,u).filter(m=>m.to===ME.username&&!m.read).length;
      const item=document.createElement('div');
      item.className='inbox-item'; item.dataset.user=u;
      item.innerHTML=`<div class="av sm" style="background:${Utils.getAvatarColor(u)}">${Utils.getInitials(u)}</div>
        <div class="inbox-info">
          <div class="inbox-name">@${Utils.escapeHtml(u)}</div>
          <div class="inbox-preview">${last?Utils.escapeHtml(last.text):'Say hi!'}</div>
        </div>
        ${unread?`<span class="inbox-unread">${unread}</span>`:''}`;
      item.addEventListener('click',()=>{ openChat(u); list.querySelectorAll('.inbox-item').forEach(i=>i.classList.toggle('active',i.dataset.user===u)); });
      list.appendChild(item);
    });

    layout.appendChild(list); layout.appendChild(chatArea);
    c.appendChild(layout);

    function openChat(toUser) {
      Storage.markMessagesRead(toUser,ME.username); refreshBadges();
      chatArea.innerHTML=`
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
      chatArea.querySelector('#view-prof-btn').addEventListener('click',()=>render('userprofile',{username:toUser}));

      function loadMsgs() {
        const msgs=Storage.getConversation(ME.username,toUser);
        const box=chatArea.querySelector('#chat-msgs');
        box.innerHTML='';
        if(!msgs.length){box.innerHTML=`<div class="empty" style="padding:40px 20px"><p>Start the conversation!</p></div>`;return;}
        msgs.forEach((m,i)=>{
          const mine=m.from===ME.username;
          const row=document.createElement('div'); row.className='chat-bubble-row '+(mine?'mine':'other');
          if(!mine){const av=Utils.avatar(toUser,'xs');row.appendChild(av);}
          const bubble=document.createElement('div'); bubble.className='chat-bubble';
          bubble.textContent=m.text; row.appendChild(bubble);
          // seen tag on last message
          if(mine&&i===msgs.length-1&&m.read){
            const seen=document.createElement('div'); seen.className='seen-tag'; seen.textContent='Seen';
            const wrap=document.createElement('div'); wrap.style.cssText='display:flex;flex-direction:column;align-items:flex-end';
            wrap.appendChild(bubble); wrap.appendChild(seen); row.appendChild(wrap);
          }
          box.appendChild(row);
        });
        box.scrollTop=box.scrollHeight;
      }
      loadMsgs();

      const chatIn=chatArea.querySelector('#chat-in');
      const chatSend=chatArea.querySelector('#chat-send');
      function sendMsg(){
        const text=chatIn.value.trim(); if(!text)return;
        Storage.sendMessage({id:Date.now().toString(36),from:ME.username,to:toUser,text,createdAt:new Date().toISOString(),read:false});
        chatIn.value=''; loadMsgs();
        Storage.addNotification({to:toUser,from:ME.username,type:'message',message:'sent you a message.'});
        refreshBadges();
      }
      chatSend.addEventListener('click',sendMsg);
      chatIn.addEventListener('keydown',e=>{if(e.key==='Enter')sendMsg();});
    }

    if(openWith){const item=list.querySelector(`[data-user="${openWith}"]`);if(item){item.classList.add('active');openChat(openWith);}else openChat(openWith);}
    else if(inboxUsers.length){const first=list.querySelector('.inbox-item');if(first){first.classList.add('active');openChat(first.dataset.user);}}
  }

  // ════════════════════════════════════════
  // PROFILE
  // ════════════════════════════════════════
  function renderProfile(c, username) {
    const isMe      = username === ME.username;
    const user      = Storage.getUserByUsername(username);
    const rants     = Storage.getRantsByUser(username);
    const color     = Utils.getAvatarColor(username);
    const today     = rants.filter(r=>Utils.isToday(r.createdAt)).length;
    const followers = Storage.getFollowers(username);
    const following = Storage.getFollowing(username);
    const amFollowing = Storage.isFollowing(ME.username, username);
    const amBlocked = Storage.isBlocked(ME.username, username);
    const blocked   = Storage.getBlockedUsers(ME.username);

    // avatar element
    const avHTML = user&&user.avatar
      ? `<img src="${user.avatar}" class="av-img" style="width:64px;height:64px;border:4px solid var(--bg);box-shadow:0 0 0 1px var(--border2);cursor:${isMe?'pointer':'default'}">`
      : `<div class="av lg profile-av-ring" style="background:${color};cursor:${isMe?'pointer':'default'}">${Utils.getInitials(username)}</div>`;

    c.innerHTML=`
      ${!isMe?`<div class="page-hdr"><button class="back-btn" id="back-btn">←</button><h2>@${Utils.escapeHtml(username)}</h2></div>`:'<div class="page-hdr"><h2>Profile</h2></div>'}
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
          ${Array.from({length:8},(_,row)=>Array.from({length:20},(_,col)=>`<circle cx="${col*60+30}" cy="${row*24+12}" r="1" fill="white" fill-opacity="0.06"/>`).join('')).join('')}
        </svg>
      </div>
      <div class="profile-info-wrap">
        <div class="profile-av-row">
          <div class="av-upload-wrap" id="av-wrap">
            ${avHTML}
            ${isMe?`<label class="av-upload-overlay" for="av-input" title="Change photo">📷</label><input type="file" id="av-input" accept="image/*"/>`:``}
          </div>
          <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
            ${isMe
              ? `<button class="btn btn-ghost btn-sm" id="edit-profile-btn">Edit profile</button>`
              : amBlocked
                ? `<button class="btn btn-ghost btn-sm" id="unblock-btn">Unblock</button>`
                : `<button class="btn btn-ghost btn-sm" id="msg-user-btn">Message</button>
                   <button class="btn-follow ${amFollowing?'following':''}" id="follow-btn">${amFollowing?'Following':'Follow'}</button>
                   <button class="btn btn-ghost btn-sm" id="block-btn" title="Block user" style="color:var(--danger)">🚫</button>`
            }
          </div>
        </div>
        <div class="profile-uname">${Utils.escapeHtml(username)}</div>
        <div class="profile-handle-text">@${Utils.escapeHtml(username)}</div>
        <div class="profile-bio">${Utils.escapeHtml(user?.bio||'No bio yet.')}</div>
        <div class="profile-meta"><span>📅 Joined ${user?new Date(user.createdAt).toLocaleDateString(undefined,{year:'numeric',month:'long'}):''}</span></div>
        <div class="follow-stats">
          <div class="follow-stat" id="show-following"><strong>${following.length}</strong> <span>Following</span></div>
          <div class="follow-stat" id="show-followers"><strong>${followers.length}</strong> <span>Followers</span></div>
          <div class="profile-stat"><strong>${rants.length}</strong> <span>rants</span></div>
        </div>
      </div>
      <div class="tabs"><button class="tab active">Rants</button></div>
      <div id="p-feed"></div>`;

    // avatar upload
    if (isMe) {
      const avInput = c.querySelector('#av-input');
      if (avInput) avInput.addEventListener('change', () => {
        const file = avInput.files[0]; if(!file) return;
        const reader = new FileReader();
        reader.onload = e => {
          Storage.updateUser(ME.username, { avatar: e.target.result });
          Utils.showToast('Profile photo updated!','success');
          render('profile');
        };
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
          followBtn.textContent = nowF?'Following':'Follow';
          followBtn.classList.toggle('following', nowF);
          if (nowF) { Storage.addNotification({to:username,from:ME.username,type:'follow',message:'started following you.',rantId:null}); Utils.showToast(`Following @${username}`,'success'); }
          else Utils.showToast(`Unfollowed @${username}`,'info');
          refreshBadges();
          const fs = c.querySelector('#show-followers strong');
          if (fs) fs.textContent = Storage.getFollowers(username).length;
        });

        const blockBtn = c.querySelector('#block-btn');
        if (blockBtn) blockBtn.addEventListener('click', () => {
          if (!confirm(`Block @${username}? They won't be able to see your profile or message you.`)) return;
          Storage.blockUser(ME.username, username);
          Utils.showToast(`@${username} blocked.`,'info');
          render('userprofile',{username});
        });
      } else {
        const unblockBtn = c.querySelector('#unblock-btn');
        if (unblockBtn) unblockBtn.addEventListener('click', () => {
          Storage.unblockUser(ME.username, username);
          Utils.showToast(`@${username} unblocked.`,'success');
          render('userprofile',{username});
        });
      }
    } else {
      c.querySelector('#edit-profile-btn').addEventListener('click', () => openEditProfile());
    }

    c.querySelector('#show-followers').addEventListener('click', () => openFollowModal('Followers', Storage.getFollowers(username)));
    c.querySelector('#show-following').addEventListener('click', () => openFollowModal('Following', Storage.getFollowing(username)));

    const pf = c.querySelector('#p-feed');
    const visibleRants = rants.filter(r => !blocked.includes(r.username));
    if (!visibleRants.length) { pf.innerHTML=`<div class="empty"><div class="e-icon">🤐</div><p>No rants yet.</p></div>`; return; }
    visibleRants.forEach(r => pf.appendChild(buildCard(r, !isMe)));
  }

  function openFollowModal(title, userList) {
    const modal = document.createElement('div');
    modal.className='modal-overlay';
    const items = userList.length
      ? userList.map(u=>`<div class="follow-list-item" data-u="${Utils.escapeHtml(u)}"><div class="av sm" style="background:${Utils.getAvatarColor(u)}">${Utils.getInitials(u)}</div><div class="follow-list-info"><div class="fl-name">@${Utils.escapeHtml(u)}</div></div></div>`).join('')
      : `<div class="empty" style="padding:32px"><p>Nobody here yet.</p></div>`;
    modal.innerHTML=`<div class="modal-box" style="padding:0;overflow:hidden;max-height:80vh;display:flex;flex-direction:column">
      <div style="display:flex;align-items:center;justify-content:space-between;padding:18px 20px;border-bottom:1px solid var(--border)">
        <h3 style="margin:0">${title}</h3>
        <button class="btn btn-ghost btn-sm" id="fl-close">✕</button>
      </div>
      <div style="overflow-y:auto">${items}</div></div>`;
    document.body.appendChild(modal);
    requestAnimationFrame(()=>modal.classList.add('open'));
    modal.querySelector('#fl-close').addEventListener('click',()=>{modal.classList.remove('open');setTimeout(()=>modal.remove(),200);});
    modal.querySelectorAll('.follow-list-item').forEach(item=>{
      item.addEventListener('click',()=>{modal.classList.remove('open');setTimeout(()=>modal.remove(),200);render('userprofile',{username:item.dataset.u});});
    });
    modal.addEventListener('click',e=>{if(e.target===modal){modal.classList.remove('open');setTimeout(()=>modal.remove(),200);}});
  }

  function openEditProfile() {
    const user = Storage.getUserByUsername(ME.username);
    const modal = document.createElement('div');
    modal.className='modal-overlay';
    modal.innerHTML=`<div class="modal-box">
      <h3>Edit Profile</h3>
      <div class="settings-field"><label>Bio</label><textarea id="bio-in" rows="3" placeholder="Tell people about yourself…">${Utils.escapeHtml(user?.bio||'')}</textarea></div>
      <div class="modal-actions">
        <button class="btn btn-ghost btn-sm" id="ep-cancel">Cancel</button>
        <button class="btn btn-primary btn-sm" id="ep-save">Save</button>
      </div></div>`;
    document.body.appendChild(modal);
    requestAnimationFrame(()=>modal.classList.add('open'));
    modal.querySelector('#ep-cancel').addEventListener('click',()=>{modal.classList.remove('open');setTimeout(()=>modal.remove(),200);});
    modal.querySelector('#ep-save').addEventListener('click',()=>{
      Storage.updateUser(ME.username,{bio:modal.querySelector('#bio-in').value.trim()});
      modal.classList.remove('open');setTimeout(()=>modal.remove(),200);
      Utils.showToast('Profile updated!','success'); navigate('profile');
    });
  }

  // ════════════════════════════════════════
  // SETTINGS
  // ════════════════════════════════════════
  function renderSettings(c) {
    const user = Storage.getUserByUsername(ME.username);
    const theme = Storage.getTheme();
    const blocked = Storage.getBlockedUsers(ME.username);
    c.innerHTML=`
      <div class="page-hdr"><h2>Settings</h2></div>
      <div class="settings-section">
        <h3>Appearance</h3>
        <div class="settings-row">
          <div><label>Dark Mode</label><small>Toggle between dark and light theme</small></div>
          <label class="toggle-switch">
            <input type="checkbox" id="theme-check" ${theme==='dark'?'checked':''}/>
            <span class="toggle-track"></span>
          </label>
        </div>
      </div>
      <div class="settings-section">
        <h3>Account</h3>
        <div class="settings-field"><label>Username</label><input type="text" value="${Utils.escapeHtml(ME.username)}" disabled style="opacity:0.5"/></div>
        <div class="settings-field"><label>Bio</label><textarea id="set-bio" rows="3">${Utils.escapeHtml(user?.bio||'')}</textarea></div>
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
          ? blocked.map(u=>`<div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid var(--border)">
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

    c.querySelector('#theme-check').addEventListener('change', e => {
      const next = e.target.checked ? 'dark' : 'light';
      Storage.setTheme(next); applyTheme(next);
    });
    c.querySelector('#save-bio').addEventListener('click',()=>{Storage.updateUser(ME.username,{bio:c.querySelector('#set-bio').value.trim()});Utils.showToast('Bio saved!','success');});
    c.querySelector('#logout-set').addEventListener('click',()=>Auth.logout());
    c.querySelector('#save-pw').addEventListener('click',()=>{
      const usr=Storage.getUserByUsername(ME.username);
      const cur=c.querySelector('#cur-pw').value,nw=c.querySelector('#new-pw').value,cn=c.querySelector('#con-pw').value;
      if(usr.password!==cur){Utils.showToast('Current password wrong.','error');return;}
      if(nw.length<6){Utils.showToast('New password too short.','error');return;}
      if(nw!==cn){Utils.showToast('Passwords do not match.','error');return;}
      Storage.updateUser(ME.username,{password:nw});
      Utils.showToast('Password updated!','success');
      c.querySelector('#cur-pw').value='';c.querySelector('#new-pw').value='';c.querySelector('#con-pw').value='';
    });
    c.querySelectorAll('.unblock-btn').forEach(btn=>{
      btn.addEventListener('click',()=>{Storage.unblockUser(ME.username,btn.dataset.u);Utils.showToast('Unblocked.','success');renderSettings(c);});
    });
  }

  // ════════════════════════════════════════
  // BUILD POST CARD
  // ════════════════════════════════════════
  function buildCard(rant, readOnly=false) {
    const isOwn    = rant.username === ME.username;
    const isAnon   = !!rant.anonymous;
    const showReal = !isAnon || isOwn || ME.role==='admin';
    const dispName = showReal ? rant.username : 'Anonymous';
    const dispColor= showReal ? Utils.getAvatarColor(rant.username) : '#444455';
    const likes    = rant.likes||[];
    const liked    = likes.includes(ME.username);
    const reactions= rant.reactions||{};
    const myReaction = Storage.getUserReaction(rant.id, ME.username);
    const comments = Storage.getCommentsByRant(rant.id);
    const totalComments = Storage.getCommentCount(rant.id);

    const card = document.createElement('div');
    card.className='post-card'; card.dataset.id=rant.id;

    // avatar
    const av = document.createElement('div');
    av.className='av'; av.style.background=dispColor; av.style.flexShrink='0';
    const uData = Storage.getUserByUsername(rant.username);
    if (showReal && uData && uData.avatar) {
      av.style.background='none';
      av.innerHTML=`<img src="${uData.avatar}" style="width:40px;height:40px;border-radius:50%;object-fit:cover;cursor:pointer"/>`;
    } else {
      av.textContent = showReal ? Utils.getInitials(rant.username) : '👻';
      if (!showReal) av.style.fontSize='20px';
    }
    if (showReal) { av.style.cursor='pointer'; av.addEventListener('click',()=>render('userprofile',{username:rant.username})); }
    card.appendChild(av);

    const right=document.createElement('div'); right.className='post-right';

    // repost banner
    const repostHTML = rant.repostOf ? `<div class="repost-banner">🔁 Reposted from <strong>@${Utils.escapeHtml(rant.repostOf.username)}</strong></div>` : '';

    // reactions summary
    const reactionChips = Object.entries(reactions)
      .filter(([,users])=>(users||[]).length>0)
      .map(([emoji,users])=>`<div class="reaction-chip ${(users||[]).includes(ME.username)?'mine':''}" data-emoji="${emoji}" data-id="${rant.id}">${emoji} ${users.length}</div>`)
      .join('');

    right.innerHTML=`
      ${repostHTML}
      <div class="post-top">
        <span class="post-name ${showReal?'':'anon-name'}" ${showReal?`data-u="${rant.username}"`:''}>${isAnon?'👻 ':''} @${Utils.escapeHtml(dispName)}</span>
        ${isAnon&&isOwn?'<span class="anon-badge">only you</span>':''}
        <span class="post-sep">·</span>
        <span class="post-time" data-ts="${rant.createdAt}">${Utils.timeAgo(rant.createdAt)}</span>
        ${rant.updatedAt?'<span class="post-edited">edited</span>':''}
      </div>
      <div class="post-text">${Utils.escapeHtml(rant.content)}</div>
      ${reactionChips?`<div class="reactions-row" id="rr-${rant.id}">${reactionChips}</div>`:'<div class="reactions-row" id="rr-'+rant.id+'"></div>'}
      <div class="post-actions">
        <button class="action-btn like-btn ${liked?'liked':''}" data-id="${rant.id}">
          <span class="a-icon">${liked?'❤️':'🤍'}</span>
          <span class="like-count">${likes.length||''}</span>
        </button>
        <div class="reactions-wrap">
          <button class="action-btn react-btn" data-id="${rant.id}" title="React">
            <span class="a-icon">${myReaction||'😊'}</span>
          </button>
          <div class="reaction-picker" id="rp-${rant.id}">
            ${REACTIONS.map(e=>`<button class="r-emoji" data-emoji="${e}" data-id="${rant.id}">${e}</button>`).join('')}
          </div>
        </div>
        <button class="action-btn comment-toggle-btn" data-id="${rant.id}">
          <span class="a-icon">💬</span>
          <span class="comment-count">${totalComments||''}</span>
        </button>
        ${!isAnon?`<button class="action-btn repost-btn" data-id="${rant.id}" title="Repost"><span class="a-icon">🔁</span></button>`:''}
        ${!readOnly&&isOwn?`
          <button class="action-btn edit-btn"><span class="a-icon">✏️</span></button>
          <button class="action-btn del-act"><span class="a-icon">🗑️</span></button>`:''}
        ${!isOwn?`<button class="action-btn report-btn" data-id="${rant.id}" title="Report" style="margin-left:auto"><span class="a-icon">🚩</span></button>`:''}
      </div>
      <div class="inline-edit" id="edit-${rant.id}">
        <textarea maxlength="300">${Utils.escapeHtml(rant.content)}</textarea>
        <div class="inline-edit-bar">
          <span class="ec">${rant.content.length} / ${MAX}</span>
          <div style="display:flex;gap:8px">
            <button class="btn btn-ghost btn-xs cancel-edit">Cancel</button>
            <button class="btn btn-primary btn-xs save-edit">Save</button>
          </div>
        </div>
      </div>
      <div class="comments-section" id="cs-${rant.id}">
        <div class="comment-input-row">
          <div class="av xs" style="background:${Utils.getAvatarColor(ME.username)}">${Utils.getInitials(ME.username)}</div>
          <input type="text" placeholder="Add a comment…" class="comment-input" maxlength="200"/>
          <button class="btn btn-primary btn-xs send-comment">Post</button>
        </div>
        <div class="comment-list" id="cl-${rant.id}"></div>
      </div>`;

    card.appendChild(right);

    // name click
    if (showReal) {
      const nameEl=right.querySelector('.post-name');
      nameEl.style.cursor='pointer';
      nameEl.addEventListener('click',()=>render('userprofile',{username:rant.username}));
    }

    // like
    right.querySelector('.like-btn').addEventListener('click',()=>{
      const newLikes=Storage.toggleLike(rant.id,ME.username);
      const btn=right.querySelector('.like-btn');
      const nowLiked=newLikes.includes(ME.username);
      btn.classList.toggle('liked',nowLiked);
      btn.querySelector('.a-icon').textContent=nowLiked?'❤️':'🤍';
      btn.querySelector('.like-count').textContent=newLikes.length||'';
      if(nowLiked&&rant.username!==ME.username&&!isAnon){
        Storage.addNotification({to:rant.username,from:ME.username,type:'like',message:'liked your rant.',rantId:rant.id});
        refreshBadges();
      }
    });

    // reaction picker toggle
    right.querySelector('.react-btn').addEventListener('click',e=>{
      e.stopPropagation();
      document.querySelectorAll('.reaction-picker.open').forEach(p=>p.classList.remove('open'));
      right.querySelector(`#rp-${rant.id}`).classList.toggle('open');
    });
    document.addEventListener('click',()=>{ right.querySelector(`#rp-${rant.id}`)?.classList.remove('open'); },{once:true});

    right.querySelectorAll('.r-emoji').forEach(btn=>{
      btn.addEventListener('click',e=>{
        e.stopPropagation();
        const newReactions=Storage.toggleReaction(rant.id,ME.username,btn.dataset.emoji);
        right.querySelector(`#rp-${rant.id}`).classList.remove('open');
        updateReactionChips(rant.id, newReactions, right);
        const myNew=Storage.getUserReaction(rant.id,ME.username);
        right.querySelector('.react-btn .a-icon').textContent=myNew||'😊';
        if(myNew&&rant.username!==ME.username&&!isAnon){
          Storage.addNotification({to:rant.username,from:ME.username,type:'reaction',message:`reacted ${myNew} to your rant.`,rantId:rant.id});
          refreshBadges();
        }
      });
    });

    // reaction chips click
    right.addEventListener('click',e=>{
      const chip=e.target.closest('.reaction-chip');
      if(chip){
        const newReactions=Storage.toggleReaction(rant.id,ME.username,chip.dataset.emoji);
        updateReactionChips(rant.id,newReactions,right);
        const myNew=Storage.getUserReaction(rant.id,ME.username);
        right.querySelector('.react-btn .a-icon').textContent=myNew||'😊';
      }
    });

    // repost
    const repostBtn=right.querySelector('.repost-btn');
    if(repostBtn) repostBtn.addEventListener('click',()=>{
      if(!confirm(`Repost this rant from @${rant.username}?`))return;
      Storage.repost(rant.id,ME.username);
      Utils.showToast('Reposted!','success');
      if(currentPage==='home')render('home');
      if(rant.username!==ME.username){
        Storage.addNotification({to:rant.username,from:ME.username,type:'repost',message:'reposted your rant.',rantId:rant.id});
        refreshBadges();
      }
    });

    // report
    const reportBtn=right.querySelector('.report-btn');
    if(reportBtn) reportBtn.addEventListener('click',()=>openReportModal(rant));

    // comment toggle
    right.querySelector('.comment-toggle-btn').addEventListener('click',()=>{
      const cs=right.querySelector(`#cs-${rant.id}`);
      cs.classList.toggle('open');
      if(cs.classList.contains('open'))loadComments(rant.id,right);
    });

    // send comment
    function sendComment(){
      const inp=right.querySelector('.comment-input');
      const text=inp.value.trim(); if(!text)return;
      Storage.addComment({id:Date.now().toString(36)+Math.random().toString(36).slice(2,5),rantId:rant.id,username:ME.username,text,createdAt:new Date().toISOString(),likes:[]});
      inp.value=''; loadComments(rant.id,right);
      if(rant.username!==ME.username&&!isAnon){
        Storage.addNotification({to:rant.username,from:ME.username,type:'comment',message:'commented on your rant.',rantId:rant.id});
        refreshBadges();
      }
      right.querySelector('.comment-count').textContent=Storage.getCommentCount(rant.id)||'';
    }
    right.querySelector('.send-comment').addEventListener('click',sendComment);
    right.querySelector('.comment-input').addEventListener('keydown',e=>{if(e.key==='Enter')sendComment();});

    // edit/delete
    if(!readOnly&&isOwn){
      const editSection=right.querySelector(`#edit-${rant.id}`);
      const editTa=editSection.querySelector('textarea');
      const ec=editSection.querySelector('.ec');
      right.querySelector('.edit-btn').addEventListener('click',()=>{
        editSection.style.display='block';
        right.querySelector('.post-text').style.display='none';
        right.querySelector('.post-actions').style.display='none';
        editTa.focus();
      });
      editSection.querySelector('.cancel-edit').addEventListener('click',()=>{
        editSection.style.display='none';
        right.querySelector('.post-text').style.display='';
        right.querySelector('.post-actions').style.display='';
      });
      editTa.addEventListener('input',()=>{
        const l=editTa.value.length;
        ec.textContent=`${l} / ${MAX}`; ec.className='ec'+(l>MAX?' over':'');
        editSection.querySelector('.save-edit').disabled=l===0||l>MAX;
      });
      editSection.querySelector('.save-edit').addEventListener('click',()=>{
        const nc=editTa.value.trim(); if(!nc||nc.length>MAX)return;
        Storage.updateRant(rant.id,{content:nc,updatedAt:new Date().toISOString()});
        Utils.showToast('Updated!','success'); render(currentPage);
      });
      right.querySelector('.del-act').addEventListener('click',()=>{
        if(!confirm('Delete this rant?'))return;
        Storage.deleteRant(rant.id); Storage.deleteCommentsByRant(rant.id);
        Utils.showToast('Deleted.','info'); render(currentPage); renderRight();
      });
    }

    return card;
  }

  function updateReactionChips(rantId, reactions, container) {
    const row = container.querySelector(`#rr-${rantId}`);
    if (!row) return;
    row.innerHTML = Object.entries(reactions)
      .filter(([,users])=>(users||[]).length>0)
      .map(([emoji,users])=>`<div class="reaction-chip ${(users||[]).includes(ME.username)?'mine':''}" data-emoji="${emoji}" data-id="${rantId}">${emoji} ${users.length}</div>`)
      .join('');
  }

  // ── Report modal ──
  function openReportModal(rant) {
    const modal=document.createElement('div'); modal.className='modal-overlay';
    modal.innerHTML=`<div class="modal-box">
      <h3>Report Rant</h3>
      <p style="font-size:14px;color:var(--text2);margin-bottom:16px">Why are you reporting this rant?</p>
      <div style="display:flex;flex-direction:column;gap:8px">
        ${['Hate speech','Harassment','Spam','Misinformation','Explicit content','Other'].map(r=>`
          <label style="display:flex;align-items:center;gap:10px;cursor:pointer;font-size:14px;padding:8px;border-radius:var(--radius);border:1px solid var(--border)">
            <input type="radio" name="report-reason" value="${r}"/> ${r}
          </label>`).join('')}
      </div>
      <div class="modal-actions">
        <button class="btn btn-ghost btn-sm" id="r-cancel">Cancel</button>
        <button class="btn btn-danger-soft btn-sm" id="r-submit">Submit Report</button>
      </div></div>`;
    document.body.appendChild(modal);
    requestAnimationFrame(()=>modal.classList.add('open'));
    modal.querySelector('#r-cancel').addEventListener('click',()=>{modal.classList.remove('open');setTimeout(()=>modal.remove(),200);});
    modal.querySelector('#r-submit').addEventListener('click',()=>{
      const reason=modal.querySelector('input[name="report-reason"]:checked');
      if(!reason){Utils.showToast('Pick a reason.','warning');return;}
      Storage.addReport({rantId:rant.id,rantContent:rant.content,rantAuthor:rant.username,reportedBy:ME.username,reason:reason.value});
      modal.classList.remove('open');setTimeout(()=>modal.remove(),200);
      Utils.showToast('Reported. Thank you.','success');
    });
    modal.addEventListener('click',e=>{if(e.target===modal){modal.classList.remove('open');setTimeout(()=>modal.remove(),200);}});
  }

  // ── Comments & replies ──
  function loadComments(rantId, container) {
    const list=container.querySelector(`#cl-${rantId}`);
    const comments=Storage.getCommentsByRant(rantId);
    list.innerHTML='';
    if(!comments.length){list.innerHTML=`<div style="font-size:13px;color:var(--text3);padding:8px 0">No comments yet.</div>`;return;}
    comments.forEach(cm=>list.appendChild(buildCommentItem(cm,rantId,container,0)));
  }

  function buildCommentItem(cm, rantId, container, depth) {
    const likes=cm.likes||[];
    const liked=likes.includes(ME.username);
    const replies=Storage.getRepliesByComment(cm.id);
    const isOwn=cm.username===ME.username;
    const wrap=document.createElement('div'); wrap.className='comment-wrap'; wrap.dataset.cid=cm.id;
    if(depth>0) wrap.style.marginLeft='32px';
    const row=document.createElement('div'); row.className='comment-item';
    const av=Utils.avatar(cm.username,'xs'); av.style.cursor='pointer';
    av.addEventListener('click',()=>render('userprofile',{username:cm.username}));
    const body=document.createElement('div'); body.className='comment-body';
    body.innerHTML=`
      <div class="comment-header">
        <span class="comment-name" data-u="${cm.username}">@${Utils.escapeHtml(cm.username)}</span>
        <span class="comment-time">${Utils.timeAgo(cm.createdAt)}</span>
      </div>
      <div class="comment-text">${Utils.escapeHtml(cm.text)}</div>
      <div class="comment-actions">
        <button class="cm-action-btn cm-like-btn ${liked?'cm-liked':''}" data-cid="${cm.id}">
          <span>${liked?'❤️':'🤍'}</span><span class="cm-like-count">${likes.length||''}</span>
        </button>
        <button class="cm-action-btn cm-reply-btn">↩ Reply</button>
        ${isOwn?`<button class="cm-action-btn cm-del-btn">🗑</button>`:''}
      </div>
      <div class="cm-reply-input" style="display:none;margin-top:8px">
        <div style="display:flex;gap:8px;align-items:center">
          <div class="av xs" style="background:${Utils.getAvatarColor(ME.username)}">${Utils.getInitials(ME.username)}</div>
          <input type="text" class="cm-reply-ta" placeholder="Reply to @${Utils.escapeHtml(cm.username)}…" maxlength="200"/>
          <button class="btn btn-primary btn-xs cm-send-reply">Post</button>
          <button class="btn btn-ghost btn-xs cm-cancel-reply">✕</button>
        </div>
      </div>`;
    row.appendChild(av); row.appendChild(body); wrap.appendChild(row);

    body.querySelector('.cm-like-btn').addEventListener('click',()=>{
      const nl=Storage.toggleCommentLike(cm.id,ME.username);
      const btn=body.querySelector('.cm-like-btn');
      const nowL=nl.includes(ME.username);
      btn.classList.toggle('cm-liked',nowL);
      btn.querySelector('span').textContent=nowL?'❤️':'🤍';
      btn.querySelector('.cm-like-count').textContent=nl.length||'';
    });
    body.querySelector('.cm-reply-btn').addEventListener('click',()=>{
      const inp=body.querySelector('.cm-reply-input');
      inp.style.display=inp.style.display==='none'?'block':'none';
      if(inp.style.display==='block')inp.querySelector('.cm-reply-ta').focus();
    });
    body.querySelector('.cm-cancel-reply').addEventListener('click',()=>{body.querySelector('.cm-reply-input').style.display='none';});

    function sendReply(){
      const ta=body.querySelector('.cm-reply-ta'); const text=ta.value.trim(); if(!text)return;
      Storage.addComment({id:Date.now().toString(36)+Math.random().toString(36).slice(2,5),rantId,parentId:cm.id,username:ME.username,text,createdAt:new Date().toISOString(),likes:[]});
      ta.value=''; body.querySelector('.cm-reply-input').style.display='none';
      const existing=wrap.querySelector('.replies-list'); if(existing)existing.remove();
      const updatedReplies=Storage.getRepliesByComment(cm.id);
      if(updatedReplies.length){const rl=document.createElement('div');rl.className='replies-list';updatedReplies.forEach(r=>rl.appendChild(buildCommentItem(r,rantId,container,depth+1)));wrap.appendChild(rl);}
      const cc=container.closest('.post-card')?.querySelector('.comment-count');
      if(cc)cc.textContent=Storage.getCommentCount(rantId)||'';
      if(cm.username!==ME.username){Storage.addNotification({to:cm.username,from:ME.username,type:'comment',message:'replied to your comment.',rantId});refreshBadges();}
    }
    body.querySelector('.cm-send-reply').addEventListener('click',sendReply);
    body.querySelector('.cm-reply-ta').addEventListener('keydown',e=>{if(e.key==='Enter')sendReply();});

    const delBtn=body.querySelector('.cm-del-btn');
    if(delBtn)delBtn.addEventListener('click',()=>{
      Storage.deleteComment(cm.id); wrap.remove();
      const cc=container.closest('.post-card')?.querySelector('.comment-count');
      if(cc)cc.textContent=Storage.getCommentCount(rantId)||'';
    });
    body.querySelector('.comment-name').addEventListener('click',()=>render('userprofile',{username:cm.username}));

    if(replies.length){const rl=document.createElement('div');rl.className='replies-list';replies.forEach(r=>rl.appendChild(buildCommentItem(r,rantId,container,depth+1)));wrap.appendChild(rl);}
    return wrap;
  }

  // ── Rant modal ──
  function openRantModal(){
    const modal=document.getElementById('rant-modal');
    modal.classList.add('open');
    document.getElementById('modal-ta').focus();
  }
  const modalCancel=document.getElementById('modal-cancel');
  const modalTa=document.getElementById('modal-ta');
  const modalPost=document.getElementById('modal-post');
  const modalCc=document.getElementById('modal-cc');
  if(modalCancel)modalCancel.addEventListener('click',()=>{document.getElementById('rant-modal').classList.remove('open');modalTa.value='';});
  if(modalTa)modalTa.addEventListener('input',()=>{
    const len=modalTa.value.length;
    modalCc.textContent=`${len} / ${MAX}`;
    modalPost.disabled=len===0||len>MAX;
  });
  if(modalPost)modalPost.addEventListener('click',()=>{
    const content=modalTa.value.trim(); if(!content||content.length>MAX)return;
    Storage.addRant({id:Date.now().toString(36)+Math.random().toString(36).slice(2,6),username:ME.username,content,createdAt:new Date().toISOString(),updatedAt:null,likes:[],reactions:{}});
    document.getElementById('rant-modal').classList.remove('open');modalTa.value='';
    Utils.showToast('Rant posted!','success');
    if(currentPage==='home')render('home');
    renderRight();
  });

  setInterval(()=>{ document.querySelectorAll('[data-ts]').forEach(el=>el.textContent=Utils.timeAgo(el.dataset.ts)); },30000);
  refreshBadges();
  render('home');
});