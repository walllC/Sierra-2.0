<?php
$host = 'localhost';
$db   = 'echowall';
$user = 'root'; 
$pass = '';    

$conn = new mysqli($host, $user, $pass, $db);

if ($conn->connect_error) {
    die("Connection failed: " . $conn->connect_error);
}

// ✅ FIX: Enable full UTF-8 emoji support
$conn->set_charset("utf8mb4");

// Keep PHP and MySQL timestamps aligned with the app's local timezone.
date_default_timezone_set('Asia/Manila');
$conn->query("SET time_zone = '+08:00'");

$lastActiveColumn = $conn->query("SHOW COLUMNS FROM users LIKE 'last_active_at'");
if ($lastActiveColumn && $lastActiveColumn->num_rows === 0) {
    $conn->query("ALTER TABLE users ADD COLUMN last_active_at DATETIME NULL AFTER created_at");
}

if (session_status() === PHP_SESSION_ACTIVE && isset($_SESSION['user_ID'])) {
    $activeUserId = (int)$_SESSION['user_ID'];
    $conn->query("UPDATE users SET last_active_at = NOW() WHERE user_ID = {$activeUserId}");
}

?>
