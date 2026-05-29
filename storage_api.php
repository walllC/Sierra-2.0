<?php
session_start();
require_once 'database.php';
header('Content-Type: application/json');

// Must be logged in for all actions
if (!isset($_SESSION['user_ID'])) {
    echo json_encode(['error' => 'Unauthorized']); exit();
}

$me       = $_SESSION['username'];
$me_id    = $_SESSION['user_ID'];
$action   = $_REQUEST['action'] ?? '';
$method   = $_SERVER['REQUEST_METHOD'];

// ── helpers ────────────────────────────────────────────────
function jout($data) { echo json_encode($data); exit(); }
function jerr($msg)  { echo json_encode(['error' => $msg]); exit(); }

// ── router ─────────────────────────────────────────────────
switch ($action) {

  // ══════════════════════════════════════════════
  // USERS
  // ══════════════════════════════════════════════

  case 'get_user': {
    $username = $_GET['username'] ?? $me;
    $stmt = $conn->prepare("SELECT user_ID,username,role,status,avatar,bio,theme,cover,created_at FROM users WHERE username=?");
    $stmt->bind_param("s", $username);
    $stmt->execute();
    $row = $stmt->get_result()->fetch_assoc();
    if (!$row) jerr('User not found');
    jout($row);
}

  case 'get_users': {
    $res = $conn->query("SELECT user_ID,username,role,status,avatar,bio,created_at FROM users WHERE status='active' AND role!='admin'");
    $users = [];
    while ($r = $res->fetch_assoc()) $users[] = $r;
    jout($users);
  }

  case 'update_user': {
    if ($method !== 'POST') jerr('POST required');
    $fields = [];
    $types  = '';
    $vals   = [];

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
      $t = $_POST['theme'] === 'light' ? 'light' : 'dark';
      $fields[] = 'theme=?'; $types .= 's'; $vals[] = $t;
    }
    if (isset($_POST['password'])) {
      $fields[] = 'password=?'; $types .= 's'; $vals[] = $_POST['password'];
    }
    if (!$fields) jerr('Nothing to update');

    $types .= 's'; $vals[] = $me;
    $sql = "UPDATE users SET " . implode(',', $fields) . " WHERE username=?";
    $stmt = $conn->prepare($sql);
    $stmt->bind_param($types, ...$vals);
    $stmt->execute();
    jout(['success' => true]);
  }

  case 'get_theme': {
    $stmt = $conn->prepare("SELECT theme FROM users WHERE username=?");
    $stmt->bind_param("s", $me);
    $stmt->execute();
    $r = $stmt->get_result()->fetch_assoc();
    jout(['theme' => $r['theme'] ?? 'dark']);
  }

  // ══════════════════════════════════════════════
  // RANTS
  // ══════════════════════════════════════════════

    case 'get_rants': {
    $sql = "SELECT r.rant_ID,r.user_ID,r.content,r.anonymous,r.is_anonymous,r.created_at,r.updated_at,
                   r.repost_of_id,r.repost_of_user,u.username,
                   (SELECT COUNT(*) FROM comments c WHERE c.rant_ID=r.rant_ID) AS comment_count
            FROM rants r
            JOIN users u ON u.user_ID=r.user_ID
            WHERE u.status='active' AND r.is_archived=0
            ORDER BY r.created_at DESC LIMIT 500";
    $res = $conn->query($sql);
    $rants = [];
    while ($row = $res->fetch_assoc()) {
      $row['likes']        = getLikes($conn, $row['rant_ID']);
      $row['reactions']    = getReactions($conn, $row['rant_ID']);
      $row['user_reaction']= getUserReaction($conn, $row['rant_ID'], $me);
      if ($row['repost_of_id']) {
        $row['repostOf'] = ['id' => $row['repost_of_id'], 'username' => $row['repost_of_user']];
      }
      $rants[] = $row;
    }
    jout($rants);
  }

  case 'get_rants_by_user': {
    $username = $_GET['username'] ?? $me;
    $sql = "SELECT r.rant_ID,r.user_ID,r.content,r.anonymous,r.is_anonymous,r.created_at,r.updated_at,
                   r.repost_of_id,r.repost_of_user,u.username,
                   (SELECT COUNT(*) FROM comments c WHERE c.rant_ID=r.rant_ID) AS comment_count
            FROM rants r
            JOIN users u ON u.user_ID=r.user_ID
            WHERE u.username=?
            ORDER BY r.created_at DESC";
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("s", $username);
    $stmt->execute();
    $res = $stmt->get_result();
    $rants = [];
    while ($row = $res->fetch_assoc()) {
      $row['likes']        = getLikes($conn, $row['rant_ID']);
      $row['reactions']    = getReactions($conn, $row['rant_ID']);
      $row['user_reaction']= getUserReaction($conn, $row['rant_ID'], $me);
      $rants[] = $row;
    }
    jout($rants);
  }

  case 'get_trending': {
    $cutoff = date('Y-m-d H:i:s', strtotime('-24 hours'));
    $sql = "SELECT r.rant_ID,r.user_ID,r.content,r.anonymous,r.is_anonymous,r.created_at,u.username,
                   (SELECT COUNT(*) FROM reactions rx WHERE rx.rant_ID=r.rant_ID) AS react_count
            FROM rants r
            JOIN users u ON u.user_ID=r.user_ID
            WHERE r.created_at >= ? AND u.status='active'
            ORDER BY react_count DESC LIMIT 3";
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("s", $cutoff);
    $stmt->execute();
    $res = $stmt->get_result();
    $rants = [];
    while ($row = $res->fetch_assoc()) {
      $row['likes']     = getLikes($conn, $row['rant_ID']);
      $row['reactions'] = getReactions($conn, $row['rant_ID']);
      $rants[] = $row;
    }
    jout($rants);
  }

  case 'update_rant': {
    if ($method !== 'POST') jerr('POST required');
    $rant_id = intval($_POST['rant_id'] ?? 0);
    $content = trim($_POST['content'] ?? '');
    if (!$rant_id || !$content) jerr('Missing data');
    $stmt = $conn->prepare("UPDATE rants SET content=?, updated_at=NOW() WHERE rant_ID=? AND user_ID=?");
    $stmt->bind_param("sii", $content, $rant_id, $me_id);
    $stmt->execute();
    jout(['success' => true]);
  }

  case 'repost': {
    if ($method !== 'POST') jerr('POST required');
    $rant_id = intval($_POST['rant_id'] ?? 0);
    if (!$rant_id) jerr('Missing rant_id');
    
    // Prevent duplicate repost
    $check = $conn->prepare("SELECT rant_ID FROM rants WHERE user_ID=? AND repost_of_id=?");
    $check->bind_param("ii", $me_id, $rant_id);
    $check->execute();
    if ($check->get_result()->num_rows > 0) jerr('Already reposted');
    
    $orig = $conn->prepare("SELECT r.content, u.username, r.anonymous, r.is_archived FROM rants r JOIN users u ON u.user_ID=r.user_ID WHERE r.rant_ID=?");
    $orig->bind_param("i", $rant_id);
    $orig->execute();
    $o = $orig->get_result()->fetch_assoc();
    if (!$o) jerr('Rant not found');

    // ✅ Use empty content if original is deleted
    $content = ($o['is_archived'] == 1) ? '' : $o['content'];

    $stmt = $conn->prepare("INSERT INTO rants (user_ID,content,anonymous,repost_of_id,repost_of_user,created_at) VALUES (?,?,0,?,?,NOW())");
    $stmt->bind_param("isis", $me_id, $content, $rant_id, $o['username']);
    $stmt->execute();
    jout(['success' => true, 'new_id' => $stmt->insert_id]);
}

  // ══════════════════════════════════════════════
  // FOLLOWS
  // ══════════════════════════════════════════════

  case 'get_followers': {
    $username = $_GET['username'] ?? $me;
    $stmt = $conn->prepare("SELECT follower FROM follows WHERE following=?");
    $stmt->bind_param("s", $username);
    $stmt->execute();
    $res = $stmt->get_result();
    $list = [];
    while ($r = $res->fetch_assoc()) $list[] = $r['follower'];
    jout($list);
  }

  case 'get_following': {
    $username = $_GET['username'] ?? $me;
    $stmt = $conn->prepare("SELECT following FROM follows WHERE follower=?");
    $stmt->bind_param("s", $username);
    $stmt->execute();
    $res = $stmt->get_result();
    $list = [];
    while ($r = $res->fetch_assoc()) $list[] = $r['following'];
    jout($list);
  }

  case 'toggle_follow': {
    if ($method !== 'POST') jerr('POST required');
    $target = trim($_POST['target'] ?? '');
    if (!$target || $target === $me) jerr('Invalid target');
    $check = $conn->prepare("SELECT follow_ID FROM follows WHERE follower=? AND following=?");
    $check->bind_param("ss", $me, $target);
    $check->execute();
    if ($check->get_result()->num_rows > 0) {
      $del = $conn->prepare("DELETE FROM follows WHERE follower=? AND following=?");
      $del->bind_param("ss", $me, $target);
      $del->execute();
      jout(['following' => false]);
    } else {
      $ins = $conn->prepare("INSERT INTO follows (follower,following) VALUES (?,?)");
      $ins->bind_param("ss", $me, $target);
      $ins->execute();
      jout(['following' => true]);
    }
  }

  case 'is_following': {
    $target = $_GET['target'] ?? '';
    $check = $conn->prepare("SELECT follow_ID FROM follows WHERE follower=? AND following=?");
    $check->bind_param("ss", $me, $target);
    $check->execute();
    jout(['following' => $check->get_result()->num_rows > 0]);
  }

  case 'get_suggested': {
    // Users not followed by me, not blocked, sorted by mutual followers
    $sql = "SELECT u.username, u.avatar, u.bio,
                   (SELECT COUNT(*) FROM follows f2
                    JOIN follows f3 ON f3.following=f2.follower
                    WHERE f2.following=u.username AND f3.follower=?) AS mutuals
            FROM users u
            WHERE u.username != ?
              AND u.role != 'admin'
              AND u.status = 'active'
              AND u.username NOT IN (SELECT following FROM follows WHERE follower=?)
              AND u.username NOT IN (SELECT blocked FROM blocks WHERE blocker=?)
            ORDER BY mutuals DESC LIMIT 5";
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("ssss", $me, $me, $me, $me);
    $stmt->execute();
    $res = $stmt->get_result();
    $list = [];
    while ($r = $res->fetch_assoc()) $list[] = $r;
    jout($list);
  }

  case 'get_following_feed': {
    $sql = "SELECT r.rant_ID,r.user_ID,r.content,r.anonymous,r.created_at,u.username,
                   (SELECT COUNT(*) FROM comments c WHERE c.rant_ID=r.rant_ID) AS comment_count
            FROM rants r
            JOIN users u ON u.user_ID=r.user_ID
            JOIN follows f ON f.following=u.username AND f.follower=?
            ORDER BY r.created_at DESC LIMIT 50";
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("s", $me);
    $stmt->execute();
    $res = $stmt->get_result();
    $rants = [];
    while ($row = $res->fetch_assoc()) {
      $row['likes']     = getLikes($conn, $row['rant_ID']);
      $row['reactions'] = getReactions($conn, $row['rant_ID']);
      $row['user_reaction'] = getUserReaction($conn, $row['rant_ID'], $me);
      $rants[] = $row;
    }
    jout($rants);
  }

  // ══════════════════════════════════════════════
  // NOTIFICATIONS
  // ══════════════════════════════════════════════

  case 'get_notifications': {
    // Join users table to get from_username for display
    $stmt = $conn->prepare(
      "SELECT n.notif_ID, n.from_user_ID, n.to_user_ID, n.type, n.message,
              n.rant_ID, n.comment_ID, n.created_at, n.read_status,
              u.username AS from_user
       FROM notifications n
       LEFT JOIN users u ON u.user_ID = n.from_user_ID
       WHERE n.to_user_ID = ?
       ORDER BY n.created_at DESC LIMIT 50"
    );
    $stmt->bind_param("i", $me_id);
    $stmt->execute();
    $res = $stmt->get_result();
    $list = [];
    while ($r = $res->fetch_assoc()) $list[] = $r;

    // Group by type+rant within 1 hour (same logic as before)
    $groups = [];
    foreach ($list as $n) {
      $found = false;
      foreach ($groups as &$g) {
        if ($g['type'] === $n['type'] && $g['rant_ID'] == $n['rant_ID'] &&
            (time() - strtotime($g['created_at'])) < 3600) {
          if (!in_array($n['from_user'], $g['froms'])) $g['froms'][] = $n['from_user'];
          if (!$n['read_status']) $g['read'] = false;
          $found = true; break;
        }
      }
      if (!$found) {
        $n['froms'] = [$n['from_user']];
        $n['read']  = (bool)$n['read_status'];
        $groups[]   = $n;
      }
    }
    jout($groups);
  }

  case 'add_notification': {
    if ($method !== 'POST') jerr('POST required');
    $to      = trim($_POST['to'] ?? '');       // target username
    $type    = trim($_POST['type'] ?? '');
    $message = trim($_POST['message'] ?? '');
    $rant_id = intval($_POST['rant_id'] ?? 0) ?: null;
    if (!$to || !$type || $to === $me) jout(['success' => true]); // silent skip self-notif

    // Resolve target username → user_ID
    $res = $conn->prepare("SELECT user_ID FROM users WHERE username=?");
    $res->bind_param("s", $to);
    $res->execute();
    $row = $res->get_result()->fetch_assoc();
    if (!$row) jout(['success' => true]); // user not found, skip silently

    $to_id = $row['user_ID'];
    $stmt  = $conn->prepare(
      "INSERT INTO notifications (from_user_ID, to_user_ID, type, message, rant_ID) VALUES (?,?,?,?,?)"
    );
    $stmt->bind_param("iissi", $me_id, $to_id, $type, $message, $rant_id);
    $stmt->execute();
    jout(['success' => true]);
  }

  case 'mark_notifications_read': {
    $stmt = $conn->prepare("UPDATE notifications SET read_status=1 WHERE to_user_ID=?");
    $stmt->bind_param("i", $me_id);
    $stmt->execute();
    jout(['success' => true]);
  }

  case 'clear_notifications': {
    $stmt = $conn->prepare("DELETE FROM notifications WHERE to_user_ID=?");
    $stmt->bind_param("i", $me_id);
    $stmt->execute();
    jout(['success' => true]);
  }

  case 'get_unread_notif_count': {
    $stmt = $conn->prepare("SELECT COUNT(*) AS cnt FROM notifications WHERE to_user_ID=? AND read_status=0");
    $stmt->bind_param("i", $me_id);
    $stmt->execute();
    $r = $stmt->get_result()->fetch_assoc();
    jout(['count' => (int)$r['cnt']]);
  }

  // ══════════════════════════════════════════════
  // MESSAGES
  // ══════════════════════════════════════════════

  case 'send_message': {
    if ($method !== 'POST') jerr('POST required');
    $to   = trim($_POST['to'] ?? '');
    $text = trim($_POST['text'] ?? '');
    if (!$to || !$text) jerr('Missing data');
    $stmt = $conn->prepare("INSERT INTO messages (from_user,to_user,msg_text) VALUES (?,?,?)");
    $stmt->bind_param("sss", $me, $to, $text);
    $stmt->execute();
    jout(['success' => true, 'message_id' => $stmt->insert_id]);
  }

  case 'get_conversation': {
    $other = $_GET['with'] ?? '';
    if (!$other) jerr('Missing user');
    $stmt = $conn->prepare(
      "SELECT * FROM messages WHERE (from_user=? AND to_user=?) OR (from_user=? AND to_user=?) ORDER BY created_at ASC"
    );
    $stmt->bind_param("ssss", $me, $other, $other, $me);
    $stmt->execute();
    $res = $stmt->get_result();
    $msgs = [];
    while ($r = $res->fetch_assoc()) $msgs[] = $r;
    jout($msgs);
  }

  case 'get_inbox': {
    $stmt = $conn->prepare(
      "SELECT DISTINCT IF(from_user=?,to_user,from_user) AS other_user FROM messages WHERE from_user=? OR to_user=?"
    );
    $stmt->bind_param("sss", $me, $me, $me);
    $stmt->execute();
    $res = $stmt->get_result();
    $list = [];
    while ($r = $res->fetch_assoc()) $list[] = $r['other_user'];
    jout($list);
  }

  case 'get_last_message': {
    $other = $_GET['with'] ?? '';
    if (!$other) jerr('Missing user');
    $stmt = $conn->prepare(
      "SELECT * FROM messages WHERE (from_user=? AND to_user=?) OR (from_user=? AND to_user=?) ORDER BY created_at DESC LIMIT 1"
    );
    $stmt->bind_param("ssss", $me, $other, $other, $me);
    $stmt->execute();
    $r = $stmt->get_result()->fetch_assoc();
    jout($r ?: null);
  }

  case 'get_unread_msg_count': {
    $stmt = $conn->prepare("SELECT COUNT(*) AS cnt FROM messages WHERE to_user=? AND is_read=0");
    $stmt->bind_param("s", $me);
    $stmt->execute();
    $r = $stmt->get_result()->fetch_assoc();
    jout(['count' => (int)$r['cnt']]);
  }

  case 'mark_messages_read': {
    $from = $_POST['from'] ?? '';
    if (!$from) jerr('Missing from');
    $stmt = $conn->prepare("UPDATE messages SET is_read=1 WHERE from_user=? AND to_user=?");
    $stmt->bind_param("ss", $from, $me);
    $stmt->execute();
    jout(['success' => true]);
  }

  // ══════════════════════════════════════════════
  // BLOCKS
  // ══════════════════════════════════════════════

  case 'get_blocked': {
    $stmt = $conn->prepare("SELECT blocked FROM blocks WHERE blocker=?");
    $stmt->bind_param("s", $me);
    $stmt->execute();
    $res = $stmt->get_result();
    $list = [];
    while ($r = $res->fetch_assoc()) $list[] = $r['blocked'];
    jout($list);
  }

  case 'block_user': {
    if ($method !== 'POST') jerr('POST required');
    $target = trim($_POST['target'] ?? '');
    if (!$target || $target === $me) jerr('Invalid');
    $ins = $conn->prepare("INSERT IGNORE INTO blocks (blocker,blocked) VALUES (?,?)");
    $ins->bind_param("ss", $me, $target);
    $ins->execute();
    // unfollow both ways
    $del = $conn->prepare("DELETE FROM follows WHERE (follower=? AND following=?) OR (follower=? AND following=?)");
    $del->bind_param("ssss", $me, $target, $target, $me);
    $del->execute();
    jout(['success' => true]);
  }

  case 'unblock_user': {
    if ($method !== 'POST') jerr('POST required');
    $target = trim($_POST['target'] ?? '');
    $stmt = $conn->prepare("DELETE FROM blocks WHERE blocker=? AND blocked=?");
    $stmt->bind_param("ss", $me, $target);
    $stmt->execute();
    jout(['success' => true]);
  }

  case 'is_blocked': {
    $target = $_GET['target'] ?? '';
    $stmt = $conn->prepare("SELECT block_ID FROM blocks WHERE blocker=? AND blocked=?");
    $stmt->bind_param("ss", $me, $target);
    $stmt->execute();
    jout(['blocked' => $stmt->get_result()->num_rows > 0]);
  }

  // ══════════════════════════════════════════════
  // REPORTS
  // ══════════════════════════════════════════════

  case 'get_reports': {
    $res = $conn->query("SELECT * FROM reports ORDER BY created_at DESC");
    $list = [];
    while ($r = $res->fetch_assoc()) $list[] = $r;
    jout($list);
  }

  case 'get_pending_reports': {
    $res = $conn->query("SELECT * FROM reports WHERE status='pending' ORDER BY created_at DESC");
    $list = [];
    while ($r = $res->fetch_assoc()) $list[] = $r;
    jout($list);
  }

  case 'archive_rant': {
    if ($method !== 'POST') jerr('POST required');
    $rant_id = intval($_POST['rant_id'] ?? 0);
    if (!$rant_id) jerr('Missing rant_id');
    $stmt = $conn->prepare("UPDATE rants SET is_archived=1 WHERE rant_ID=? AND user_ID=?");
    $stmt->bind_param("ii", $rant_id, $me_id);
    $stmt->execute();
    jout(['success' => true]);
}

