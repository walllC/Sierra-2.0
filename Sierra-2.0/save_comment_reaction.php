<?php
error_reporting(0);
ini_set('display_errors', 0);
session_start();
require_once 'database.php';
header('Content-Type: application/json');

$user_id    = $_SESSION['user_ID'] ?? 0;
$comment_id = (int)($_POST['comment_id'] ?? 0);
$type       = trim($_POST['reaction_type'] ?? '');

if (!$user_id || !$comment_id || !$type) {
    echo json_encode(['success' => false, 'message' => 'Missing data']);
    exit;
}

try {
    $check = $conn->query("SELECT id FROM comment_reactions WHERE comment_ID = $comment_id AND user_ID = $user_id AND type = '$type'");
    $existing = $check->fetch_assoc();

    $removed = false;

    if ($existing) {
        $conn->query("DELETE FROM comment_reactions WHERE comment_ID = $comment_id AND user_ID = $user_id");
        $removed = true;
    } else {
        $conn->query("DELETE FROM comment_reactions WHERE comment_ID = $comment_id AND user_ID = $user_id");
        $conn->query("INSERT INTO comment_reactions (comment_ID, user_ID, type) VALUES ($comment_id, $user_id, '$type')");
    }

    $counts = $conn->query("SELECT type, COUNT(*) as c FROM comment_reactions WHERE comment_ID = $comment_id GROUP BY type");
    $reactions = [];
    while ($row = $counts->fetch_assoc()) {
        $reactions[$row['type']] = (int)$row['c'];
    }

    $myreact = $conn->query("SELECT type FROM comment_reactions WHERE comment_ID = $comment_id AND user_ID = $user_id LIMIT 1");
    $myrow = $myreact->fetch_assoc();

    echo json_encode([
        'success'       => true,
        'removed'       => $removed,
        'user_reaction' => $myrow ? $myrow['type'] : null,
        'reactions'     => $reactions
    ], JSON_UNESCAPED_UNICODE);

} catch (Exception $e) {
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
?>