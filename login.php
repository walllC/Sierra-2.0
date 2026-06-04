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

    <!-- ══ LEFT: Branding ══ -->
    <div class="auth-art" aria-hidden="true">

      <div>
        <div class="art-brand-name">Echo<span>Wall</span></div>
        <div class="art-brand-tag">Where silence is not an option.</div>
      </div>

      <div class="art-tagline-card">
        <div class="art-tagline-main">
          Scream into the void.<br>The void screams back.
        </div>
        <div class="art-tagline-sub">
          Your rants. Your reactions. Your echo chamber — unscripted, unedited, unapologetic.
        </div>
      </div>

      <div class="art-stats">
        <div class="art-stat">
          <div class="art-stat-num">24/7</div>
          <div class="art-stat-label">Open</div>
        </div>
        <div class="art-stat">
          <div class="art-stat-num">∞</div>
          <div class="art-stat-label">Hot takes</div>
        </div>
        <div class="art-stat">
          <div class="art-stat-num">0</div>
          <div class="art-stat-label">Filters applied</div>
        </div>
      </div>

      <div class="art-feed">

        <div class="art-rant">
          "Anonymity doesn't change who you are; it just finally lets you take the filter off."
        </div>

        <div class="art-rant">
          "Scream it as loud as you need to. Here, your voice belongs entirely to you."
        </div>
      </div>

    </div>

    <!-- ══ RIGHT: Login Form ══ -->
    <div class="auth-card">

      <div class="auth-card-logo">Echo<span>Wall</span></div>

      <h2>Welcome back</h2>
      <p class="auth-sub">Step back into the echo chamber.</p>

      <?php if(isset($_GET['error'])): ?>
        <div class="auth-err show">
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
            <input id="p" name="password" type="password" placeholder="••••••••" required />
            <button type="button" class="pw-eye" data-target="p" tabindex="-1" aria-label="Toggle password">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                <circle cx="12" cy="12" r="3"/>
              </svg>
            </button>
          </div>
        </div>

        <button type="submit" class="auth-submit">Log in</button>
      </form>

      <div class="or-div">new here?</div>

      <a href="signup.php" class="auth-signup-btn">Create an account</a>

      <div class="auth-foot">
        <a href="terms.php">Terms</a>
        <br>EchoWall © 2026
      </div>

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