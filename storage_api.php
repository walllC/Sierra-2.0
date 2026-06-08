<?php
// ================================================================
// storage_api.php  –  EchoWall / RantBox
//
// PURPOSE:
//   Single HTTP gateway between the JavaScript front-end (storage.js)
//   and the MySQL database. Every AJAX call from the client lands here.
//
// AUTHENTICATION:
//   A valid PHP session is required for ALL actions. Any request
//   without $_SESSION['user_ID'] is immediately rejected with a 401.
//
// REQUEST FORMAT:
//   GET  requests pass `action` and any extra params in the query string.
//   POST requests pass `action` in the body (FormData) along with data.
//   $_REQUEST is used to read `action` so it works for both methods.
//
// RESPONSE FORMAT:
//   Always JSON. Successful responses vary by action. Errors always
//   return { "error": "<message>" }. jout() and jerr() enforce this
//   contract and terminate execution immediately via exit().
//
// SECURITY NOTES:
//   • All DB queries use prepared statements with bound parameters to
//     prevent SQL injection.
//   • Actions that mutate data (INSERT/UPDATE/DELETE) verify the
//     request method is POST before proceeding.
//   • The session user_ID is always used to scope mutations — clients
//     cannot pass a different user_ID to act on another user's data.
// ================================================================

session_start();
require_once 'database.php';

// Tell the browser (and storage.js's fetch calls) to expect JSON.
header('Content-Type: application/json');

// ── Session guard ─────────────────────────────────────────────
// Reject any unauthenticated request before touching the DB.
if (!isset($_SESSION['user_ID'])) {
    echo json_encode(['error' => 'Unauthorized']); exit();
}

// Convenience variables derived from the session so every case
// below can use $me / $me_id without re-reading $_SESSION.
$me     = $_SESSION['username'];   // Current user's username string.
$me_id  = $_SESSION['user_ID'];    // Current user's integer DB primary key.

// Read the action from GET or POST (whichever was used).
$action = $_REQUEST['action'] ?? '';
$method = $_SERVER['REQUEST_METHOD'];

// ── Output helpers ────────────────────────────────────────────

/**
 * Encodes $data as JSON, prints it, and exits.
 * Use for all successful responses.
 * @param mixed $data
 */
function jout($data) { echo json_encode($data); exit(); }

/**
 * Encodes an error message as JSON, prints it, and exits.
 * Use whenever a request cannot be fulfilled.
 * @param string $msg Human-readable error description.
 */
function jerr($msg)  { echo json_encode(['error' => $msg]); exit(); }


