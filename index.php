<?php
session_start();

if (!isset($_SESSION['user_ID'])) {
    header("Location: login.php");
    exit();
}

if (isset($_GET['logout'])) {
    session_destroy();
    header("Location: login.php");
    exit();
}

$username = $_SESSION['username'];
$userId = $_SESSION['user_ID'];
$role = isset($_SESSION['role']) ? $_SESSION['role'] : 'user';
?>
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>RantBox</title>
  <link rel="stylesheet" href="assets/css/style.css"/>

  <!-- ✅ Font Awesome 6 CDN -->
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.7.2/css/all.min.css"/>

  <style>
    .rant { border: 1px solid #ddd; margin: 10px 0; padding: 15px; border-radius: 8px; background: white; }
    .reactions-bar { margin: 10px 0; font-size: 14px; color: #666; }
    .reaction-counts span { margin-right: 15px; }
    .reaction-buttons { display: flex; gap: 5px; margin: 10px 0; padding: 8px 0; border-top: 1px solid #eee; }
    .react-btn { 
      background: none; border: none; padding: 6px 12px; border-radius: 20px; 
      cursor: pointer; font-size: 14px; transition: all 0.2s;
    }
    .react-btn:hover, .react-btn.active { 
      background: #1877f2 !important; color: white !important; 
    }
    .reaction-display { display: flex; gap: 8px; font-size: 13px; color: #666; margin: 5px 0; }
  </style>

  <script>
    const phpUser = {
        username: "<?php echo $username; ?>",
        userId: <?php echo $userId; ?>,
        role: "<?php echo $role; ?>"
    };
    localStorage.setItem('rantbox_session', JSON.stringify(phpUser));
    window.userFromPHP = phpUser;
  </script>
</head>
<body>
<div class="app">
  <aside class="sidebar" id="sidebar">
    <div class="sidebar-logo">RantBox</div>

    <button class="nav-item active" data-page="home">
      <span class="ni"><i class="fa-solid fa-house"></i></span><span>Home</span>
    </button>
    <button class="nav-item" data-page="explore">
      <span class="ni"><i class="fa-solid fa-fire-flame-curved"></i></span><span>Explore</span>
    </button>
    <button class="nav-item" data-page="search">
      <span class="ni"><i class="fa-solid fa-magnifying-glass"></i></span><span>Search</span>
    </button>
    <button class="nav-item" data-page="notifications">
      <span class="ni"><i class="fa-solid fa-bell"></i></span><span>Notifications</span>
      <span class="badge-dot" id="notif-dot"></span>
      <span class="badge-num" id="notif-num"></span>
    </button>
    <button class="nav-item" data-page="messages">
      <span class="ni"><i class="fa-solid fa-message"></i></span><span>Messages</span>
      <span class="badge-dot" id="msg-dot"></span>
      <span class="badge-num" id="msg-num"></span>
    </button>
    <button class="nav-item" data-page="profile">
      <span class="ni"><i class="fa-solid fa-user"></i></span><span>Profile</span>
    </button>
    <button class="nav-item" data-page="settings">
      <span class="ni"><i class="fa-solid fa-gear"></i></span><span>Settings</span>
    </button>

    <?php if($role === 'admin'): ?>
      <button class="nav-item" onclick="window.location.href='admin.php'">
        <span class="ni"><i class="fa-solid fa-shield-halved"></i></span><span>Admin</span>
      </button>
    <?php endif; ?>

    <div class="sidebar-divider"></div>
    <button class="sidebar-post-btn" id="focus-compose">
      <i class="fa-solid fa-plus"></i> Post Rant
    </button>

    <a href="index.php?logout=true" style="text-decoration:none;">
      <button class="nav-item" style="color:var(--danger); margin-top:10px;">
        <span class="ni"><i class="fa-solid fa-right-from-bracket"></i></span><span>Logout</span>
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

  <main class="center-col" id="center">
    <div id="feed-container"></div>
  </main>

  <aside class="right-col">
    <div class="right-box">
      <h3><i class="fa-solid fa-fire-flame-curved"></i> Trending</h3>
      <div id="trending-list">Loading…</div>
    </div>
    <div class="right-box">
      <h3><i class="fa-solid fa-user-plus"></i> Who to follow</h3>
      <div id="suggested-list"></div>
    </div>
  </aside>
</div>

<nav class="bottom-nav">
  <button class="bn-item active" data-page="home">
    <span class="bn-icon"><i class="fa-solid fa-house"></i></span><span>Home</span>
  </button>
  <button class="bn-item" data-page="explore">
    <span class="bn-icon"><i class="fa-solid fa-fire-flame-curved"></i></span><span>Explore</span>
  </button>
  <button class="bn-item" data-page="notifications">
    <span class="bn-icon"><i class="fa-solid fa-bell"></i></span><span>Notifs</span>
    <span class="bn-dot" id="notif-dot-bn"></span>
  </button>
  <button class="bn-item" data-page="messages">
    <span class="bn-icon"><i class="fa-solid fa-message"></i></span><span>DMs</span>
    <span class="bn-dot" id="msg-dot-bn"></span>
  </button>
  <button class="bn-item" data-page="profile">
    <span class="bn-icon"><i class="fa-solid fa-user"></i></span><span>Profile</span>
  </button>
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

<script src="assets/js/utils.js"></script>
<script src="assets/js/storage.js"></script>
<script src="assets/js/auth.js"></script>
<script src="assets/js/feed.js"></script>
</body>
</html>