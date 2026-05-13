<?php
session_start();
require_once 'database.php';
header('Content-Type: application/json');

if (!isset($_SESSION['user_ID'])) {
    echo json_encode(['success' => false, 'message' => 'Unauthorized']);
    exit();
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $user_id = $_SESSION['user_ID'];
    $rant_id = isset($_POST['rant_id']) ? (int)$_POST['rant_id'] : null;
    $reaction_type = isset($_POST['reaction_type']) ? trim($_POST['reaction_type']) : 'like';

    if (!$rant_id) {
        echo json_encode(['success' => false, 'message' => 'Rant ID required']);
        exit();
    }

    try {
        // Check if reaction already exists
        $check_query = "SELECT reaction_ID FROM reactions WHERE rant_ID = ? AND user_ID = ? AND reaction_type = ?";
        $check_stmt = $conn->prepare($check_query);
        $check_stmt->bind_param("iis", $rant_id, $user_id, $reaction_type);
        $check_stmt->execute();
        $check_result = $check_stmt->get_result();

        if ($check_result->num_rows > 0) {
            // Already reacted, remove the reaction (toggle off)
            $delete_query = "DELETE FROM reactions WHERE rant_ID = ? AND user_ID = ? AND reaction_type = ?";
            $delete_stmt = $conn->prepare($delete_query);
            $delete_stmt->bind_param("iis", $rant_id, $user_id, $reaction_type);
            
            if ($delete_stmt->execute()) {
                echo json_encode(['success' => true, 'message' => 'Reaction removed', 'action' => 'removed']);
            } else {
                echo json_encode(['success' => false, 'message' => $conn->error]);
            }
        } else {
            // Add new reaction
            $insert_query = "INSERT INTO reactions (rant_ID, user_ID, reaction_type) VALUES (?, ?, ?)";
            $insert_stmt = $conn->prepare($insert_query);
            $insert_stmt->bind_param("iis", $rant_id, $user_id, $reaction_type);
            
            if ($insert_stmt->execute()) {
                echo json_encode(['success' => true, 'message' => 'Reaction added', 'action' => 'added']);
            } else {
                echo json_encode(['success' => false, 'message' => $conn->error]);
            }
        }
    } catch (Exception $e) {
        echo json_encode(['success' => false, 'message' => $e->getMessage()]);
    }
}
?>
