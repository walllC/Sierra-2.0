<?php
require_once 'database.php';

$pageTitle = "Terms of Service — EchoWall";
$lastUpdated = "June 2026";
?>
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title><?php echo htmlspecialchars($pageTitle); ?></title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Inter:wght@400;500;600&display=swap" rel="stylesheet" />
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      background: #0a0a0a;
      color: #d0d0d0;
      font-family: 'Inter', sans-serif;
      font-size: 15px;
      line-height: 1.75;
      min-height: 100vh;
    }

    /* Subtle dot grid background */
    body::before {
      content: '';
      position: fixed;
      inset: 0;
      background-image: radial-gradient(circle, #2a2a2a 1px, transparent 1px);
      background-size: 28px 28px;
      opacity: 0.4;
      pointer-events: none;
      z-index: 0;
    }

    /* ── NAV ── */
    nav {
      position: sticky;
      top: 0;
      z-index: 100;
      background: rgba(10, 10, 10, 0.92);
      backdrop-filter: blur(8px);
      border-bottom: 1px solid #1e1e1e;
      padding: 14px 40px;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .nav-logo {
      font-family: 'Bebas Neue', sans-serif;
      font-size: 26px;
      letter-spacing: 2px;
      color: #fff;
      text-decoration: none;
    }

    .nav-logo span { color: #7c3aed; }

    .nav-links {
      display: flex;
      gap: 24px;
      list-style: none;
    }

    .nav-links a {
      color: #666;
      text-decoration: none;
      font-size: 11px;
      letter-spacing: 1px;
      text-transform: uppercase;
      transition: color 0.2s;
    }

    .nav-links a:hover { color: #7c3aed; }

    /* ── PAGE WRAPPER ── */
    .page {
      position: relative;
      z-index: 1;
      max-width: 820px;
      margin: 60px auto;
      padding: 0 24px 80px;
    }

    /* ── HEADER ── */
    .page-header {
      margin-bottom: 48px;
      border-bottom: 1px solid #1e1e1e;
      padding-bottom: 28px;
    }

    .page-title {
      font-family: 'Bebas Neue', sans-serif;
      font-size: 56px;
      color: #fff;
      letter-spacing: 3px;
      line-height: 1;
      margin-bottom: 8px;
    }

    .page-meta {
      color: #444;
      font-size: 11px;
    }

    /* ── PINNED RULE BOX ── */
    .pinned-rule {
      position: relative;
      border: 2px solid #7c3aed;
      border-radius: 6px;
      padding: 24px 28px;
      margin-bottom: 48px;
      background: #0f0a1a;
    }

    .pinned-tag {
      position: absolute;
      top: -14px;
      left: 18px;
      background: #7c3aed;
      color: #fff;
      font-family: 'Bebas Neue', sans-serif;
      font-size: 15px;
      letter-spacing: 2px;
      padding: 3px 14px;
      border-radius: 3px;
    }

    .pinned-headline {
      font-family: 'Bebas Neue', sans-serif;
      font-size: 22px;
      color: #7c3aed;
      letter-spacing: 1px;
      margin-bottom: 10px;
    }

    .pinned-rule blockquote {
      font-weight: 700;
      color: #fff;
      font-size: 15px;
      border: none;
      padding: 0;
      margin: 0 0 12px;
      quotes: none;
    }

    .pinned-rule p {
      color: #aaa;
      font-size: 15px;
    }

    /* ── SECTION ── */
    .tos-section {
      margin-bottom: 40px;
    }

    .section-title {
      font-family: 'Bebas Neue', sans-serif;
      font-size: 24px;
      color: #7c3aed;
      letter-spacing: 2px;
      margin-bottom: 14px;
      padding-bottom: 8px;
      border-bottom: 1px solid #1e1e1e;
    }

    .tos-section p {
      color: #999;
      margin-bottom: 12px;
    }

    .tos-section ul {
      list-style: none;
      padding: 0;
      margin-bottom: 12px;
    }

    .tos-section ul li {
      display: flex;
      align-items: flex-start;
      gap: 10px;
      color: #999;
      margin-bottom: 10px;
    }

    .tos-section ul li .bullet {
      flex-shrink: 0;
      width: 22px;
      height: 22px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-family: 'Bebas Neue', sans-serif;
      font-size: 15px;
    }

    .bullet-allow {
      background: #1a3d1a;
      color: #4caf50;
    }

    .bullet-deny {
      background: #3d1a1a;
      color: #7c3aed;
    }

    .tos-section ul li strong { color: #ddd; }

    /* ── HIGHLIGHT BOX ── */
    .highlight {
      background: #141414;
      border-left: 3px solid #7c3aed;
      padding: 14px 18px;
      margin: 16px 0;
      border-radius: 0 4px 4px 0;
      color: #aaa;
    }

    .highlight em {
      color: #7c3aed;
      font-style: normal;
      font-weight: 700;
    }

    /* ── FOOTER ── */
    footer {
      position: relative;
      z-index: 1;
      border-top: 1px solid #1a1a1a;
      background: #0a0a0a;
      padding: 28px 40px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 12px;
    }

    .footer-logo {
      font-family: 'Bebas Neue', sans-serif;
      font-size: 18px;
      letter-spacing: 2px;
      color: #333;
    }

    .footer-logo span { color: #7a3010; }

    .footer-links {
      display: flex;
      gap: 20px;
      list-style: none;
    }

    .footer-links a {
      color: #444;
      text-decoration: none;
      font-size: 11px;
      transition: color 0.2s;
    }

    .footer-links a:hover { color: #7c3aed; }

    .footer-quote {
      color: #2a2a2a;
      font-size: 11px;
      font-style: italic;
      width: 100%;
      text-align: center;
      margin-top: 4px;
    }

    /* ── RESPONSIVE ── */
    @media (max-width: 600px) {
      nav { padding: 14px 20px; }
      .page { margin: 32px auto; padding: 0 16px 60px; }
      .page-title { font-size: 40px; }
      footer { padding: 24px 20px; flex-direction: column; align-items: flex-start; }
    }
  </style>
</head>
<body>

  <!-- NAV -->
  <nav>
    <a href="index.php" class="nav-logo">Echo<span>Wall</span></a>
    <ul class="nav-links">
      <li><a href="index.php">Home</a></li>
      <li><a href="login.php">Login</a></li>
      <li><a href="signup.php">Sign Up</a></li>
    </ul>
  </nav>

  <!-- PAGE -->
  <main class="page">

    <header class="page-header">
      <h1 class="page-title">Terms of Service</h1>
      <p class="page-meta">Last updated: <?php echo htmlspecialchars($lastUpdated); ?> &nbsp;·&nbsp; Effective immediately</p>
    </header>

    <!-- PINNED RULE -->
    <div class="pinned-rule" role="note" aria-label="Pinned community rule">
      <span class="pinned-tag">📌 PINNED — READ THIS FIRST</span>
      <div class="pinned-headline">The one rule that rules them all</div>
      <blockquote>"We are unhinged, but we aren't hateful. Keep it civil or the admin deletes it."</blockquote>
      <p>Rant loud. Be raw. Be real. But the moment you cross into targeted hate, harassment, or discrimination — you're gone. No appeals, no warnings. The admin's word is final.</p>
    </div>

    <!-- SECTION 1 -->
    <section class="tos-section">
      <h2 class="section-title">1. Who We Are &amp; What This Is</h2>
      <p>EchoWall is a space for unfiltered expression — rants, reactions, opinions, and takes that most platforms would shadowban. We believe in radical honesty and anonymity as a right, not a privilege.</p>
      <p>By creating an account or posting on EchoWall, you agree to these Terms of Service in full. If you don't agree, don't use the platform. Simple.</p>
    </section>

    <!-- SECTION 2 -->
    <section class="tos-section">
      <h2 class="section-title">2. What You Can Do Here</h2>
      <ul>
        <li><span class="bullet bullet-allow">✓</span><span>Rant anonymously about anything — society, your job, your exes, the government</span></li>
        <li><span class="bullet bullet-allow">✓</span><span>Share hot takes and unpopular opinions without the PR filter</span></li>
        <li><span class="bullet bullet-allow">✓</span><span>React, agree, disagree, go off — this is the echo chamber you choose</span></li>
        <li><span class="bullet bullet-allow">✓</span><span>Stay anonymous — your identity is yours to protect</span></li>
      </ul>
    </section>

    <!-- SECTION 3 -->
    <section class="tos-section">
      <h2 class="section-title">3. Hard Limits — What Gets You Deleted</h2>
      <div class="highlight">
        <em>Unhinged ≠ Hateful.</em> There is a hard line between venting and weaponizing. Cross it and your content disappears. Cross it twice and so do you.
      </div>
      <p>The following content will be removed immediately and may result in a permanent ban:</p>
      <ul>
        <li><span class="bullet bullet-deny">✕</span><span><strong>Hate speech</strong> — targeting any person or group based on race, ethnicity, religion, gender, sexuality, disability, or national origin</span></li>
        <li><span class="bullet bullet-deny">✕</span><span><strong>Doxxing</strong> — posting real names, addresses, phone numbers, or identifying info of other users</span></li>
        <li><span class="bullet bullet-deny">✕</span><span><strong>Threats &amp; incitement</strong> — calls to violence, self-harm, or harm against others</span></li>
        <li><span class="bullet bullet-deny">✕</span><span><strong>Harassment campaigns</strong> — coordinated attacks against any individual or group</span></li>
        <li><span class="bullet bullet-deny">✕</span><span><strong>CSAM</strong> — zero tolerance, immediately reported to authorities</span></li>
        <li><span class="bullet bullet-deny">✕</span><span><strong>Spam &amp; impersonation</strong> — fake accounts, bots, and misleading identity</span></li>
      </ul>
    </section>

    <!-- SECTION 4 -->
    <section class="tos-section">
      <h2 class="section-title">4. Content Ownership &amp; Responsibility</h2>
      <p>Your rants are your own. You own what you post. By posting, you grant EchoWall a non-exclusive license to display and distribute your content on the platform.</p>
      <p>You are solely responsible for what you post. We don't fact-check, moderate in advance, or babysit. But when the community flags something, or the admin finds it — and it violates these terms — it's gone.</p>
    </section>

    <!-- SECTION 5 -->
    <section class="tos-section">
      <h2 class="section-title">5. Admin Authority</h2>
      <div class="highlight">
        The admin reserves the right to remove any content, ban any account, and make judgment calls without prior notice. <em>The admin's decision is final.</em>
      </div>
      <p>This isn't a democracy. It's a platform. The admin built it, the admin runs it. Bans are not negotiable through harassment or repeated account creation.</p>
    </section>

    <!-- SECTION 6 -->
    <section class="tos-section">
      <h2 class="section-title">6. Anonymity &amp; Privacy</h2>
      <p>We collect minimal data. Your username is the face you show here. We will not share your account information with third parties — except when required by law, or when content involves illegal activity under applicable jurisdiction.</p>
      <p>Anonymity protects you. Don't abuse it to hurt others.</p>
    </section>

    <!-- SECTION 7 -->
    <section class="tos-section">
      <h2 class="section-title">7. Disclaimer of Liability</h2>
      <p>EchoWall is provided "as is." We make no guarantees about uptime, data retention, or moderation response times. We are not liable for any harm arising from content posted by users. You use this platform at your own risk.</p>
    </section>

    <!-- SECTION 8 -->
    <section class="tos-section">
      <h2 class="section-title">8. Changes to These Terms</h2>
      <p>We may update these Terms at any time. Continued use of EchoWall after changes are posted means you accept the new terms. Major changes will be announced via a pinned post.</p>
    </section>

  </main>

  <!-- FOOTER -->
  <footer>
    <div class="footer-logo">Echo<span>Wall</span></div>
    <ul class="footer-links">
      <li><a href="#">About</a></li>
      <li><a href="#">Privacy</a></li>
      <li><a href="terms.php">Terms</a></li>
    </ul>
    <p class="footer-quote">"Scream into the void. The void screams back." — EchoWall &copy; <?php echo date('Y'); ?></p>
  </footer>

</body>
</html>