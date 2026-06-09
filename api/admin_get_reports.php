<?php
session_start();
require_once '../database.php';
header('Content-Type: application/json');

$result = $conn->query("
    SELECT 
    rp.id,
    rp.rant_id,
    rp.reason,
    rp.description,
    rp.created_at,
    reporter.username as reporter,
    r.content as rant_content,
    author.username as rant_author
    FROM reports rp
    JOIN users reporter ON rp.reporter_id = reporter.user_ID
    JOIN rants r ON rp.rant_id = r.rant_ID
    JOIN users author ON r.user_ID = author.user_ID
    ORDER BY rp.created_at DESC
");

if (!$result) {
    echo json_encode(['error' => $conn->error]);
    exit;
}

echo json_encode($result->fetch_all(MYSQLI_ASSOC));
?>