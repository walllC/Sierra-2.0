<?php
session_start();
require_once 'database.php'; //

header('Content-Type: application/json');

if (!isset($_SESSION['user_ID'])) {
    echo json_encode(['success' => false, 'message' => 'Not logged in']);
    exit;
}

$rant_id = intval($_POST['rant_id'] ?? 0);
$content = trim($_POST['content'] ?? '');
$user_id = intval($_SESSION['user_ID']);

if (!$rant_id || empty($content) || strlen($content) > 300) {
    echo json_encode(['success' => false, 'message' => 'Invalid data']);
    exit;
}

$content_escaped = mysqli_real_escape_string($conn, $content);
$sql = "UPDATE rants SET content = '$content_escaped' 
        WHERE rant_ID = $rant_id AND user_ID = $user_id";

if (mysqli_query($conn, $sql)) {
    echo json_encode(['success' => true]);
} else {
    echo json_encode(['success' => false, 'message' => mysqli_error($conn)]);
}
?>