<?php
session_start();
include 'database.php';

// Security: Kick out users not logged in
if (!isset($_SESSION['user_ID'])) {
    header("Location: login.php");
    exit();
}

$user_id = $_SESSION['user_ID'];
$username = $_SESSION['username'];

// Fetch user details from the database
$stmt = $conn->prepare("SELECT role, status, created_at, avatar, cover, bio FROM users WHERE user_ID = ?");
$stmt->bind_param("i", $user_id);
$stmt->execute();
$user_data = $stmt->get_result()->fetch_assoc();

$avatar = $user_data['avatar'] ?? '';
$cover  = $user_data['cover'] ?? '';
$bio    = $user_data['bio'] ?? '';

// Logout logic same as index
if (isset($_GET['logout'])) {
    session_destroy();
    header("Location: login.php");
    exit();
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>@<?php echo htmlspecialchars($username); ?> · RantBox</title>
  <link rel="stylesheet" href="assets/css/style.css"/>
</head>
<body>
<div class="app">

  <aside class="sidebar">
    <div class="sidebar-logo">RantBox</div>
    <button class="nav-item" onclick="window.location.href='index.php'"><span class="ni">🏠</span><span>Home</span></button>
    <button class="nav-item active"><span class="ni">👤</span><span>Profile</span></button>
    <div class="sidebar-divider"></div>
    <a href="profile.php?logout=true" style="text-decoration:none;">
        <button class="nav-item" style="color:var(--danger);"><span class="ni">🚪</span><span>Logout</span></button>
    </a>
  </aside>

  <main class="center-col">
    <div class="profile-header">
      <div class="profile-banner" style="height:150px; background:var(--bg3); background-size:cover; background-position:center;<?php if ($cover) echo ' background-image:url(\''.htmlspecialchars($cover).'\')'; ?>"></div>
      <div class="profile-info" style="padding:15px; position:relative;">
        <div class="av lg" style="width:80px; height:80px; background:var(--accent); color:white; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:32px; font-weight:bold; border:4px solid var(--bg1); margin-top:-50px; overflow:hidden;">
            <?php if ($avatar): ?>
              <img src="<?php echo htmlspecialchars($avatar); ?>" alt="Profile avatar" style="width:100%; height:100%; object-fit:cover;" />
            <?php else: ?>
              <?php echo strtoupper(substr($username, 0, 1)); ?>
            <?php endif; ?>
        </div>
        <h2 style="margin-top:10px;">@<?php echo htmlspecialchars($username); ?></h2>
        <p style="color:var(--text3);">Joined <?php echo date("F Y", strtotime($user_data['created_at'])); ?></p>
        <div class="badge" style="display:inline-block; padding:4px 8px; border-radius:4px; font-size:12px; background:var(--bg2);">
            <?php echo strtoupper($user_data['role']); ?>
        </div>
      </div>
      <div style="padding:0 15px 16px; color:var(--text2);">
        <?php echo htmlspecialchars($bio ?: 'No bio yet.'); ?>
      </div>
    </div>

    <div class="profile-tabs" style="display:flex; border-bottom:1px solid var(--bg3);">
        <div class="tab active" style="padding:15px; border-bottom:2px solid var(--accent);">My Rants</div>
    </div>

    <div id="user-rants-list">
        </div>
  </main>

</div>

<script src="assets/js/utils.js"></script>
<script>
    const phpUser = {
        username: "<?php echo htmlspecialchars($username); ?>",
        userId: <?php echo (int)$user_id; ?>,
        role: "<?php echo htmlspecialchars($user_data['role'] ?? 'user'); ?>"
    };
    localStorage.setItem('rantbox_session', JSON.stringify(phpUser));
    window.userFromPHP = phpUser;
    const currentProfileUser = "<?php echo htmlspecialchars($username); ?>";
</script>
<script src="assets/js/feed.js"></script> 
</body>
</html>