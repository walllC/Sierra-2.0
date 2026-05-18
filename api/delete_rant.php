<?php
error_reporting(0);
ini_set('display_errors', 0);
session_start();
require_once __DIR__ . '/../database.php';
header('Content-Type: application/json');

$user_id = (int)($_SESSION['user_ID'] ?? 0);
$rant_id = (int)($_POST['rant_id'] ?? $_POST['id'] ?? 0);

if (!$user_id || !$rant_id) {
    echo json_encode(['success' => false, 'message' => 'Missing data']);
    exit;
}

try {
    $check = $conn->prepare("SELECT user_ID FROM rants WHERE rant_ID = ? LIMIT 1");
    $check->bind_param("i", $rant_id);
    $check->execute();
    $rant = $check->get_result()->fetch_assoc();

    if (!$rant) {
        echo json_encode(['success' => false, 'message' => 'Rant not found']);
        exit;
    }

    if ((int)$rant['user_ID'] !== $user_id) {
        echo json_encode(['success' => false, 'message' => 'Not authorized']);
        exit;
    }

    $commentIds = [];
    $comments = $conn->prepare("SELECT comment_ID FROM comments WHERE rant_ID = ?");
    $comments->bind_param("i", $rant_id);
    $comments->execute();
    $result = $comments->get_result();
    while ($row = $result->fetch_assoc()) {
        $commentIds[] = (int)$row['comment_ID'];
    }

    if ($commentIds) {
        $placeholders = implode(',', array_fill(0, count($commentIds), '?'));
        $types = str_repeat('i', count($commentIds));

        $deleteCommentReactions = $conn->prepare("DELETE FROM comment_reactions WHERE comment_ID IN ($placeholders)");
        $deleteCommentReactions->bind_param($types, ...$commentIds);
        $deleteCommentReactions->execute();
    }

    $deleteComments = $conn->prepare("DELETE FROM comments WHERE rant_ID = ?");
    $deleteComments->bind_param("i", $rant_id);
    $deleteComments->execute();

    $deleteReactions = $conn->prepare("DELETE FROM reactions WHERE rant_ID = ?");
    $deleteReactions->bind_param("i", $rant_id);
    $deleteReactions->execute();

    $deleteNotifications = $conn->prepare("DELETE FROM notifications WHERE rant_ID = ?");
    $deleteNotifications->bind_param("i", $rant_id);
    $deleteNotifications->execute();

    $deleteRant = $conn->prepare("DELETE FROM rants WHERE rant_ID = ? AND user_ID = ?");
    $deleteRant->bind_param("ii", $rant_id, $user_id);
    $deleteRant->execute();

    echo json_encode(['success' => $deleteRant->affected_rows > 0]);
} catch (Exception $e) {
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
?>
