<?php
include 'database.php';
session_start();

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
  <title>Login - EchoWall</title>
  <link rel="stylesheet" href="style.css"/>
  <link rel="stylesheet" href="login-style.css"/>
</head>
<body class="auth-page">
  <div class="auth-wrap">
    <div class="auth-art" aria-hidden="true">
      <div class="art-room">
        <div class="art-lamp"></div>
        <div class="art-chair"></div>
        <div class="art-person"></div>
        <div class="art-megaphone"></div>
        <div class="art-radio">ECHOWALL</div>
        <div class="art-burst">WHY SO QUIET?</div>
      </div>
    </div>

    <div class="auth-card">
      <div class="auth-switch">No account yet? <a href="signup.php">Create one</a></div>
      <div class="auth-logo">
        <div class="logo">EchoWall</div>
      </div>

      <h2>Welcome back</h2>
      <p class="auth-sub">Step back into the echo chamber.</p>

      <?php if(isset($_GET['error'])): ?>
        <div class="auth-err" style="display:block;">
          <?php
          $error = $_GET['error'];
          echo $error === 'banned'
            ? 'Your account has been banned.'
            : htmlspecialchars($error);
          ?>
        </div>
      <?php endif; ?>

      <form action="login_process.php" method="POST">
        <div class="field">
          <label for="u">Username</label>
          <input id="u" name="username" type="text" placeholder="your_username" required />
        </div>

        <div class="field">
          <label for="p">Password</label>
          <div class="pw-wrap">
            <input id="p" name="password" type="password" placeholder="........" required />
            <button type="button" class="pw-eye" data-target="p" tabindex="-1">
              <svg class="eye-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
            </button>
          </div>
        </div>

        <button type="submit" class="auth-submit">Log in</button>
      </form>
    </div>
  </div>

  <script>
    document.querySelectorAll('.pw-eye').forEach(btn => {
      btn.addEventListener('click', () => {
        const inp = document.getElementById(btn.dataset.target);
        inp.type = inp.type === 'password' ? 'text' : 'password';
      });
    });
  </script>
</body>
</html>
