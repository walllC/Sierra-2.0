document.addEventListener('DOMContentLoaded', async () => {
    // 1. Initial Security & Data Load
    if (!await checkAuth()) return;

    // Navigation Logic
    const navBtns = document.querySelectorAll('.admin-nav-link[data-sec]');
    const sections = document.querySelectorAll('.admin-section');

    navBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            navBtns.forEach(b => b.classList.remove('active'));
            sections.forEach(s => s.classList.remove('active'));
            btn.classList.add('active');
            document.getElementById(`sec-${btn.dataset.sec}`).classList.add('active');
            
            if (btn.dataset.sec === 'overview') renderOverview();
            if (btn.dataset.sec === 'rants')    renderAllRants();
            if (btn.dataset.sec === 'users')    renderUsers();
            if (btn.dataset.sec === 'reports')  renderReports();
        });
    });

    // --- API HELPER FUNCTION ---
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

    // --- RENDERING LOGIC ---

    async function renderOverview() {
        const data = await apiRequest('api/get_stats.php');
        
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

    async function renderAllRants() {
        const list = document.getElementById('all-rants-list');
        const rants = await apiRequest('api/get_rants.php');
        list.innerHTML = '';
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
            await apiRequest('api/delete_rant.php', { id: e.target.dataset.id });
            renderAllRants();
            renderOverview();
        });
        return card;
    }

    async function renderUsers() {
        const tbody = document.getElementById('users-tbody');
        const users = await apiRequest('api/get_users.php');
        tbody.innerHTML = '';

        users.forEach(user => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><strong>${user.username}</strong></td>
                <td><span class="badge">${user.role}</span></td>
                <td><span class="badge">${user.status}</span></td>
                <td><button class="btn btn-xs ban-btn" data-u="${user.id}">${user.status === 'banned' ? 'Unban' : 'Ban'}</button></td>`;
            
            tr.querySelector('.ban-btn').addEventListener('click', async () => {
                const newStatus = user.status === 'banned' ? 'active' : 'banned';
                await apiRequest('api/update_user.php', { id: user.id, status: newStatus });
                renderUsers();
            });
            tbody.appendChild(tr);
        });
    }

    // Initialize the page
    renderOverview();
});