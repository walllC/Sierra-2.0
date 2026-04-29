<?php
session_start();

// 1. GATEKEEPER: If the user isn't logged in, redirect to login page
if (!isset($_SESSION['user_ID'])) {
    header("Location: login.php");
    exit();
}

// 2. LOGOUT LOGIC: If the URL has ?logout=true, destroy session
if (isset($_GET['logout'])) {
    session_destroy();
    header("Location: login.php");
    exit();
}

// Get the logged-in user's name from the session
$username = $_SESSION['username'];
$role = isset($_SESSION['role']) ? $_SESSION['role'] : 'user';
?>
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>RantBox</title>
  <link rel="stylesheet" href="style.css"/>

  <script>
    const phpUser = {
        username: "<?php echo $username; ?>",
        role: "<?php echo $role; ?>"
    };
    // This populates the localStorage that your original auth.js/feed.js look for
    localStorage.setItem('rantbox_session', JSON.stringify(phpUser));
    window.userFromPHP = phpUser;
  </script>
</head>
<body>
<div class="app">

  <aside class="sidebar" id="sidebar">
    <div class="sidebar-logo">RantBox</div>
    <button class="nav-item active" data-page="home"><span class="ni">🏠</span><span>Home</span></button>
    <button class="nav-item" data-page="explore"><span class="ni">🔥</span><span>Explore</span></button>
    <button class="nav-item" data-page="search"><span class="ni">🔍</span><span>Search</span></button>
    <button class="nav-item" data-page="notifications">
      <span class="ni">🔔</span><span>Notifications</span>
      <span class="badge-dot" id="notif-dot"></span>
      <span class="badge-num" id="notif-num"></span>
    </button>
    <button class="nav-item" data-page="messages">
      <span class="ni">💬</span><span>Messages</span>
      <span class="badge-dot" id="msg-dot"></span>
      <span class="badge-num" id="msg-num"></span>
    </button>
    
    <button class="nav-item" data-page="profile"><span class="ni">👤</span><span>Profile</span></button>
    <button class="nav-item" data-page="settings"><span class="ni">⚙️</span><span>Settings</span></button>

    <?php if($role === 'admin'): ?>
      <button class="nav-item" onclick="window.location.href='admin.php'"><span class="ni">🛡️</span><span>Admin</span></button>
    <?php endif; ?>

    <div class="sidebar-divider"></div>
    <button class="sidebar-post-btn" id="focus-compose">＋ Post Rant</button>

    <a href="index.php?logout=true" style="text-decoration:none;">
      <button class="nav-item" style="color:var(--danger); margin-top:10px;">
        <span class="ni">🚪</span><span>Logout</span>
      </button>
    </a>

    <div class="sidebar-user" id="sb-user">
      <div class="av sm" id="sb-av" style="background:var(--accent); color:white; display:flex; align-items:center; justify-content:center; border-radius:50%; font-weight:bold;">
        <?php echo strtoupper(substr($username, 0, 1)); ?>
      </div>
      <div class="sidebar-user-info">
        <div class="u-name" id="sb-name"><?php echo htmlspecialchars($username); ?></div>
        <div class="u-handle" id="sb-handle">@<?php echo htmlspecialchars($username); ?></div>
      </div>
    </div>
  </aside>

  <main class="center-col" id="center"></main>

  <aside class="right-col">
    <div class="right-box"><h3>🔥 Trending</h3><div id="trending-list">Loading…</div></div>
    <div class="right-box"><h3>Who to follow</h3><div id="suggested-list"></div></div>
  </aside>
</div>

<nav class="bottom-nav">
  <button class="bn-item active" data-page="home"><span class="bn-icon">🏠</span><span>Home</span></button>
  <button class="bn-item" data-page="explore"><span class="bn-icon">🔥</span><span>Explore</span></button>
  <button class="bn-item" data-page="notifications">
    <span class="bn-icon">🔔</span><span>Notifs</span>
    <span class="bn-dot" id="notif-dot-bn"></span>
  </button>
  <button class="bn-item" data-page="messages">
    <span class="bn-icon">💬</span><span>DMs</span>
    <span class="bn-dot" id="msg-dot-bn"></span>
  </button>
  <button class="bn-item" data-page="profile"><span class="bn-icon">👤</span><span>Profile</span></button>
</nav>

<div class="modal-overlay" id="rant-modal">
  <div class="modal-box">
    <h3>New Rant</h3>
    <textarea id="modal-ta" placeholder="What's on your mind?" maxlength="300" rows="4" style="margin-bottom:8px"></textarea>
    <div style="display:flex;justify-content:space-between;align-items:center">
      <span id="modal-cc" style="font-size:13px;color:var(--text3)">0 / 280</span>
      <div style="display:flex;gap:8px">
        <button class="btn btn-ghost btn-sm" id="modal-cancel">Cancel</button>
        <button class="btn btn-primary btn-sm" id="modal-post">Post</button>
      </div>
    </div>
  </div>
</div>

<script src="utils.js"></script>
<script src="storage.js"></script>
<script src="auth.js"></script>
<script src="feed.js"></script>
</body>
</html>