<?php
session_start();
require_once '../database.php';
header('Content-Type: application/json');

if (!isset($_SESSION['user_ID']) || $_SESSION['role'] !== 'admin') {
    echo json_encode(['error' => 'Unauthorized']); exit;
}

$result = $conn->query("
    SELECT c.comment_ID AS id,
           c.comment_text AS content,
           c.created_at,
           c.parent_id,
           u.username,
           r.content AS rant_content,
           c.rant_ID
    FROM comments c
    JOIN users u ON c.user_ID = u.user_ID
    JOIN rants r ON c.rant_ID = r.rant_ID
    ORDER BY c.created_at DESC
");

$comments = [];
while ($row = $result->fetch_assoc()) {
    $comments[] = $row;
}

echo json_encode($comments, JSON_UNESCAPED_UNICODE);
?>