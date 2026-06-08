<?php
include 'database.php';
session_start();

$error = "";

if ($_SERVER["REQUEST_METHOD"] == "POST") {
    $user = trim($_POST['username']);
    $pass = $_POST['password'];
    $conf = $_POST['confirm_password'];

    if (strlen($user) < 3) {
        $error = "Username must be at least 3 characters.";
    } elseif ($pass !== $conf) {
        $error = "Passwords do not match.";
    } elseif (strlen($pass) < 6) {
        $error = "Password must be at least 6 characters.";
    } else {
        $check = $conn->prepare("SELECT user_ID FROM users WHERE username = ?");
        $check->bind_param("s", $user);
        $check->execute();

        if ($check->get_result()->num_rows > 0) {
            $error = "Username already taken.";
        } else {
            $role = 'user';
            $status = 'active';
            $hashed = password_hash($pass, PASSWORD_DEFAULT);
            $stmt = $conn->prepare("INSERT INTO users (username, password, role, status) VALUES (?, ?, ?, ?)");
            $stmt->bind_param("ssss", $user, $hashed, $role, $status);        

            if ($stmt->execute()) {
                header("Location: login.php?signup=success");
                exit();
            } else {
                $error = "Something went wrong. Please try again.";
            }
        }
    }
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Sign Up - EchoWall</title>
  <link rel="stylesheet" href="assets/css/style.css"/>
<link rel="stylesheet" href="assets/css/login-style.css"/>
</head>
<body class="auth-page">

  <div class="auth-wrap">

    <!-- ══ LEFT: Branding (same as login.php) ══ -->
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

    <!-- ══ RIGHT: Sign Up Form ══ -->
    <div class="auth-card">

      <div class="auth-card-logo">Echo<span>Wall</span></div>

      <h2>Create account</h2>
      <p class="auth-sub">Join the echo chamber. No filter required.</p>

      <?php if($error): ?>
        <div class="auth-err show"><?php echo htmlspecialchars($error); ?></div>
      <?php endif; ?>

      <form id="form" action="signup.php" method="POST">
        <div class="field">
          <label for="u">Username <small>(3+ chars)</small></label>
          <input id="u" name="username" type="text" placeholder="pick_a_name" required
            value="<?php echo isset($_POST['username']) ? htmlspecialchars($_POST['username']) : ''; ?>"/>
        </div>

        <div class="field">
          <label for="p">Password <small>(6+ chars)</small></label>
          <div class="pw-wrap">
            <input id="p" name="password" type="password" placeholder="••••••••" required/>
            <button type="button" class="pw-eye" data-target="p" tabindex="-1" aria-label="Toggle password">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                <circle cx="12" cy="12" r="3"/>
              </svg>
            </button>
          </div>
        </div>

        <div class="field">
          <label for="c">Confirm password</label>
          <div class="pw-wrap">
            <input id="c" name="confirm_password" type="password" placeholder="••••••••" required/>
            <button type="button" class="pw-eye" data-target="c" tabindex="-1" aria-label="Toggle password">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                <circle cx="12" cy="12" r="3"/>
              </svg>
            </button>
          </div>
        </div>

        <button type="submit" class="auth-submit" id="btn">Create account</button>
      </form>

      <div class="or-div">already have an account?</div>

      <a href="login.php" class="auth-signup-btn">Log in instead</a>

      <div class="auth-foot">
        <a href="#">About</a> · <a href="#">Privacy</a> · <a href="terms.php">Terms</a>
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