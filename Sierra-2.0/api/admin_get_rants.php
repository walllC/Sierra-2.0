<?php
session_start();
require_once '../database.php';
header('Content-Type: application/json');

// Admin only
$stmt = $conn->prepare("SELECT role FROM users WHERE user_ID = ?");
$stmt->bind_param("i", $_SESSION['user_ID']);
$stmt->execute();
$user = $stmt->get_result()->fetch_assoc();
if (!$user || $user['role'] !== 'admin') {
    echo json_encode(['error' => 'Unauthorized']);
    exit;
}

$result = $conn->query("
    SELECT r.rant_ID as id, r.content, r.created_at, u.username
    FROM rants r
    JOIN users u ON r.user_ID = u.user_ID
    WHERE r.is_archived = 0
    ORDER BY r.created_at DESC
");

echo json_encode($result->fetch_all(MYSQLI_ASSOC));
?>