<?php
session_start();
require_once '../database.php';
header('Content-Type: application/json');

$id = intval($_POST['id']);
$stmt = $conn->prepare("UPDATE rants SET is_archived = 1 WHERE rant_ID = ?");
$stmt->bind_param("i", $id);
$stmt->execute();

echo json_encode(['success' => true]);
?>