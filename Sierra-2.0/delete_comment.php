<?php
error_reporting(0);
ini_set('display_errors', 0);
session_start();
require_once 'database.php';
header('Content-Type: application/json');

$user_id    = $_SESSION['user_ID'] ?? 0;
$comment_id = (int)($_POST['comment_id'] ?? 0);

if (!$user_id || !$comment_id) {
    echo json_encode(['success' => false, 'message' => 'Missing data']);
    exit;
}

// Verify the comment exists and belongs to this user
$check   = $conn->query("SELECT user_ID FROM comments WHERE comment_ID = $comment_id LIMIT 1");
$comment = $check ? $check->fetch_assoc() : null;

if (!$comment) {
    echo json_encode(['success' => false, 'message' => 'Comment not found']);
    exit;
}

if ((int)$comment['user_ID'] !== (int)$user_id) {
    echo json_encode(['success' => false, 'message' => 'Not authorized']);
    exit;
}

// Delete reactions on this comment first (FK safety)
$conn->query("DELETE FROM comment_reactions WHERE comment_ID = $comment_id");

// Delete any replies that have this comment as parent (and their reactions)
$replies = $conn->query("SELECT comment_ID FROM comments WHERE parent_id = $comment_id");
if ($replies) {
    while ($row = $replies->fetch_assoc()) {
        $rid = (int)$row['comment_ID'];
        $conn->query("DELETE FROM comment_reactions WHERE comment_ID = $rid");
        $conn->query("DELETE FROM comments WHERE comment_ID = $rid");
    }
}

// Delete the comment itself
$conn->query("DELETE FROM comments WHERE comment_ID = $comment_id");

if ($conn->affected_rows >= 0) {
    echo json_encode(['success' => true]);
} else {
    echo json_encode(['success' => false, 'message' => 'Delete failed']);
}
?>
