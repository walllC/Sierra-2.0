<?php
session_start();
require_once __DIR__ . '/../database.php';
header('Content-Type: application/json');

$result = $conn->query("
    SELECT user_ID as id, username, role, status, created_at, last_active_at,
           TIMESTAMPDIFF(SECOND, last_active_at, NOW()) as offline_seconds
    FROM users 
    ORDER BY created_at DESC
");

echo json_encode($result->fetch_all(MYSQLI_ASSOC));
?>
