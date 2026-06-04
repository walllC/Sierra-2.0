<?php
session_start();
require_once '../database.php';
header('Content-Type: application/json');

if (!isset($_SESSION['role']) || $_SESSION['role'] !== 'admin') {
    echo json_encode(['error' => 'Unauthorized']); exit();
}

$user_id  = intval($_POST['id'] ?? 0);
$username = $_POST['username'] ?? '';
if (!$user_id || !$username) {
    echo json_encode(['error' => 'Missing data']); exit();
}

// Delete avatar/cover files from disk
$stmt = $conn->prepare("SELECT avatar, cover FROM users WHERE user_ID=?");
$stmt->bind_param("i", $user_id);
$stmt->execute();
$files = $stmt->get_result()->fetch_assoc();
foreach (['avatar', 'cover'] as $col) {
    if (!empty($files[$col]) && strpos($files[$col], 'uploads/') === 0) {
        $path = __DIR__ . '/../' . $files[$col];
        if (file_exists($path)) unlink($path);
    }
}

// Delete all user data
$conn->query("DELETE FROM reactions WHERE user_ID=$user_id");
$conn->query("DELETE FROM comments WHERE user_ID=$user_id");
$conn->query("DELETE FROM notifications WHERE from_user_ID=$user_id OR to_user_ID=$user_id");
$stmt2 = $conn->prepare("DELETE FROM messages WHERE from_user=? OR to_user=?");
$stmt2->bind_param("ss", $username, $username);
$stmt2->execute();
$stmt3 = $conn->prepare("DELETE FROM follows WHERE follower=? OR following=?");
$stmt3->bind_param("ss", $username, $username);
$stmt3->execute();
$stmt4 = $conn->prepare("DELETE FROM blocks WHERE blocker=? OR blocked=?");
$stmt4->bind_param("ss", $username, $username);
$stmt4->execute();
$conn->query("DELETE FROM reports WHERE rant_id IN (SELECT rant_ID FROM rants WHERE user_ID=$user_id)");
$conn->query("DELETE FROM rants WHERE user_ID=$user_id");

echo json_encode(['success' => true]);
?>