<?php
session_start();

if (isset($_GET['logout'])) {
    session_destroy();
    header("Location: login.php");
    exit();
}

if (!isset($_SESSION['user_ID']) || $_SESSION['role'] !== 'admin') {
    header("Location: login.php");
    exit();
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8"/>
    <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
    <title>Admin · RantBox</title>
    <link rel="stylesheet" href="style.css"/>
    <link rel="stylesheet" href="admin-style.css"/>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.js"></script>
</head>
<body>
<div class="admin-layout">

  <!-- SIDEBAR -->
  <aside class="admin-sidebar">
    <div class="admin-brand">RantBox <small>Admin Panel</small></div>
    <nav>
      <button class="admin-nav-link active" data-sec="overview"><span class="ni">📊</span><span>Overview</span></button>
      <button class="admin-nav-link" data-sec="rants"><span class="ni">💬</span><span>All Rants</span></button>
      <button class="admin-nav-link" data-sec="users"><span class="ni">👥</span><span>Users</span></button>
      <button class="admin-nav-link" data-sec="comments"><span class="ni">🗨️</span><span>Comments</span></button>
      <button class="admin-nav-link" data-sec="reports"><span class="ni">🚩</span><span>Reports</span></button>
    </nav>
    <div class="admin-footer">
      <a href="admin.php?logout=true" class="btn btn-ghost btn-sm" style="width:100%; text-decoration:none; text-align:center; display:block;">Log out</a>
    </div>
  </aside>

  <main class="admin-main">

    <!-- ======================================================
         OVERVIEW SECTION
    ====================================================== -->
    <section class="admin-section active" id="sec-overview">
      <div class="a-page-title">Dashboard (Welcome, <?php echo htmlspecialchars($_SESSION['username']); ?>)</div>

      <!-- Export Button -->
      <div style="margin-bottom: 1rem;">
        <a href="export_pdf.php" target="_blank" style="
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 10px 20px;
          background: #7c3aed;
          color: #fff;
          border-radius: 8px;
          text-decoration: none;
          font-size: 14px;
          font-weight: 500;
          transition: background 0.2s;
        ">⬇ Export PDF Report</a>

        <a href="etl.php" target="_blank" style="
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 10px 20px;
          background: #0f6e56;
          color: #fff;
          border-radius: 8px;
          text-decoration: none;
          font-size: 14px;
          font-weight: 500;
          margin-left: 10px;
          transition: background 0.2s;
        ">🔄 Sync OLAP Data</a>
      </div>

      <!-- Stats Cards -->
      <div class="stats-grid">
        <div class="s-card"><div class="sc-label">Users</div><div class="sc-num" id="s-users">0</div></div>
        <div class="s-card"><div class="sc-label">Total Rants</div><div class="sc-num" id="s-rants">0</div></div>
        <div class="s-card"><div class="sc-label">Rants Today</div><div class="sc-num" id="s-today">0</div></div>
        <div class="s-card"><div class="sc-label">Banned</div><div class="sc-num" id="s-banned">0</div></div>
        <div class="s-card"><div class="sc-label">Comments</div><div class="sc-num" id="s-comments">0</div></div>
        <div class="s-card"><div class="sc-label">Pending Reports</div><div class="sc-num" id="s-reports" style="color:var(--danger)">0</div></div>
        <div class="s-card"><div class="sc-label">Active This Week</div><div class="sc-num" id="s-active-week">0</div></div>
        <div class="s-card"><div class="sc-label">Active This Month</div><div class="sc-num" id="s-active-month">0</div></div>
      </div>

      <!-- Most Liked + Active Users -->
      <div class="dash-grid">
        <div class="tbl-card">
          <div class="tbl-hdr with-tabs">
            <span>Most Liked Rants</span>
            <div class="mini-tabs" data-target="liked">
              <button class="mini-tab active" data-period="today">Today</button>
              <button class="mini-tab" data-period="week">Week</button>
              <button class="mini-tab" data-period="month">Month</button>
              <button class="mini-tab" data-period="all">All</button>
            </div>
          </div>
          <div id="trend-liked"></div>
        </div>
        <div class="tbl-card">
          <div class="tbl-hdr with-tabs">
            <span>Active Users</span>
            <div class="mini-tabs" data-target="active">
              <button class="mini-tab active" data-period="week">Week</button>
              <button class="mini-tab" data-period="month">Month</button>
              <button class="mini-tab" data-period="all">All</button>
            </div>
          </div>
          <div id="trend-active"></div>
        </div>
      </div>

      <!-- Recent Rants -->
      <div class="tbl-card">
        <div class="tbl-hdr">Recent Rants</div>
        <div id="recent-rants"></div>
      </div>

      <!-- =====================================================
           CHARTS SECTION (OLAP Analytics)
      ===================================================== -->
      <div style="margin-top: 1rem; margin-bottom: 0.5rem; padding: 0 0.25rem;">
        <h2 style="font-size:16px; font-weight:500; color:#a0a0c0; text-transform:uppercase; letter-spacing:1px; margin:0;">
          📈 Analytics (OLAP)
        </h2>
      </div>

      <div class="charts-section">

        <!-- Row 1 -->
        <div class="chart-row">
          <div class="chart-card">
            <h3>Rants Posted — Last 7 Days</h3>
            <div style="position:relative; height:260px;">
              <canvas id="rantsPerDayChart" role="img" aria-label="Line chart of rants posted per day over last 7 days"></canvas>
            </div>
          </div>
          <div class="chart-card">
            <h3>Anonymous vs Named Posts</h3>
            <div style="position:relative; height:260px;">
              <canvas id="anonRatioChart" role="img" aria-label="Donut chart of anonymous vs named rants"></canvas>
            </div>
          </div>
        </div>

        <!-- Row 2 -->
        <div class="chart-row">
          <div class="chart-card">
            <h3>Top 5 Most Active Users</h3>
            <div style="position:relative; height:260px;">
              <canvas id="topUsersChart" role="img" aria-label="Bar chart of top 5 users by rant count"></canvas>
            </div>
          </div>
          <div class="chart-card">
            <h3>Peak Posting Hours</h3>
            <div style="position:relative; height:260px;">
              <canvas id="peakHoursChart" role="img" aria-label="Bar chart of rant activity by hour of day"></canvas>
            </div>
          </div>
        </div>

      </div>
      <!-- END CHARTS -->

    </section>
    <!-- END OVERVIEW -->

    <!-- ALL RANTS -->
    <section class="admin-section" id="sec-rants">
      <div class="a-page-title">All Rants</div>
      <div id="all-rants-list"></div>
    </section>

    <!-- USERS -->
    <section class="admin-section" id="sec-users">
      <div class="a-page-title">Users</div>
      <table class="admin-table">
        <thead>
          <tr>
            <th>Username</th>
            <th>Role</th>
            <th>Status</th>
            <th>Last Active</th>
            <th>Offline For</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody id="users-tbody"></tbody>
      </table>
    </section>

    <!-- COMMENTS -->
    <section class="admin-section" id="sec-comments">
      <div class="a-page-title">Comments</div>
      <div id="comments-list"></div>
    </section>

    <!-- REPORTS -->
    <section class="admin-section" id="sec-reports">
      <div class="a-page-title">Reports</div>
      <div id="reports-list">No reports yet.</div>
    </section>

  </main>
</div>



<!-- Chart Scripts -->
<script>
async function fetchChart(type) {
    const res = await fetch('get_chart_data.php?type=' + type);
    return await res.json();
}

async function initCharts() {
    // 1. Rants per Day
    const rpd = await fetchChart('rants_per_day');
    new Chart(document.getElementById('rantsPerDayChart'), {
        type: 'line',
        data: {
            labels: rpd.labels,
            datasets: [{ label: 'Rants', data: rpd.data, borderColor: '#7c3aed', backgroundColor: 'rgba(124,58,237,0.15)', borderWidth: 2, pointBackgroundColor: '#7c3aed', fill: true, tension: 0.4 }]
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { color: '#888', stepSize: 1 }, grid: { color: 'rgba(255,255,255,0.05)' } }, x: { ticks: { color: '#888' }, grid: { color: 'rgba(255,255,255,0.05)' } } } }
    });

    // 2. Anonymous Ratio
    const anon = await fetchChart('anonymous_ratio');
    new Chart(document.getElementById('anonRatioChart'), {
        type: 'doughnut',
        data: { labels: anon.labels, datasets: [{ data: anon.data, backgroundColor: ['#7c3aed', '#06b6d4', '#f59e0b', '#ef4444'], borderColor: ['#1a1a2e'], borderWidth: 3 }] },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { color: '#a0a0c0', padding: 16, font: { size: 12 } } } } }
    });

    // 3. Top Users
    const top = await fetchChart('top_users');
    new Chart(document.getElementById('topUsersChart'), {
        type: 'bar',
        data: { labels: top.labels, datasets: [{ label: 'Rants', data: top.data, backgroundColor: 'rgba(124,58,237,0.7)', borderColor: '#7c3aed', borderWidth: 1, borderRadius: 6 }] },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { color: '#888', stepSize: 1 }, grid: { color: 'rgba(255,255,255,0.05)' } }, x: { ticks: { color: '#888' }, grid: { display: false } } } }
    });

    // 4. Peak Hours
    const hours = await fetchChart('rants_per_hour');
    new Chart(document.getElementById('peakHoursChart'), {
        type: 'bar',
        data: { labels: hours.labels, datasets: [{ label: 'Rants', data: hours.data, backgroundColor: 'rgba(6,182,212,0.6)', borderColor: '#06b6d4', borderWidth: 1, borderRadius: 4 }] },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { color: '#888', stepSize: 1 }, grid: { color: 'rgba(255,255,255,0.05)' } }, x: { ticks: { color: '#888', autoSkip: true, maxTicksLimit: 12 }, grid: { display: false } } } }
    });
}

initCharts();
</script>

<script src="utils.js"></script>
<script src="admin.js"></script>
</body>
</html>