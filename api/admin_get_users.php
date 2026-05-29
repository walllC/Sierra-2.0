<?php
session_start();
require_once '../database.php';
header('Content-Type: application/json');

$result = $conn->query("
    SELECT user_ID as id, username, role, status 
    FROM users 
    ORDER BY created_at DESC
");

echo json_encode($result->fetch_all(MYSQLI_ASSOC));
?>