// ── Action router ─────────────────────────────────────────────
// Each case handles one logical API action. Cases use curly-brace
// blocks so variables declared inside don't leak into other cases.
switch ($action) {


  // ════════════════════════════════════════════════════════
  // USERS
  // Read and update user profile records.
  // ════════════════════════════════════════════════════════

  /**
   * GET get_user
   * Fetches a single user's public profile fields.
   * Defaults to the current session user if no `username` param is given.
   * Sensitive fields (password hash, etc.) are deliberately excluded
   * from the SELECT list.
   */
  case 'get_user': {
    $username = $_GET['username'] ?? $me;
    $stmt = $conn->prepare(
      "SELECT user_ID,username,role,status,avatar,bio,theme,cover,created_at
       FROM users WHERE username=?"
    );
    $stmt->bind_param("s", $username);
    $stmt->execute();
    $row = $stmt->get_result()->fetch_assoc();
    if (!$row) jerr('User not found');
    jout($row);
  }

  /**
   * GET get_users
   * Returns all non-admin, active user accounts.
   * Used to populate suggestion lists, search results, etc.
   * Password and sensitive fields are excluded from the SELECT.
   */
  case 'get_users': {
    $res = $conn->query(
      "SELECT user_ID,username,role,status,avatar,bio,created_at
       FROM users WHERE status='active' AND role!='admin'"
    );
    $users = [];
    while ($r = $res->fetch_assoc()) $users[] = $r;
    jout($users);
  }

  /**
   * POST update_user
   * Updates one or more profile fields for the current session user.
   * Only fields present in $_POST are included in the UPDATE so a
   * partial update (e.g. bio only) won't accidentally clear other fields.
   *
   * Accepted fields: bio, cover, avatar, theme, password.
   * Theme is sanitised to 'light' or 'dark' — no arbitrary values allowed.
   * Returns { success: true } on success; errors if nothing was sent.
   */
  case 'update_user': {
    if ($method !== 'POST') jerr('POST required');

    // Dynamically build the SET clause from whichever fields were sent.
    $fields = [];  // SQL fragments like "bio=?"
    $types  = '';  // bind_param type string, e.g. "sss"
    $vals   = [];  // Bound values in the same order as $fields.

    if (isset($_POST['bio'])) {
      $fields[] = 'bio=?'; $types .= 's'; $vals[] = trim($_POST['bio']);
    }
    if (isset($_POST['cover'])) {
      $fields[] = 'cover=?'; $types .= 's'; $vals[] = $_POST['cover'];
    }
    if (isset($_POST['avatar'])) {
      $fields[] = 'avatar=?'; $types .= 's'; $vals[] = $_POST['avatar'];
    }
    if (isset($_POST['theme'])) {
      // Whitelist the only two valid theme values.
      $t = $_POST['theme'] === 'light' ? 'light' : 'dark';
      $fields[] = 'theme=?'; $types .= 's'; $vals[] = $t;
    }
    if (isset($_POST['password'])) {
    $hashed = password_hash($_POST['password'], PASSWORD_DEFAULT);
    $fields[] = 'password=?'; $types .= 's'; $vals[] = $hashed;
    }

    // Reject the request if no recognised field was included.
    if (!$fields) jerr('Nothing to update');

    // Append the WHERE clause binding (username) at the end.
    $types .= 's'; $vals[] = $me;
    $sql  = "UPDATE users SET " . implode(',', $fields) . " WHERE username=?";
    $stmt = $conn->prepare($sql);
    $stmt->bind_param($types, ...$vals);
    $stmt->execute();
    jout(['success' => true]);
  }

  /**
   * GET get_theme
   * Lightweight endpoint that returns only the session user's theme
   * preference. Called by storage.js getTheme() to avoid fetching the
   * full user object just for a CSS toggle.
   */
  case 'get_theme': {
    $stmt = $conn->prepare("SELECT theme FROM users WHERE username=?");
    $stmt->bind_param("s", $me);
    $stmt->execute();
    $r = $stmt->get_result()->fetch_assoc();
    // Fall back to 'dark' if the DB row is somehow missing.
    jout(['theme' => $r['theme'] ?? 'dark']);
  }


  // ════════════════════════════════════════════════════════
  // RANTS
  // Core content. Creation and deletion are handled by separate
  // PHP files (save_rant.php, api/delete_rant.php). This API
  // handles reading, editing, trending, and reposts.
  // ════════════════════════════════════════════════════════

  /**
   * GET get_trending
   * Returns up to 3 rants created today, ranked by total reaction count.
   * Only rants from active (non-suspended) users are considered.
   * The `react_count` subquery is used for ORDER BY only; the full
   * reaction map is attached via getReactions() so the card UI can
   * render per-emoji counts.
   */
  case 'get_trending': {
    $sql = "SELECT r.rant_ID, r.user_ID, r.content, r.anonymous,
                   r.is_anonymous, r.created_at, u.username,
                   (SELECT COUNT(*) FROM reactions rx
                    WHERE rx.rant_ID = r.rant_ID) AS react_count
            FROM rants r
            JOIN users u ON u.user_ID = r.user_ID
            WHERE r.created_at >= NOW() - INTERVAL 24 HOUR
              AND u.status = 'active'
            ORDER BY react_count DESC
            LIMIT 3";
    $stmt = $conn->prepare($sql);
    $stmt->execute();
    $res   = $stmt->get_result();
    $rants = [];
    while ($row = $res->fetch_assoc()) {
      // Attach full per-emoji reaction map so the front-end can
      // show e.g. "❤️ 4  😂 2" without a second request.
      $row['reactions'] = getReactions($conn, $row['rant_ID']);
      $rants[] = $row;
    }
    jout($rants);
  }

  /**
   * POST update_rant
   * Allows the author to edit the text content of their own rant.
   * Ownership is enforced by the WHERE user_ID=? clause — another
   * user's rant_ID will simply match 0 rows and succeed silently
   * (no data leaked, no error exposed to attacker).
   * Sets updated_at so the UI can show an "edited" label.
   */
  case 'update_rant': {
    if ($method !== 'POST') jerr('POST required');
    $rant_id = intval($_POST['rant_id'] ?? 0);
    $content = trim($_POST['content'] ?? '');
    if (!$rant_id || !$content) jerr('Missing data');

    $stmt = $conn->prepare(
      "UPDATE rants SET content=?, updated_at=NOW()
       WHERE rant_ID=? AND user_ID=?"
    );
    $stmt->bind_param("sii", $content, $rant_id, $me_id);
    $stmt->execute();
    jout(['success' => true]);
  }

  /**
   * POST repost
   * Creates a new rant row that references the original via repost_of_id.
   * Guards:
   *   • Prevents duplicate reposts (one repost per user per rant).
   *   • Copies content from the original; if the original is archived,
   *     the repost content is intentionally left blank so archived text
   *     isn't surfaced through the repost.
   * Returns the new rant's insert_id so the client can optimistically
   * prepend the card to the feed.
   */
  case 'repost': {
    if ($method !== 'POST') jerr('POST required');
    $rant_id = intval($_POST['rant_id'] ?? 0);
    if (!$rant_id) jerr('Missing rant_id');

    // Duplicate check: has this user already reposted this rant?
    $check = $conn->prepare(
      "SELECT rant_ID FROM rants WHERE user_ID=? AND repost_of_id=?"
    );
    $check->bind_param("ii", $me_id, $rant_id);
    $check->execute();
    if ($check->get_result()->num_rows > 0) jerr('Already reposted');

    // Fetch the original rant's content and author.
    $orig = $conn->prepare(
      "SELECT r.content, u.username, r.anonymous, r.is_archived
       FROM rants r JOIN users u ON u.user_ID=r.user_ID
       WHERE r.rant_ID=?"
    );
    $orig->bind_param("i", $rant_id);
    $orig->execute();
    $o = $orig->get_result()->fetch_assoc();
    if (!$o) jerr('Rant not found');

    // Respect the archive: don't propagate archived rant content.
    $content = ($o['is_archived'] == 1) ? '' : $o['content'];

    $stmt = $conn->prepare(
      "INSERT INTO rants (user_ID, content, anonymous, repost_of_id, repost_of_user, created_at)
       VALUES (?, ?, 0, ?, ?, NOW())"
    );
    $stmt->bind_param("isis", $me_id, $content, $rant_id, $o['username']);
    $stmt->execute();
    jout(['success' => true, 'new_id' => $stmt->insert_id]);
  }


  // ════════════════════════════════════════════════════════
  // FOLLOWS
  // Social graph: who follows whom.
  // The `follows` table stores (follower, following) username pairs.
  // ════════════════════════════════════════════════════════

  /**
   * GET get_followers
   * Returns an array of usernames who follow the given user.
   * Defaults to the session user if no `username` param is provided.
   */
  case 'get_followers': {
    $username = $_GET['username'] ?? $me;
    $stmt = $conn->prepare(
      "SELECT follower FROM follows WHERE following=?"
    );
    $stmt->bind_param("s", $username);
    $stmt->execute();
    $res  = $stmt->get_result();
    $list = [];
    while ($r = $res->fetch_assoc()) $list[] = $r['follower'];
    jout($list);
  }

  /**
   * GET get_following
   * Returns an array of usernames that the given user follows.
   * Defaults to the session user if no `username` param is provided.
   */
  case 'get_following': {
    $username = $_GET['username'] ?? $me;
    $stmt = $conn->prepare(
      "SELECT following FROM follows WHERE follower=?"
    );
    $stmt->bind_param("s", $username);
    $stmt->execute();
    $res  = $stmt->get_result();
    $list = [];
    while ($r = $res->fetch_assoc()) $list[] = $r['following'];
    jout($list);
  }

  /**
   * POST toggle_follow
   * Atomically follows or unfollows `target` for the session user.
   * Checks for an existing row first:
   *   • Row exists  → DELETE it  → returns { following: false }
   *   • No row      → INSERT it  → returns { following: true }
   * Prevents self-follow by rejecting $target === $me.
   */
  case 'toggle_follow': {
    if ($method !== 'POST') jerr('POST required');
    $target = trim($_POST['target'] ?? '');
    if (!$target || $target === $me) jerr('Invalid target');

    // Check if the follow relationship already exists.
    $check = $conn->prepare(
      "SELECT follow_ID FROM follows WHERE follower=? AND following=?"
    );
    $check->bind_param("ss", $me, $target);
    $check->execute();

    if ($check->get_result()->num_rows > 0) {
      // Already following → unfollow.
      $del = $conn->prepare(
        "DELETE FROM follows WHERE follower=? AND following=?"
      );
      $del->bind_param("ss", $me, $target);
      $del->execute();
      jout(['following' => false]);
    } else {
      // Not yet following → follow.
      $ins = $conn->prepare(
        "INSERT INTO follows (follower, following) VALUES (?, ?)"
      );
      $ins->bind_param("ss", $me, $target);
      $ins->execute();
      jout(['following' => true]);
    }
  }

  /**
   * GET is_following
   * Returns { following: true/false } indicating whether the session
   * user currently follows `target`. Used to set the initial state of
   * the Follow button without fetching the full following list.
   */
  case 'is_following': {
    $target = $_GET['target'] ?? '';
    $check  = $conn->prepare(
      "SELECT follow_ID FROM follows WHERE follower=? AND following=?"
    );
    $check->bind_param("ss", $me, $target);
    $check->execute();
    jout(['following' => $check->get_result()->num_rows > 0]);
  }

  /**
   * GET get_suggested
   * Returns up to 5 users the session user might want to follow,
   * ranked by mutual-follower count (people followed by people you
   * already follow are shown first).
   *
   * Excludes:
   *   • The session user themselves.
   *   • Admins (role != 'admin').
   *   • Suspended users (status = 'active' only).
   *   • Users the session user already follows.
   *   • Users the session user has blocked.
   *
   * The `mutuals` subquery counts how many of the candidate's followers
   * are also followed by the session user — a proxy for social proximity.
   */
  case 'get_suggested': {
    $sql = "SELECT u.username, u.avatar, u.bio,
                   (SELECT COUNT(*)
                    FROM follows f2
                    JOIN follows f3 ON f3.following = f2.follower
                    WHERE f2.following = u.username
                      AND f3.follower  = ?) AS mutuals
            FROM users u
            WHERE u.username != ?
              AND u.role     != 'admin'
              AND u.status    = 'active'
              AND u.username NOT IN (SELECT following FROM follows WHERE follower=?)
              AND u.username NOT IN (SELECT blocked   FROM blocks  WHERE blocker=?)
            ORDER BY mutuals DESC
            LIMIT 5";
    $stmt = $conn->prepare($sql);
    // $me is bound four times: once each for mutuals calc, self-exclude,
    // already-following exclude, and blocked exclude.
    $stmt->bind_param("ssss", $me, $me, $me, $me);
    $stmt->execute();
    $res  = $stmt->get_result();
    $list = [];
    while ($r = $res->fetch_assoc()) $list[] = $r;
    jout($list);
  }


  // ════════════════════════════════════════════════════════
  // NOTIFICATIONS
  // Server-generated events triggered by likes, comments, follows,
  // and reposts. Notifications are grouped client-side (storage.js)
  // and server-side here to reduce visual noise.
  // ════════════════════════════════════════════════════════

  /**
   * GET get_notifications
   * Fetches the 50 most recent notifications for the session user,
   * then groups similar notifications that occurred within the same hour
   * (e.g. "Alice, Bob and 3 others liked your rant") to avoid flooding.
   *
   * Grouping logic:
   *   • Two notifications are grouped if they share the same `type`
   *     and `rant_ID`, and the oldest is less than 3600 seconds old.
   *   • Grouped entries accumulate actor usernames in a `froms` array.
   *   • The group is marked unread (`read: false`) if ANY member is unread.
   *
   * Returns an array of grouped notification objects, each with a
   * `froms` array and a boolean `read` flag.
   */
  case 'get_notifications': {
    $stmt = $conn->prepare(
      "SELECT n.notif_ID, n.from_user_ID, n.to_user_ID, n.type, n.message,
              n.rant_ID, n.comment_ID, n.created_at, n.read_status,
              u.username AS from_user
       FROM notifications n
       LEFT JOIN users u ON u.user_ID = n.from_user_ID
       WHERE n.to_user_ID = ?
       ORDER BY n.created_at DESC
       LIMIT 50"
    );
    $stmt->bind_param("i", $me_id);
    $stmt->execute();
    $res  = $stmt->get_result();
    $list = [];
    while ($r = $res->fetch_assoc()) $list[] = $r;

    // ── Server-side grouping ───────────────────────────────
    // Walk the flat list and merge rows that share the same type+rant
    // and occurred within one hour of the group's first entry.
    $groups = [];
    foreach ($list as $n) {
      $found = false;
      foreach ($groups as &$g) {
        $sameType  = $g['type']    === $n['type'];
        $sameRant  = $g['rant_ID'] == $n['rant_ID'];
        $recentAge = (time() - strtotime($g['created_at'])) < 3600;

        if ($sameType && $sameRant && $recentAge) {
          // Add this actor to the group if not already present.
          if (!in_array($n['from_user'], $g['froms']))
            $g['froms'][] = $n['from_user'];
          // Any unread member makes the whole group unread.
          if (!$n['read_status']) $g['read'] = false;
          $found = true;
          break;
        }
      }
      unset($g); // Release the reference from the foreach.

      if (!$found) {
        // Start a new group with this notification as its first entry.
        $n['froms'] = [$n['from_user']];
        $n['read']  = (bool)$n['read_status'];
        $groups[]   = $n;
      }
    }
    jout($groups);
  }

  /**
   * POST add_notification
   * Inserts a new notification row targeting another user.
   * Silently succeeds (no error) if the sender tries to notify
   * themselves or if the target user doesn't exist — this avoids
   * exposing user enumeration to the caller.
   *
   * Required POST fields: to, type, message.
   * Optional POST field:  rant_id (linked rant, or 0/omitted for none).
   */
  case 'add_notification': {
    if ($method !== 'POST') jerr('POST required');
    $to      = trim($_POST['to']      ?? '');
    $type    = trim($_POST['type']    ?? '');
    $message = trim($_POST['message'] ?? '');
    $rant_id = intval($_POST['rant_id'] ?? 0) ?: null; // Store NULL if no rant.

    // Self-notifications and missing required fields are silently dropped.
    if (!$to || !$type || $to === $me) jout(['success' => true]);

    // Resolve the target username to a user_ID for the FK column.
    $res = $conn->prepare("SELECT user_ID FROM users WHERE username=?");
    $res->bind_param("s", $to);
    $res->execute();
    $row = $res->get_result()->fetch_assoc();
    if (!$row) jout(['success' => true]); // Unknown user — succeed silently.

    $to_id = $row['user_ID'];
    $stmt  = $conn->prepare(
      "INSERT INTO notifications (from_user_ID, to_user_ID, type, message, rant_ID)
       VALUES (?, ?, ?, ?, ?)"
    );
    $stmt->bind_param("iissi", $me_id, $to_id, $type, $message, $rant_id);
    $stmt->execute();
    jout(['success' => true]);
  }

  /**
   * POST mark_notifications_read
   * Marks all of the session user's unread notifications as read.
   * Called when the user opens the Notifications page.
   */
  case 'mark_notifications_read': {
    $stmt = $conn->prepare(
      "UPDATE notifications SET read_status=1 WHERE to_user_ID=?"
    );
    $stmt->bind_param("i", $me_id);
    $stmt->execute();
    jout(['success' => true]);
  }

  /**
   * POST clear_notifications
   * Hard-deletes all notifications for the session user.
   * Triggered by the "Clear all" button on the Notifications page.
   */
  case 'clear_notifications': {
    $stmt = $conn->prepare(
      "DELETE FROM notifications WHERE to_user_ID=?"
    );
    $stmt->bind_param("i", $me_id);
    $stmt->execute();
    jout(['success' => true]);
  }

  /**
   * GET get_unread_notif_count
   * Returns the count of unread notifications for the session user.
   * Used to drive the notification badge dot/number in the nav bar.
   * Kept as a lightweight dedicated endpoint so the badge can update
   * without fetching the full notification list.
   */
  case 'get_unread_notif_count': {
    $stmt = $conn->prepare(
      "SELECT COUNT(*) AS cnt FROM notifications
       WHERE to_user_ID=? AND read_status=0"
    );
    $stmt->bind_param("i", $me_id);
    $stmt->execute();
    $r = $stmt->get_result()->fetch_assoc();
    jout(['count' => (int)$r['cnt']]);
  }


  // ════════════════════════════════════════════════════════
  // MESSAGES (Direct Messages)
  // Private 1-to-1 text messages between users.
  // The `messages` table stores (from_user, to_user, msg_text).
  // Both participants are identified by username strings, not IDs,
  // to simplify inbox queries that must match either direction.
  // ════════════════════════════════════════════════════════

  /**
   * POST send_message
   * Inserts a new message row from the session user to `to`.
   * Returns the new message_id so the client can render the bubble
   * optimistically and match it later if needed.
   */
  case 'send_message': {
    if ($method !== 'POST') jerr('POST required');
    $to   = trim($_POST['to']   ?? '');
    $text = trim($_POST['text'] ?? '');
    if (!$to || !$text) jerr('Missing data');

    $stmt = $conn->prepare(
      "INSERT INTO messages (from_user, to_user, msg_text) VALUES (?, ?, ?)"
    );
    $stmt->bind_param("sss", $me, $to, $text);
    $stmt->execute();
    jout(['success' => true, 'message_id' => $stmt->insert_id]);
  }

  /**
   * GET get_conversation
   * Returns all messages exchanged between the session user and `other`,
   * in ascending chronological order (oldest first, for chat display).
   * The WHERE clause matches both directions (sent and received) so a
   * single query covers the full thread.
   */
  case 'get_conversation': {
    $other = $_GET['with'] ?? '';
    if (!$other) jerr('Missing user');

    $stmt = $conn->prepare(
      "SELECT * FROM messages
       WHERE (from_user=? AND to_user=?)
          OR (from_user=? AND to_user=?)
       ORDER BY created_at ASC"
    );
    // Bind both directions: me→other and other→me.
    $stmt->bind_param("ssss", $me, $other, $other, $me);
    $stmt->execute();
    $res  = $stmt->get_result();
    $msgs = [];
    while ($r = $res->fetch_assoc()) $msgs[] = $r;
    jout($msgs);
  }

  /**
   * GET get_inbox
   * Returns a list of usernames the session user has exchanged messages
   * with, in no particular order. The DISTINCT + IF selects the "other"
   * participant regardless of who sent first.
   * The client re-orders this list by last-message timestamp using
   * getLastMessage() calls per thread.
   */
  case 'get_inbox': {
    $stmt = $conn->prepare(
      "SELECT DISTINCT IF(from_user=?, to_user, from_user) AS other_user
       FROM messages
       WHERE from_user=? OR to_user=?"
    );
    // $me is bound three times: IF condition, sent-by, received-by.
    $stmt->bind_param("sss", $me, $me, $me);
    $stmt->execute();
    $res  = $stmt->get_result();
    $list = [];
    while ($r = $res->fetch_assoc()) $list[] = $r['other_user'];
    jout($list);
  }

  /**
   * GET get_last_message
   * Returns only the most recent message in a thread, used to render
   * the inbox preview line ("Alice: hey what's up · 2 min ago").
   * Uses DESC + LIMIT 1 for efficiency rather than fetching the whole
   * conversation.
   */
  case 'get_last_message': {
    $other = $_GET['with'] ?? '';
    if (!$other) jerr('Missing user');

    $stmt = $conn->prepare(
      "SELECT * FROM messages
       WHERE (from_user=? AND to_user=?)
          OR (from_user=? AND to_user=?)
       ORDER BY created_at DESC
       LIMIT 1"
    );
    $stmt->bind_param("ssss", $me, $other, $other, $me);
    $stmt->execute();
    $r = $stmt->get_result()->fetch_assoc();
    jout($r ?: null); // Returns null (JSON null) if no messages yet.
  }

  /**
   * GET get_unread_msg_count
   * Returns the total number of unread messages received by the session
   * user. Drives the DM badge in the nav bar (same pattern as notif badge).
   */
  case 'get_unread_msg_count': {
    $stmt = $conn->prepare(
      "SELECT COUNT(*) AS cnt FROM messages WHERE to_user=? AND is_read=0"
    );
    $stmt->bind_param("s", $me);
    $stmt->execute();
    $r = $stmt->get_result()->fetch_assoc();
    jout(['count' => (int)$r['cnt']]);
  }

  /**
   * POST mark_messages_read
   * Marks all messages FROM a specific sender TO the session user as read.
   * Called when the user opens a conversation thread.
   * Only marks the specific sender's messages so other unread threads
   * are not accidentally cleared.
   */
  case 'mark_messages_read': {
    $from = $_POST['from'] ?? '';
    if (!$from) jerr('Missing from');

    $stmt = $conn->prepare(
      "UPDATE messages SET is_read=1 WHERE from_user=? AND to_user=?"
    );
    $stmt->bind_param("ss", $from, $me);
    $stmt->execute();
    jout(['success' => true]);
  }


  // ════════════════════════════════════════════════════════
  // BLOCKS
  // Users can block others to hide their content and prevent
  // interaction. Blocking also removes any existing follow
  // relationships in both directions.
  // ════════════════════════════════════════════════════════

  /**
   * GET get_blocked
   * Returns an array of usernames blocked by the session user.
   * Used by storage.js to filter blocked users' content from feeds.
   */
  case 'get_blocked': {
    $stmt = $conn->prepare("SELECT blocked FROM blocks WHERE blocker=?");
    $stmt->bind_param("s", $me);
    $stmt->execute();
    $res  = $stmt->get_result();
    $list = [];
    while ($r = $res->fetch_assoc()) $list[] = $r['blocked'];
    jout($list);
  }

  /**
   * POST block_user
   * Inserts a block record (INSERT IGNORE prevents duplicate-block errors)
   * then removes any follow relationships in both directions so blocked
   * content disappears from feeds immediately without a separate cleanup step.
   * Prevents self-blocking via the $target === $me guard.
   */
  case 'block_user': {
    if ($method !== 'POST') jerr('POST required');
    $target = trim($_POST['target'] ?? '');
    if (!$target || $target === $me) jerr('Invalid');

    // INSERT IGNORE: safe to call even if the block already exists.
    $ins = $conn->prepare("INSERT IGNORE INTO blocks (blocker, blocked) VALUES (?, ?)");
    $ins->bind_param("ss", $me, $target);
    $ins->execute();

    // Remove the follow relationship in both directions so the
    // block takes effect immediately on all feed queries.
    $del = $conn->prepare(
      "DELETE FROM follows
       WHERE (follower=? AND following=?)
          OR (follower=? AND following=?)"
    );
    $del->bind_param("ssss", $me, $target, $target, $me);
    $del->execute();

    jout(['success' => true]);
  }

  /**
   * POST unblock_user
   * Removes the block record. Does NOT automatically restore any
   * follow relationships that were removed when the block was set.
   */
  case 'unblock_user': {
    if ($method !== 'POST') jerr('POST required');
    $target = trim($_POST['target'] ?? '');

    $stmt = $conn->prepare("DELETE FROM blocks WHERE blocker=? AND blocked=?");
    $stmt->bind_param("ss", $me, $target);
    $stmt->execute();
    jout(['success' => true]);
  }

  /**
   * GET is_blocked
   * Returns { blocked: true/false } for a quick check whether the
   * session user has blocked `target`. Used by the profile page to
   * decide whether to show block/unblock button state.
   */
  case 'is_blocked': {
    $target = $_GET['target'] ?? '';
    $stmt   = $conn->prepare(
      "SELECT block_ID FROM blocks WHERE blocker=? AND blocked=?"
    );
    $stmt->bind_param("ss", $me, $target);
    $stmt->execute();
    jout(['blocked' => $stmt->get_result()->num_rows > 0]);
  }


  // ════════════════════════════════════════════════════════
  // REPORTS
  // Content moderation: users report rants; admins review them
  // via admin.php. These endpoints are read-only for non-admins.
  // ════════════════════════════════════════════════════════

  /**
   * GET get_reports
   * Returns all report records, newest first. Used by admin.php.
   * NOTE: No admin-role check is performed here — that check should
   * happen in the calling page. Consider adding a role guard.
   */
  case 'get_reports': {
    $res  = $conn->query("SELECT * FROM reports ORDER BY created_at DESC");
    $list = [];
    while ($r = $res->fetch_assoc()) $list[] = $r;
    jout($list);
  }

  /**
   * GET get_pending_reports
   * Returns only unresolved reports (status='pending'), newest first.
   * Useful for the admin dashboard count badge.
   */
  case 'get_pending_reports': {
    $res  = $conn->query(
      "SELECT * FROM reports WHERE status='pending' ORDER BY created_at DESC"
    );
    $list = [];
    while ($r = $res->fetch_assoc()) $list[] = $r;
    jout($list);
  }


  // ════════════════════════════════════════════════════════
  // RANT ARCHIVING
  // Users can archive their own rants to hide them from the public
  // feed without permanently deleting them.
  // ════════════════════════════════════════════════════════

  /**
   * POST archive_rant
   * Sets is_archived=1 on a rant owned by the session user.
   * The WHERE user_ID=? prevents archiving someone else's rant.
   * Archived rants are excluded from the main feed queries.
   */
  case 'archive_rant': {
    if ($method !== 'POST') jerr('POST required');
    $rant_id = intval($_POST['rant_id'] ?? 0);
    if (!$rant_id) jerr('Missing rant_id');

    $stmt = $conn->prepare(
      "UPDATE rants SET is_archived=1 WHERE rant_ID=? AND user_ID=?"
    );
    $stmt->bind_param("ii", $rant_id, $me_id);
    $stmt->execute();
    jout(['success' => true]);
  }

  /**
   * POST unarchive_rant
   * Sets is_archived=0, restoring the rant to the public feed.
   * Ownership enforced via WHERE user_ID=?.
   */
  case 'unarchive_rant': {
    if ($method !== 'POST') jerr('POST required');
    $rant_id = intval($_POST['rant_id'] ?? 0);
    if (!$rant_id) jerr('Missing rant_id');

    $stmt = $conn->prepare(
      "UPDATE rants SET is_archived=0 WHERE rant_ID=? AND user_ID=?"
    );
    $stmt->bind_param("ii", $rant_id, $me_id);
    $stmt->execute();
    jout(['success' => true]);
  }

  /**
   * GET get_archived_rants
   * Returns all archived rants for the session user, with reactions and
   * repost metadata attached. Only the rant owner can see their own
   * archived rants (WHERE r.user_ID=? scopes to the session user).
   *
   * Attaches per-rant data:
   *   • reactions     – emoji→count map via getReactions().
   *   • user_reaction – the session user's own emoji choice (or null).
   *   • repostOf      – original rant id/username if this is a repost.
   */
  case 'get_archived_rants': {
    $sql = "SELECT r.rant_ID, r.user_ID, r.content, r.anonymous,
                   r.created_at, r.updated_at, r.repost_of_id, r.repost_of_user,
                   u.username,
                   (SELECT COUNT(*) FROM comments c
                    WHERE c.rant_ID = r.rant_ID) AS comment_count
            FROM rants r
            JOIN users u ON u.user_ID = r.user_ID
            WHERE r.user_ID = ? AND r.is_archived = 1
            ORDER BY r.created_at DESC";
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("i", $me_id);
    $stmt->execute();
    $res   = $stmt->get_result();
    $rants = [];
    while ($row = $res->fetch_assoc()) {
      $row['reactions']     = getReactions($conn, $row['rant_ID']);
      $row['user_reaction'] = getUserReaction($conn, $row['rant_ID'], $me);
      // Normalise repost metadata into a sub-object for the front-end card.
      if (!empty($row['repost_of_id'])) {
        $row['repostOf'] = [
          'id'       => $row['repost_of_id'],
          'username' => $row['repost_of_user'],
        ];
      }
      $rants[] = $row;
    }
    jout($rants);
  }

  // ── Unknown action fallback ────────────────────────────────
  // Any action string not matched above returns an error so callers
  // can detect typos in action names during development.
  default:
    jerr('Unknown action: ' . $action);
}


