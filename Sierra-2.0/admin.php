<?php
session_start();

// --- LOGOUT LOGIC ---
if (isset($_GET['logout'])) {
    session_destroy();
    header("Location: login.php");
    exit();
}

// --- SECURITY CHECK ---
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
</head>
<body>
<div class="admin-layout">
  <aside class="admin-sidebar">
    <div class="admin-brand">RantBox <small>Admin Panel</small></div>
    <nav>
      <button class="admin-nav-link active" data-sec="overview"><span class="ni">📊</span><span>Overview</span></button>
      <button class="admin-nav-link" data-sec="rants"><span class="ni">💬</span><span>All Rants</span></button>
      <button class="admin-nav-link" data-sec="users"><span class="ni">👥</span><span>Users</span></button>
      <button class="admin-nav-link" data-sec="reports"><span class="ni">🚩</span><span>Reports</span></button>
    </nav>
    <div class="admin-footer">
      <a href="admin.php?logout=true" class="btn btn-ghost btn-sm" style="width:100%; text-decoration:none; text-align:center; display:block;">Log out</a>
    </div>
  </aside>

  <main class="admin-main">
    <section class="admin-section active" id="sec-overview">
      <div class="a-page-title">Dashboard (Welcome, <?php echo htmlspecialchars($_SESSION['username']); ?>)</div>
      
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

      <div class="tbl-card">
        <div class="tbl-hdr">Recent Rants</div>
        <div id="recent-rants"></div>
      </div>
    </section>
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

    <!-- REPORTS -->
    <section class="admin-section" id="sec-reports">
      <div class="a-page-title">Reports</div>
      <div id="reports-list">No reports yet.</div>
    </section>

    </main>
</div>

<script src="utils.js"></script>
<script src="admin.js"></script>
</body>
</html>
