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
$reporter_id = intval($_SESSION['user_ID']);

// Debug — remove after confirming it works
error_log("rant_id: $rant_id | reason: $reason | reporter_id: $reporter_id");

if (!$rant_id || empty($reason)) {
    echo json_encode(['ok' => false, 'error' => 'Invalid data - reason: ' . $reason]);
    exit;
}

// Check if already reported
$check = mysqli_query($conn, "SELECT id FROM reports WHERE rant_id = $rant_id AND reporter_id = $reporter_id LIMIT 1");
if (mysqli_num_rows($check) > 0) {
    echo json_encode(['ok' => false, 'error' => 'Already reported']);
    exit;
}

$reason_escaped = mysqli_real_escape_string($conn, $reason);
$sql = "INSERT INTO reports (rant_id, reporter_id, reason) VALUES ($rant_id, $reporter_id, '$reason_escaped')";

if (mysqli_query($conn, $sql)) {
    echo json_encode(['ok' => true]);
} else {
    echo json_encode(['ok' => false, 'error' => 'Server error: ' . mysqli_error($conn)]);
}
?>