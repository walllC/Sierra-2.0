document.addEventListener('DOMContentLoaded', () => {
  Auth.seedAdmin();
  if (!Auth.isLoggedIn()) { window.location.href = 'login.html'; return; }
  if (!Auth.isAdmin())    { window.location.href = 'index.html'; return; }

  const SECTIONS = { overview: 'Overview', rants: 'All Rants', reports: 'Report Queue', users: 'User Management' };
  const topbarTitle = document.getElementById('topbar-title');

  document.getElementById('logout-btn').addEventListener('click', () => Auth.logout());
  document.getElementById('refresh-btn').addEventListener('click', () => {
    const active = document.querySelector('.admin-nav-link.active');
    if (active) { const sec = active.dataset.sec; renderSection(sec); }
  });

  // Nav routing
  document.querySelectorAll('.admin-nav-link[data-sec]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.admin-nav-link').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.admin-section').forEach(s => s.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById(`sec-${btn.dataset.sec}`).classList.add('active');
      topbarTitle.textContent = SECTIONS[btn.dataset.sec] || '';
      renderSection(btn.dataset.sec);
    });
  });

  function renderSection(sec) {
    if (sec === 'overview') renderOverview();
    if (sec === 'rants')    renderAllRants();
    if (sec === 'reports')  renderReports('pending');
    if (sec === 'users')    renderUsers();
  }

  function updateReportBadge() {
    const count = Storage.getPendingReports().length;
    const badge = document.getElementById('reports-badge');
    if (badge) { badge.textContent = count; badge.style.display = count ? 'inline-block' : 'none'; }
    const sR = document.getElementById('s-reports');
    if (sR) sR.textContent = count;
  }

  // ── Overview ──
  function renderOverview() {
    const users    = Storage.getUsers();
    const rants    = Storage.getRants();
    const comments = Storage.getComments();
    document.getElementById('s-users').textContent    = users.length;
    document.getElementById('s-rants').textContent    = rants.length;
    document.getElementById('s-today').textContent    = rants.filter(r => Utils.isToday(r.createdAt)).length;
    document.getElementById('s-banned').textContent   = users.filter(u => u.status === 'banned').length;
    document.getElementById('s-comments').textContent = comments.length;
    updateReportBadge();

    const container = document.getElementById('recent-rants');
    container.innerHTML = '';
    const recent = rants.slice(0, 8);
    if (!recent.length) { container.innerHTML = `<div class="admin-empty"><div class="e-icon">💬</div><p>No rants yet.</p></div>`; return; }
    recent.forEach(r => container.appendChild(buildRantCard(r)));
  }

  // ── All Rants ──
  function renderAllRants(q = '') {
    const list  = document.getElementById('all-rants-list');
    let rants = Storage.getRants();
    if (q) rants = rants.filter(r => r.content.toLowerCase().includes(q) || r.username.toLowerCase().includes(q));
    list.innerHTML = '';
    if (!rants.length) { list.innerHTML = `<div class="admin-empty"><div class="e-icon">💬</div><p>${q ? 'No rants matching your search.' : 'No rants yet.'}</p></div>`; return; }
    rants.forEach(r => list.appendChild(buildRantCard(r)));
  }

  const rantSearch = document.getElementById('rant-search');
  if (rantSearch) rantSearch.addEventListener('input', e => renderAllRants(e.target.value.trim().toLowerCase()));

  function buildRantCard(rant) {
    const isAnon = !!rant.anonymous;
    const displayName = isAnon ? `Anonymous (${rant.username})` : rant.username;
    const card = document.createElement('div');
    card.className = 'a-rant-card';

    const avEl = document.createElement('div');
    avEl.className = 'av sm';
    avEl.style.background = Utils.getAvatarColor(rant.username);
    const uData = Storage.getUserByUsername(rant.username);
    if (uData && uData.avatar) {
      avEl.innerHTML = `<img src="${uData.avatar}"/>`;
    } else {
      avEl.textContent = Utils.getInitials(rant.username);
    }
    card.appendChild(avEl);

    const body = document.createElement('div');
    body.className = 'a-rant-body';
    body.innerHTML = `
      <div class="a-rant-meta">
        <span class="name">@${Utils.escapeHtml(displayName)}</span>
        ${isAnon ? '<span class="badge badge-user">anon</span>' : ''}
        <span class="time">· ${Utils.timeAgo(rant.createdAt)}</span>
        <span class="time">· ❤️ ${(rant.likes||[]).length} · 💬 ${Storage.getCommentCount(rant.id)}</span>
        ${rant.repostOf ? `<span class="badge badge-user">🔁 repost</span>` : ''}
      </div>
      <div class="a-rant-text">${Utils.escapeHtml(rant.content)}</div>`;
    card.appendChild(body);

    const delBtn = document.createElement('button');
    delBtn.className = 'btn btn-danger-soft btn-sm';
    delBtn.innerHTML = '🗑 Delete';
    delBtn.style.flexShrink = '0';
    delBtn.addEventListener('click', () => {
      if (!confirm('Permanently delete this rant?')) return;
      Storage.deleteRant(rant.id);
      Storage.deleteCommentsByRant(rant.id);
      Utils.showToast('Rant deleted.', 'info');
      card.remove();
      updateReportBadge();
    });
    card.appendChild(delBtn);
    return card;
  }

  // ── Reports ──
  function renderReports(filter = 'pending') {
    const container = document.getElementById('reports-list');
    const filterEl  = document.getElementById('report-filter');
    if (filterEl) filterEl.value = filter;
    let reports = Storage.getReports();
    if (filter !== 'all') reports = reports.filter(r => r.status === filter);
    reports = reports.reverse();
    container.innerHTML = '';

    if (!reports.length) {
      container.innerHTML = `<div class="admin-empty"><div class="e-icon">🚩</div><p>${filter === 'pending' ? 'No pending reports. All clear!' : 'No reports found.'}</p></div>`;
      return;
    }

    reports.forEach(r => {
      const card = document.createElement('div');
      card.className = 'report-card';
      const statusBadge = `<span class="badge badge-${r.status}">${r.status}</span>`;
      card.innerHTML = `
        <div class="report-card-header">
          <div style="display:flex;align-items:center;gap:10px">
            <div class="av xs" style="background:${Utils.getAvatarColor(r.rantAuthor)}">${Utils.getInitials(r.rantAuthor)}</div>
            <div>
              <div style="font-weight:700;font-size:13px">@${Utils.escapeHtml(r.rantAuthor)}</div>
              <div style="font-size:11px;color:var(--text3)">${Utils.timeAgo(r.createdAt)}</div>
            </div>
          </div>
          <div style="display:flex;align-items:center;gap:8px">
            <span class="report-card-reason">${Utils.escapeHtml(r.reason)}</span>
            ${statusBadge}
          </div>
        </div>
        <div class="report-card-body">
          <div style="font-size:12px;color:var(--text3);margin-bottom:6px">Reported by <strong style="color:var(--text2)">@${Utils.escapeHtml(r.reportedBy)}</strong></div>
          <div class="report-card-content">${Utils.escapeHtml(r.rantContent)}</div>
        </div>
        ${r.status === 'pending' ? `
        <div class="report-card-footer">
          <button class="btn btn-danger-soft btn-sm del-rant-btn" data-rantid="${r.rantId}" data-rid="${r.id}">🗑 Delete Rant</button>
          <button class="btn btn-ghost btn-sm ban-author-btn" data-author="${r.rantAuthor}" data-rid="${r.id}">🚫 Ban Author</button>
          <button class="btn btn-success-soft btn-sm dismiss-btn" data-rid="${r.id}">✓ Dismiss</button>
        </div>` : ''}`;

      if (r.status === 'pending') {
        card.querySelector('.del-rant-btn').addEventListener('click', e => {
          const { rantid, rid } = e.currentTarget.dataset;
          if (!confirm('Delete reported rant?')) return;
          Storage.deleteRant(rantid); Storage.deleteCommentsByRant(rantid);
          Storage.resolveReport(rid);
          Utils.showToast('Rant deleted & report resolved.', 'success');
          renderReports(document.getElementById('report-filter').value);
          updateReportBadge();
        });
        card.querySelector('.ban-author-btn').addEventListener('click', e => {
          const { author, rid } = e.currentTarget.dataset;
          if (!confirm(`Ban @${author}? They won't be able to log in.`)) return;
          Storage.updateUser(author, { status: 'banned' });
          Storage.resolveReport(rid);
          Utils.showToast(`@${author} has been banned.`, 'error');
          renderReports(document.getElementById('report-filter').value);
          updateReportBadge();
        });
        card.querySelector('.dismiss-btn').addEventListener('click', e => {
          Storage.dismissReport(e.currentTarget.dataset.rid);
          Utils.showToast('Report dismissed.', 'info');
          renderReports(document.getElementById('report-filter').value);
          updateReportBadge();
        });
      }
      container.appendChild(card);
    });
  }

  const reportFilter = document.getElementById('report-filter');
  if (reportFilter) reportFilter.addEventListener('change', e => renderReports(e.target.value));

  // ── Users ──
  function renderUsers(q = '') {
    const tbody = document.getElementById('users-tbody');
    let users   = Storage.getUsers();
    const rants = Storage.getRants();
    if (q) users = users.filter(u => u.username.toLowerCase().includes(q));
    tbody.innerHTML = '';

    if (!users.length) {
      tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:40px;color:var(--text3)">No users found.</td></tr>`;
      return;
    }

    users.forEach(user => {
      const count  = rants.filter(r => r.username === user.username).length;
      const status = user.status || 'active';
      const tr     = document.createElement('tr');

      const uData = Storage.getUserByUsername(user.username);
      const avHTML = uData && uData.avatar
        ? `<img src="${uData.avatar}" style="width:34px;height:34px;border-radius:50%;object-fit:cover;flex-shrink:0">`
        : `<div class="av sm" style="background:${Utils.getAvatarColor(user.username)}">${Utils.getInitials(user.username)}</div>`;

      tr.innerHTML = `
        <td>
          <div class="user-cell">
            ${avHTML}
            <div class="user-cell-info">
              <div class="uc-name">${Utils.escapeHtml(user.username)}</div>
              <div class="uc-handle">Joined ${new Date(user.createdAt).toLocaleDateString()}</div>
            </div>
          </div>
        </td>
        <td><span class="badge badge-${user.role}">${user.role}</span></td>
        <td><span class="badge badge-${status}">${status}</span></td>
        <td style="color:var(--text3)">${new Date(user.createdAt).toLocaleDateString(undefined,{month:'short',day:'numeric',year:'numeric'})}</td>
        <td style="font-weight:700;color:var(--text)">${count}</td>
        <td>
          <div class="ua-btns">
            ${user.role !== 'admin' ? `
              <button class="btn btn-ghost btn-sm deact-btn" data-u="${user.username}" data-s="${status}">
                ${status === 'deactivated' ? '✓ Reactivate' : '⏸ Deactivate'}
              </button>
              <button class="btn btn-${status === 'banned' ? 'success-soft' : 'danger-soft'} btn-sm ban-btn" data-u="${user.username}" data-s="${status}">
                ${status === 'banned' ? '✓ Unban' : '🚫 Ban'}
              </button>` : `<span style="font-size:12px;color:var(--text3);font-weight:600">Protected</span>`}
          </div>
        </td>`;

      const deactBtn = tr.querySelector('.deact-btn');
      const banBtn   = tr.querySelector('.ban-btn');

      if (deactBtn) deactBtn.addEventListener('click', () => {
        const isDe = user.status === 'deactivated';
        if (!confirm(`${isDe ? 'Reactivate' : 'Deactivate'} @${user.username}?`)) return;
        Storage.updateUser(user.username, { status: isDe ? 'active' : 'deactivated' });
        Utils.showToast(`@${user.username} ${isDe ? 'reactivated' : 'deactivated'}.`, 'info');
        renderUsers(document.getElementById('user-search')?.value.trim().toLowerCase());
        renderOverview();
      });

      if (banBtn) banBtn.addEventListener('click', () => {
        const isBanned = user.status === 'banned';
        if (!confirm(`${isBanned ? 'Unban' : 'Ban'} @${user.username}?`)) return;
        Storage.updateUser(user.username, { status: isBanned ? 'active' : 'banned' });
        Utils.showToast(`@${user.username} ${isBanned ? 'unbanned' : 'banned'}.`, isBanned ? 'success' : 'error');
        renderUsers(document.getElementById('user-search')?.value.trim().toLowerCase());
        renderOverview();
      });

      tbody.appendChild(tr);
    });
  }

  const userSearch = document.getElementById('user-search');
  if (userSearch) userSearch.addEventListener('input', e => renderUsers(e.target.value.trim().toLowerCase()));

  // ── Toasts (mini) ──
  const Utils_local = {
    showToast(msg, type = 'info') {
      const old = document.getElementById('admin-toast'); if (old) old.remove();
      const t = document.createElement('div');
      t.id = 'admin-toast';
      t.style.cssText = `position:fixed;bottom:32px;left:50%;transform:translateX(-50%) translateY(16px);background:var(--bg4);border:1px solid var(--border3);color:var(--text);padding:11px 26px;border-radius:999px;font-size:13px;font-weight:600;opacity:0;transition:all 0.25s;z-index:9999;pointer-events:none;white-space:nowrap;box-shadow:var(--shadow)`;
      if (type==='error')   t.style.borderColor='var(--danger)', t.style.color='var(--danger)';
      if (type==='success') t.style.borderColor='var(--success)', t.style.color='var(--success)';
      if (type==='info')    t.style.borderColor='var(--border3)';
      t.textContent = msg;
      document.body.appendChild(t);
      requestAnimationFrame(() => { t.style.opacity='1'; t.style.transform='translateX(-50%) translateY(0)'; });
      setTimeout(() => { t.style.opacity='0'; t.style.transform='translateX(-50%) translateY(16px)'; setTimeout(() => t.remove(), 300); }, 2800);
    }
  };
  // Override Utils.showToast for admin page
  Object.assign(Utils, Utils_local);

  updateReportBadge();
  renderOverview();
});