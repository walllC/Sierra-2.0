document.addEventListener('DOMContentLoaded', () => {
  Auth.seedAdmin();
  if (!Auth.isLoggedIn()) { window.location.href = 'login.html'; return; }
  if (!Auth.isAdmin())    { window.location.href = 'index.html'; return; }

  document.getElementById('logout-btn').addEventListener('click', () => Auth.logout());

  const navBtns  = document.querySelectorAll('.admin-nav-link[data-sec]');
  const sections = document.querySelectorAll('.admin-section');

  navBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      navBtns.forEach(b => b.classList.remove('active'));
      sections.forEach(s => s.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById(`sec-${btn.dataset.sec}`).classList.add('active');
      if (btn.dataset.sec==='overview') renderOverview();
      if (btn.dataset.sec==='rants')    renderAllRants();
      if (btn.dataset.sec==='users')    renderUsers();
      if (btn.dataset.sec==='reports')  renderReports();
    });
  });

  function renderOverview() {
    const users   = Storage.getUsers();
    const rants   = Storage.getRants();
    const pending = Storage.getPendingReports().length;
    document.getElementById('s-users').textContent    = users.length;
    document.getElementById('s-rants').textContent    = rants.length;
    document.getElementById('s-today').textContent    = rants.filter(r=>Utils.isToday(r.createdAt)).length;
    document.getElementById('s-banned').textContent   = users.filter(u=>u.status==='banned').length;
    document.getElementById('s-comments').textContent = Storage.getComments().length;
    document.getElementById('s-reports').textContent  = pending;
    const rr=document.getElementById('recent-rants');
    rr.innerHTML='';
    rants.slice(0,5).forEach(r=>rr.appendChild(buildRantCard(r)));
    if(!rants.length) rr.innerHTML=`<div class="empty"><div class="e-icon">💬</div><p>No rants yet.</p></div>`;
  }

  function renderAllRants() {
    const list=document.getElementById('all-rants-list');
    const rants=Storage.getRants();
    list.innerHTML='';
    if(!rants.length){list.innerHTML=`<div class="empty"><div class="e-icon">💬</div><p>No rants.</p></div>`;return;}
    rants.forEach(r=>list.appendChild(buildRantCard(r)));
  }

  function buildRantCard(rant) {
    const color=Utils.getAvatarColor(rant.username);
    const card=document.createElement('div'); card.className='a-rant-card';
    const av=Utils.avatar(rant.username,'sm'); av.style.background=color;
    card.appendChild(av);
    card.innerHTML+=`
      <div class="a-rant-body">
        <div class="a-rant-meta">
          <span class="name">@${Utils.escapeHtml(rant.anonymous?'Anonymous ('+rant.username+')':rant.username)}</span>
          <span class="time">· ${Utils.timeAgo(rant.createdAt)}</span>
          <span class="time">· ❤️ ${(rant.likes||[]).length} · 💬 ${Storage.getCommentCount(rant.id)}</span>
          ${rant.anonymous?'<span class="badge badge-user">anon</span>':''}
        </div>
        <div class="a-rant-text">${Utils.escapeHtml(rant.content)}</div>
      </div>
      <button class="btn btn-danger-soft btn-xs del-rant-btn" data-id="${rant.id}">Delete</button>`;
    card.querySelector('.del-rant-btn').addEventListener('click',e=>{
      if(!confirm('Delete this rant?'))return;
      Storage.deleteRant(e.currentTarget.dataset.id);
      Storage.deleteCommentsByRant(e.currentTarget.dataset.id);
      Utils.showToast('Rant deleted.','info');
      renderAllRants(); renderOverview();
    });
    return card;
  }

  function renderUsers() {
    const tbody=document.getElementById('users-tbody');
    const users=Storage.getUsers();
    const rants=Storage.getRants();
    tbody.innerHTML='';
    users.forEach(user=>{
      const count=rants.filter(r=>r.username===user.username).length;
      const status=user.status||'active';
      const tr=document.createElement('tr');
      tr.innerHTML=`
        <td><div style="display:flex;align-items:center;gap:8px">
          ${user.avatar?`<img src="${user.avatar}" style="width:28px;height:28px;border-radius:50%;object-fit:cover">`:`<div class="av xs" style="background:${Utils.getAvatarColor(user.username)}">${Utils.getInitials(user.username)}</div>`}
          <strong>${Utils.escapeHtml(user.username)}</strong>
        </div></td>
        <td><span class="badge badge-${user.role}">${user.role}</span></td>
        <td><span class="badge badge-${status}">${status}</span></td>
        <td>${new Date(user.createdAt).toLocaleDateString()}</td>
        <td>${count}</td>
        <td><div class="ua-btns">
          ${user.role!=='admin'?`
            <button class="btn btn-ghost btn-xs deact-btn" data-u="${user.username}" data-s="${status}">${status==='deactivated'?'Reactivate':'Deactivate'}</button>
            <button class="btn btn-danger-soft btn-xs ban-btn" data-u="${user.username}" data-s="${status}">${status==='banned'?'Unban':'Ban'}</button>
          `:'<span style="color:var(--text3);font-size:12px">Protected</span>'}
        </div></td>`;
      const db=tr.querySelector('.deact-btn');
      const bb=tr.querySelector('.ban-btn');
      if(db)db.addEventListener('click',()=>{
        const isD=user.status==='deactivated';
        if(!confirm(`${isD?'Reactivate':'Deactivate'} @${user.username}?`))return;
        Storage.updateUser(user.username,{status:isD?'active':'deactivated'});
        Utils.showToast(`User ${isD?'reactivated':'deactivated'}.`,'info');
        renderUsers();renderOverview();
      });
      if(bb)bb.addEventListener('click',()=>{
        const isB=user.status==='banned';
        if(!confirm(`${isB?'Unban':'Ban'} @${user.username}?`))return;
        Storage.updateUser(user.username,{status:isB?'active':'banned'});
        Utils.showToast(`User ${isB?'unbanned':'banned'}.`,isB?'success':'error');
        renderUsers();renderOverview();
      });
      tbody.appendChild(tr);
    });
  }

  function renderReports() {
    const container=document.getElementById('reports-list');
    const reports=Storage.getPendingReports();
    container.innerHTML='';
    if(!reports.length){container.innerHTML=`<div class="empty"><div class="e-icon">🚩</div><p>No pending reports.</p></div>`;return;}
    reports.forEach(r=>{
      const card=document.createElement('div'); card.className='a-rant-card'; card.style.flexDirection='column'; card.style.gap='10px';
      card.innerHTML=`
        <div style="display:flex;gap:12px;align-items:flex-start">
          <div class="av xs" style="background:${Utils.getAvatarColor(r.rantAuthor)}">${Utils.getInitials(r.rantAuthor)}</div>
          <div style="flex:1">
            <div style="font-size:13px;margin-bottom:4px"><strong>@${Utils.escapeHtml(r.rantAuthor)}</strong> · <span style="color:var(--danger);font-weight:600">${Utils.escapeHtml(r.reason)}</span> · <span style="color:var(--text3);font-size:12px">${Utils.timeAgo(r.createdAt)}</span></div>
            <div style="font-size:13px;color:var(--text2);background:var(--bg3);padding:8px 12px;border-radius:var(--radius)">${Utils.escapeHtml(r.rantContent)}</div>
            <div style="font-size:12px;color:var(--text3);margin-top:4px">Reported by @${Utils.escapeHtml(r.reportedBy)}</div>
          </div>
        </div>
        <div style="display:flex;gap:8px;flex-wrap:wrap">
          <button class="btn btn-danger-soft btn-xs del-rant-rep" data-rid="${r.id}" data-rantid="${r.rantId}">Delete Rant</button>
          <button class="btn btn-ghost btn-xs resolve-rep" data-rid="${r.id}">Dismiss</button>
          <button class="btn btn-ghost btn-xs ban-author" data-rid="${r.id}" data-author="${r.rantAuthor}">Ban Author</button>
        </div>`;
      card.querySelector('.del-rant-rep').addEventListener('click',e=>{
        if(!confirm('Delete the reported rant?'))return;
        Storage.deleteRant(e.currentTarget.dataset.rantid);
        Storage.deleteCommentsByRant(e.currentTarget.dataset.rantid);
        Storage.resolveReport(e.currentTarget.dataset.rid);
        Utils.showToast('Rant deleted & report resolved.','success');
        renderReports();renderOverview();
      });
      card.querySelector('.resolve-rep').addEventListener('click',e=>{
        Storage.dismissReport(e.currentTarget.dataset.rid);
        Utils.showToast('Report dismissed.','info');
        renderReports();renderOverview();
      });
      card.querySelector('.ban-author').addEventListener('click',e=>{
        const author=e.currentTarget.dataset.author;
        if(!confirm(`Ban @${author}?`))return;
        Storage.updateUser(author,{status:'banned'});
        Storage.resolveReport(e.currentTarget.dataset.rid);
        Utils.showToast(`@${author} banned.`,'error');
        renderReports();renderOverview();
      });
      container.appendChild(card);
    });
  }

  renderOverview();
});