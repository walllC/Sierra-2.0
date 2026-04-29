<?php
include 'database.php'; // Ensure database.php has your $conn connection
session_start();

$error = "";

if ($_SERVER["REQUEST_METHOD"] == "POST") {
    $user = trim($_POST['username']);
    $pass = $_POST['password'];
    $conf = $_POST['confirm_password'];

    // Basic Validation
    if (strlen($user) < 3) {
        $error = "Username must be at least 3 characters.";
    } elseif ($pass !== $conf) {
        $error = "Passwords do not match.";
    } elseif (strlen($pass) < 6) {
        $error = "Password must be at least 6 characters.";
    } else {
        // Check if username exists
        $check = $conn->prepare("SELECT user_ID FROM users WHERE username = ?");
        $check->bind_param("s", $user);
        $check->execute();
        if ($check->get_result()->num_rows > 0) {
            $error = "Username already taken.";
        } else {
            // Insert User (Plain text for testing, use password_hash in production)
            $role = 'user';
            $status = 'active';
            $stmt = $conn->prepare("INSERT INTO users (username, password, role, status) VALUES (?, ?, ?, ?)");
            $stmt->bind_param("ssss", $user, $pass, $role, $status);

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
  <title>Sign Up · RantBox</title>
  <link rel="stylesheet" href="style.css"/>
  <link rel="stylesheet" href="login-style.css"/>
</head>
<body class="auth-page">
  <div class="auth-wrap">
    <div class="auth-logo">
      <div class="logo">RantBox</div>
      <p>Join the rant. No filter required.</p>
    </div>
    <div class="auth-card">
      <h2>Create account</h2>
      
      <?php if($error): ?>
        <div class="auth-err" style="display:block; color: #ff4d4d; margin-bottom: 15px; font-size: 14px;">
            <?php echo $error; ?>
        </div>
      <?php endif; ?>

      <form id="form" action="signup.php" method="POST">
        <div class="field">
          <label for="u">Username <small style="color:var(--text3);font-weight:400">(3+ chars, no spaces)</small></label>
          <input id="u" name="username" type="text" placeholder="pick_a_name" required value="<?php echo isset($_POST['username']) ? htmlspecialchars($_POST['username']) : ''; ?>"/>
        </div>
        
        <div class="field">
          <label for="p">Password <small style="color:var(--text3);font-weight:400">(6+ chars)</small></label>
          <div class="pw-wrap">
            <input id="p" name="password" type="password" placeholder="••••••••" required/>
            <button type="button" class="pw-eye" data-target="p" tabindex="-1">
              <svg class="eye-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
            </button>
          </div>
        </div>

        <div class="field">
          <label for="c">Confirm password</label>
          <div class="pw-wrap">
            <input id="c" name="confirm_password" type="password" placeholder="••••••••" required/>
          </div>
        </div>

        <button type="submit" class="auth-submit" id="btn">Create account</button>
      </form>

      <div class="or-div">or</div>
      <div class="auth-foot">Already have one? <a href="login.php">Log in</a></div>
    </div>
  </div>

  <script>
    // Password visibility toggle
    document.querySelectorAll('.pw-eye').forEach(btn => {
      btn.addEventListener('click', () => {
        const inp = document.getElementById(btn.dataset.target);
        inp.type = inp.type === 'password' ? 'text' : 'password';
      });
    });
  </script>
</body>
</html>