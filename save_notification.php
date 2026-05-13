<?php
session_start();
require_once 'database.php';
header('Content-Type: application/json');

if (!isset($_SESSION['user_ID'])) {
    echo json_encode(['success' => false, 'message' => 'Unauthorized']);
    exit();
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $from_user_id = isset($_POST['from_user_id']) ? (int)$_POST['from_user_id'] : null;
    $to_user_id = isset($_POST['to_user_id']) ? (int)$_POST['to_user_id'] : null;
    $type = isset($_POST['type']) ? trim($_POST['type']) : 'comment';
    $message = isset($_POST['message']) ? trim($_POST['message']) : '';
    $rant_id = isset($_POST['rant_id']) ? (int)$_POST['rant_id'] : null;
    $comment_id = isset($_POST['comment_id']) ? (int)$_POST['comment_id'] : null;

    if (!$to_user_id) {
        echo json_encode(['success' => false, 'message' => 'to_user_id required']);
        exit();
    }

    try {
        $query = "INSERT INTO notifications (from_user_ID, to_user_ID, type, message, rant_ID, comment_ID) 
                  VALUES (?, ?, ?, ?, ?, ?)";
        $stmt = $conn->prepare($query);
        $stmt->bind_param("iissis", $from_user_id, $to_user_id, $type, $message, $rant_id, $comment_id);

        if ($stmt->execute()) {
            echo json_encode([
                'success' => true,
                'message' => 'Notification created',
                'notification_id' => $stmt->insert_id
            ]);
        } else {
            echo json_encode(['success' => false, 'message' => $conn->error]);
        }
    } catch (Exception $e) {
        echo json_encode(['success' => false, 'message' => $e->getMessage()]);
    }
}
?>