case 'unarchive_rant': {
    if ($method !== 'POST') jerr('POST required');
    $rant_id = intval($_POST['rant_id'] ?? 0);
    if (!$rant_id) jerr('Missing rant_id');
    $stmt = $conn->prepare("UPDATE rants SET is_archived=0 WHERE rant_ID=? AND user_ID=?");
    $stmt->bind_param("ii", $rant_id, $me_id);
    $stmt->execute();
    jout(['success' => true]);
}

case 'get_archived_rants': {
    $sql = "SELECT r.rant_ID, r.user_ID, r.content, r.anonymous, r.created_at, r.updated_at,
                   r.repost_of_id, r.repost_of_user, u.username,
                   (SELECT COUNT(*) FROM comments c WHERE c.rant_ID=r.rant_ID) AS comment_count
            FROM rants r
            JOIN users u ON u.user_ID=r.user_ID
            WHERE r.user_ID=? AND r.is_archived=1
            ORDER BY r.created_at DESC";
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("i", $me_id);
    $stmt->execute();
    $res = $stmt->get_result();
    $rants = [];
    while ($row = $res->fetch_assoc()) {
        $row['reactions']     = getReactions($conn, $row['rant_ID']);
        $row['user_reaction'] = getUserReaction($conn, $row['rant_ID'], $me);
        if (!empty($row['repost_of_id'])) {
            $row['repostOf'] = ['id' => $row['repost_of_id'], 'username' => $row['repost_of_user']];
        }
        $rants[] = $row;
    }
    jout($rants);
}

  default:
    jerr('Unknown action: ' . $action);
}

