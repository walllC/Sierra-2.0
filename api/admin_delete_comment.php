<?php
session_start();
require_once '../database.php';
header('Content-Type: application/json');

if (!isset($_SESSION['user_ID']) || $_SESSION['role'] !== 'admin') {
    echo json_encode(['success' => false, 'message' => 'Unauthorized']); exit;
}

$comment_id = (int)($_POST['id'] ?? 0);
if (!$comment_id) {
    echo json_encode(['success' => false, 'message' => 'Missing comment ID']); exit;
}

// Delete reactions on replies
$replies = $conn->query("SELECT comment_ID FROM comments WHERE parent_id = $comment_id");
if ($replies) {
    while ($row = $replies->fetch_assoc()) {
        $rid = (int)$row['comment_ID'];
        $conn->query("DELETE FROM comment_reactions WHERE comment_ID = $rid");
        $conn->query("DELETE FROM comments WHERE comment_ID = $rid");
    }
}

// Delete reactions on this comment
$conn->query("DELETE FROM comment_reactions WHERE comment_ID = $comment_id");

// Delete the comment
$conn->query("DELETE FROM comments WHERE comment_ID = $comment_id");

echo json_encode(['success' => $conn->affected_rows >= 0]);
?>