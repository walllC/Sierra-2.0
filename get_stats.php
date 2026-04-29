<?php
include '../database.php';
header('Content-Type: application/json');

$stats = [
    'userCount' => $conn->query("SELECT COUNT(*) FROM users")->fetch_row()[0],
    'rantCount' => $conn->query("SELECT COUNT(*) FROM rants")->fetch_row()[0],
    'recentRants' => $conn->query("SELECT * FROM rants ORDER BY created_at DESC LIMIT 5")->fetch_all(MYSQLI_ASSOC)
];

echo json_encode($stats);
?>