// ── shared helpers ─────────────────────────────────────────
function getLikes($conn, $rant_id) {
  $stmt = $conn->prepare("SELECT user_ID FROM reactions WHERE rant_ID=?");
  $stmt->bind_param("i", $rant_id);
  $stmt->execute();
  $res = $stmt->get_result();
  $list = [];
  while ($r = $res->fetch_assoc()) $list[] = $r['user_ID'];
  return $list;
}

function getReactions($conn, $rant_id) {
  $stmt = $conn->prepare("SELECT type, COUNT(*) AS cnt FROM reactions WHERE rant_ID=? GROUP BY type");
  $stmt->bind_param("i", $rant_id);
  $stmt->execute();
  $res = $stmt->get_result();
  $out = [];
  while ($r = $res->fetch_assoc()) $out[$r['type']] = (int)$r['cnt'];
  return $out;
}

function getUserReaction($conn, $rant_id, $username) {
  // Look up user_ID from username first
  $stmt = $conn->prepare("SELECT r.type FROM reactions r JOIN users u ON u.user_ID=r.user_ID WHERE r.rant_ID=? AND u.username=? LIMIT 1");
  $stmt->bind_param("is", $rant_id, $username);
  $stmt->execute();
  $r = $stmt->get_result()->fetch_assoc();
  return $r ? $r['type'] : null;
}
?>