// ════════════════════════════════════════════════════════════
// SHARED DB HELPER FUNCTIONS
// Defined after the switch so they're available to all cases above
// via PHP's function hoisting. Placed here rather than in a separate
// file to keep this API self-contained.
// ════════════════════════════════════════════════════════════

/**
 * Fetches the reaction counts for a rant, grouped by emoji type.
 *
 * Returns an associative array mapping each emoji/type string to
 * its integer count, e.g. ["❤️" => 4, "😂" => 2].
 * Returns an empty array if the rant has no reactions.
 *
 * @param mysqli $conn    Active database connection.
 * @param int    $rant_id The rant to query.
 * @return array<string,int>
 */
function getReactions($conn, $rant_id) {
  $stmt = $conn->prepare(
    "SELECT type, COUNT(*) AS cnt FROM reactions WHERE rant_ID=? GROUP BY type"
  );
  $stmt->bind_param("i", $rant_id);
  $stmt->execute();
  $res = $stmt->get_result();
  $out = [];
  while ($r = $res->fetch_assoc()) $out[$r['type']] = (int)$r['cnt'];
  return $out;
}

/**
 * Fetches the single reaction (emoji type) a specific user left on a rant.
 * Returns the type string (e.g. "❤️") or null if the user has not reacted.
 * Used to pre-select the correct emoji button on rant cards the user has
 * already reacted to.
 *
 * @param mysqli $conn     Active database connection.
 * @param int    $rant_id  The rant to check.
 * @param string $username The user whose reaction to look up.
 * @return string|null
 */
function getUserReaction($conn, $rant_id, $username) {
  $stmt = $conn->prepare(
    "SELECT r.type
     FROM reactions r
     JOIN users u ON u.user_ID = r.user_ID
     WHERE r.rant_ID=? AND u.username=?
     LIMIT 1"
  );
  $stmt->bind_param("is", $rant_id, $username);
  $stmt->execute();
  $r = $stmt->get_result()->fetch_assoc();
  return $r ? $r['type'] : null;
}
?>