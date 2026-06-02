<?php
session_start();
require_once '../database.php';
header('Content-Type: application/json');

$id     = intval($_POST['id']);
$status = $_POST['status'] === 'banned' ? 'banned' : 'active';

$stmt = $conn->prepare("UPDATE users SET status = ? WHERE user_ID = ?");
$stmt->bind_param("si", $status, $id);
$stmt->execute();

echo json_encode(['success' => true]);
?>