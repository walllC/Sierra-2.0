<?php
session_start();
require_once '../database.php';
header('Content-Type: application/json');

$id = intval($_POST['id']);
$stmt = $conn->prepare("DELETE FROM reports WHERE id = ?");
$stmt->bind_param("i", $id);
$stmt->execute();

echo json_encode(['success' => true]);
?>