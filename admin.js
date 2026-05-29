document.addEventListener('DOMContentLoaded', async () => {
    if (!await checkAuth()) return;

    // --- NAVIGATION ---
    const navBtns  = document.querySelectorAll('.admin-nav-link[data-sec]');
    const sections = document.querySelectorAll('.admin-section');

    navBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            navBtns.forEach(b  => b.classList.remove('active'));
            sections.forEach(s => s.classList.remove('active'));
            btn.classList.add('active');
            document.getElementById(`sec-${btn.dataset.sec}`).classList.add('active');

            if (btn.dataset.sec === 'overview') renderOverview();
            if (btn.dataset.sec === 'rants')    renderAllRants();
            if (btn.dataset.sec === 'users')    renderUsers();
            if (btn.dataset.sec === 'reports')  renderReports();
        });
    });

    // --- API HELPER ---
    async function apiRequest(url, data = null) {
        const options = data ? {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams(data)
        } : {};
        const response = await fetch(url, options);
        return await response.json();
    }

    async function checkAuth() {
        const res = await apiRequest('api/check_admin.php');
        if (!res.authorized) {
            window.location.href = 'login.php';
            return false;
        }
        return true;
    }

    // --- OVERVIEW ---
    async function renderOverview() {
        const data = await apiRequest('api/admin_get_stats.php');

        document.getElementById('s-users').textContent    = data.userCount;
        document.getElementById('s-rants').textContent    = data.rantCount;
        document.getElementById('s-today').textContent    = data.rantsToday;
        document.getElementById('s-banned').textContent   = data.bannedCount;
        document.getElementById('s-comments').textContent = data.commentCount;
        document.getElementById('s-reports').textContent  = data.reportCount;

        const rr = document.getElementById('recent-rants');
        rr.innerHTML = '';
        if (data.recentRants.length === 0) {
            rr.innerHTML = `<div class="empty"><p>No rants yet.</p></div>`;
        } else {
            data.recentRants.forEach(r => rr.appendChild(buildRantCard(r)));
        }
    }

    // --- ALL RANTS ---
    async function renderAllRants() {
        const list  = document.getElementById('all-rants-list');
        const rants = await apiRequest('api/admin_get_rants.php');
        list.innerHTML = '';
        if (rants.length === 0) {
            list.innerHTML = `<div class="empty"><p>No rants yet.</p></div>`;
            return;
        }
        rants.forEach(r => list.appendChild(buildRantCard(r)));
    }

    function buildRantCard(rant) {
        const card = document.createElement('div');
        card.className = 'a-rant-card';
        card.innerHTML = `
            <div class="a-rant-body">
                <div class="a-rant-meta">
                    <span class="name">@${rant.username}</span>
                    <span class="time">· ${rant.created_at}</span>
                </div>
                <div class="a-rant-text">${rant.content}</div>
            </div>
            <button class="btn btn-danger-soft btn-xs del-btn" data-id="${rant.id}">Delete</button>`;

        card.querySelector('.del-btn').addEventListener('click', async (e) => {
            if (!confirm('Delete this rant?')) return;
            await apiRequest('api/admin_delete_rant.php', { id: e.target.dataset.id });
            renderAllRants();
            renderOverview();
        });
        return card;
    }

    // --- USERS ---
    async function renderUsers() {
        const tbody = document.getElementById('users-tbody');
        const users = await apiRequest('api/admin_get_users.php');
        tbody.innerHTML = '';

        users.forEach(user => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><strong>${user.username}</strong></td>
                <td><span class="badge" data-val="${user.role}">${user.role}</span></td>
                <td><span class="badge" data-val="${user.status}">${user.status}</span></td>
                <td><button class="btn btn-xs ban-btn">${user.status === 'banned' ? 'Unban' : 'Ban'}</button></td>`;

            tr.querySelector('.ban-btn').addEventListener('click', async () => {
                const newStatus = user.status === 'banned' ? 'active' : 'banned';
                await apiRequest('api/admin_update_user.php', { id: user.id, status: newStatus });
                renderUsers();
            });
            tbody.appendChild(tr);
        });
    }

    // --- REPORTS ---
    async function renderReports() {
        const list = document.getElementById('reports-list');
        list.innerHTML = 'Loading...';
        const reports = await apiRequest('api/admin_get_reports.php');

        if (!reports.length) {
            list.innerHTML = '<p>No reports yet.</p>';
            return;
        }

        list.innerHTML = '';
        reports.forEach(r => {
            const card = document.createElement('div');
            card.className = 'a-rant-card';
            card.innerHTML = `
                <div class="a-rant-body">
                    <div class="a-rant-meta">
                        <span class="name">Reported by @${r.reporter}</span>
                        <span class="time">· ${r.created_at}</span>
                    </div>
                    <div class="a-rant-text"><strong>Reason:</strong> ${r.reason}</div>
                    <div class="a-rant-text" style="margin-top:4px">
                        Rant by <strong>@${r.rant_author}</strong>: ${r.rant_content}
                    </div>
                </div>
                <div style="display:flex; flex-direction:column; gap:6px;">
                    <button class="btn btn-danger-soft btn-xs del-rant-btn" 
                        data-rantid="${r.rant_id}" data-id="${r.id}">Delete Rant</button>
                    <button class="btn btn-xs dismiss-btn" 
                        data-id="${r.id}">Dismiss</button>
                </div>`;

            // Dismiss only
            card.querySelector('.dismiss-btn').addEventListener('click', async (e) => {
                if (!confirm('Dismiss this report?')) return;
                await apiRequest('api/admin_dismiss_report.php', { id: e.target.dataset.id });
                renderReports();
                renderOverview();
            });

            // Delete rant + dismiss
            card.querySelector('.del-rant-btn').addEventListener('click', async (e) => {
                if (!confirm('Delete the rant and dismiss report?')) return;
                await apiRequest('api/admin_delete_rant.php', { id: e.target.dataset.rantid });
                await apiRequest('api/admin_dismiss_report.php', { id: e.target.dataset.id });
                renderReports();
                renderOverview();
            });

            list.appendChild(card);
        });
    }

    // --- INIT ---
    renderOverview();
});