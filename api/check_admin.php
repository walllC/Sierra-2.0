<?php
session_start();
require_once '../database.php';
header('Content-Type: application/json');

if (!isset($_SESSION['user_ID'])) {  // ⚠️ check exact case
    echo json_encode(['authorized' => false]);
    exit;
}

$stmt = $conn->prepare("SELECT role, username FROM users WHERE user_ID = ?");
$stmt->bind_param("i", $_SESSION['user_ID']);
$stmt->execute();
$user = $stmt->get_result()->fetch_assoc();

$isAdmin = $user && ($user['role'] === 'admin' || $user['username'] === 'Sierra_Admin');

echo json_encode(['authorized' => $isAdmin]);
?>