<?php
session_start();
include 'database.php';

header('Content-Type: application/json');

if (!isset($_SESSION['user_ID'])) {
    echo json_encode(['ok' => false, 'error' => 'Not logged in']);
    exit;
}

$rant_id     = intval($_POST['rant_id'] ?? 0);
$reason      = trim($_POST['reason'] ?? '');
$description = trim($_POST['description'] ?? '');
$reporter_id = intval($_SESSION['user_ID']);

if (!$rant_id || empty($reason)) {
    echo json_encode(['ok' => false, 'error' => 'Invalid data']);
    exit;
}

// Check if already reported
$check = mysqli_query($conn, "SELECT id FROM reports WHERE rant_id = $rant_id AND reporter_id = $reporter_id LIMIT 1");
if (mysqli_num_rows($check) > 0) {
    echo json_encode(['ok' => false, 'error' => 'Already reported']);
    exit;
}

$reason_escaped      = mysqli_real_escape_string($conn, $reason);
$description_escaped = mysqli_real_escape_string($conn, $description);

$sql = "INSERT INTO reports (rant_id, reporter_id, reason, description) VALUES ($rant_id, $reporter_id, '$reason_escaped', '$description_escaped')";

if (mysqli_query($conn, $sql)) {
    echo json_encode(['ok' => true]);
} else {
    echo json_encode(['ok' => false, 'error' => 'Server error: ' . mysqli_error($conn)]);
}
?>