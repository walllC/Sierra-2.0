<?php
include 'database.php';
session_start();

// If already logged in, send them to the home page
if (isset($_SESSION['user_ID'])) {
    if ($_SESSION['role'] === 'admin') {
        header("Location: admin.php");
    } else {
        header("Location: index.php");
    }
    exit();
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Login · RantBox</title>
  <link rel="stylesheet" href="style.css"/>
  <link rel="stylesheet" href="login-style.css"/>
</head>
<body class="auth-page">
  <div class="auth-wrap">
    <div class="auth-logo">
      <div class="logo">RantBox</div>
      <p>The dark corner of the internet. Say anything.</p>
    </div>
    <div class="auth-card">
      <h2>Welcome back</h2>
      
      <?php if(isset($_GET['error'])): ?>
        <div style="color: #ff4d4d; margin-bottom: 10px; font-size: 14px;">
            <?php echo htmlspecialchars($_GET['error']); ?>
        </div>
      <?php endif; ?>

      <form action="login_process.php" method="POST">
        <div class="field">
          <label for="u">Username</label>
          <input id="u" name="username" type="text" placeholder="your_username" required />
        </div>
        <div class="field">
          <label for="p">Password</label>
          <input id="p" name="password" type="password" placeholder="••••••••" required />
        </div>
        <button type="submit" class="auth-submit">Log in</button>
      </form>
      
      <div class="or-div">or</div>
      <div class="auth-foot">No account? <a href="signup.php">Create one</a></div>
    </div>
  </div>

  </body>
</html>