<?php
session_start();
require_once 'database.php';
header('Content-Type: application/json');

if (!isset($_SESSION['user_ID'])) {
    echo json_encode(['error' => 'Unauthorized']); exit();
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    echo json_encode(['error' => 'POST required']); exit();
}

$type = $_POST['type'] ?? '';
if (!in_array($type, ['avatar', 'cover'])) {
    echo json_encode(['error' => 'Invalid type']); exit();
}

if (!isset($_FILES['image']) || $_FILES['image']['error'] !== UPLOAD_ERR_OK) {
    echo json_encode(['error' => 'No file uploaded']); exit();
}

// ← MOVED UP: define $field early so delete block can use it
$field = ($type === 'avatar') ? 'avatar' : 'cover';

$file     = $_FILES['image'];
$maxSize  = 20 * 1024 * 1024;
$allowed  = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
$finfo    = finfo_open(FILEINFO_MIME_TYPE);
$mimeType = finfo_file($finfo, $file['tmp_name']);
finfo_close($finfo);

if ($file['size'] > $maxSize) {
    echo json_encode(['error' => 'File too large (max 20MB)']); exit();
}
if (!in_array($mimeType, $allowed)) {
    echo json_encode(['error' => 'Invalid file type']); exit();
}

$ext      = pathinfo($file['name'], PATHINFO_EXTENSION);
$filename = $type . '_' . $_SESSION['user_ID'] . '_' . time() . '.' . $ext;
$savePath = __DIR__ . '/uploads/' . $filename;
$urlPath  = 'uploads/' . $filename;

// Delete old file if it exists
$stmt2 = $conn->prepare("SELECT $field FROM users WHERE user_ID=?");
$stmt2->bind_param("i", $_SESSION['user_ID']);
$stmt2->execute();
$old = $stmt2->get_result()->fetch_assoc();
if ($old && $old[$field] && strpos($old[$field], 'uploads/') === 0) {
    $oldPath = __DIR__ . '/' . $old[$field];
    if (file_exists($oldPath)) unlink($oldPath);
}

if (!move_uploaded_file($file['tmp_name'], $savePath)) {
    echo json_encode(['error' => 'Failed to save file']); exit();
}

$stmt = $conn->prepare("UPDATE users SET $field=? WHERE user_ID=?");
$stmt->bind_param("si", $urlPath, $_SESSION['user_ID']);
$stmt->execute();

echo json_encode(['success' => true, 'path' => $urlPath]);
?>