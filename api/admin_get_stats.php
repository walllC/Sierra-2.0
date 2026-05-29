<?php
session_start();
include '../database.php';
header('Content-Type: application/json');

$recentRants = $conn->query("
    SELECT r.rant_ID as id, r.content, r.created_at, u.username 
    FROM rants r 
    JOIN users u ON r.user_ID = u.user_ID
    WHERE r.is_archived = 0
    ORDER BY r.created_at DESC 
    LIMIT 5
")->fetch_all(MYSQLI_ASSOC);

$stats = [
    'userCount'    => $conn->query("SELECT COUNT(*) FROM users")->fetch_row()[0],
    'rantCount'    => $conn->query("SELECT COUNT(*) FROM rants WHERE is_archived = 0")->fetch_row()[0],
    'rantsToday'   => $conn->query("SELECT COUNT(*) FROM rants WHERE DATE(created_at) = CURDATE() AND is_archived = 0")->fetch_row()[0],
    'bannedCount'  => $conn->query("SELECT COUNT(*) FROM users WHERE status = 'banned'")->fetch_row()[0],
    'commentCount' => $conn->query("SELECT COUNT(*) FROM comments")->fetch_row()[0],
    'reportCount'  => $conn->query("SELECT COUNT(*) FROM reports")->fetch_row()[0],
    'recentRants'  => $recentRants
];

echo json_encode($stats);
?>