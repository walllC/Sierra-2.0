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
    $rant_id = isset($_POST['rant_id']) ? $_POST['rant_id'] : null;
    $comment_text = isset($_POST['comment_text']) ? trim($_POST['comment_text']) : '';
    $parent_id = !empty($_POST['parent_id']) ? $_POST['parent_id'] : null;

    if (empty($comment_text)) {
        echo json_encode(['success' => false, 'message' => 'Empty comment']);
        exit();
    }

    try {
        // MATCHED sa table mo: rant_ID, user_ID (Malaki ang ID)
        $query = "INSERT INTO comments (rant_ID, user_ID, comment_text, parent_id) VALUES (?, ?, ?, ?)";
        $stmt = $conn->prepare($query);
        
        // Convert parent_id to int or null
        $parent_id_int = ($parent_id !== null && $parent_id !== '') ? (int)$parent_id : null;
        // Bind in order: rant_ID (i), user_ID (i), comment_text (s), parent_id (i)
        $stmt->bind_param("iisi", $rant_id, $user_id, $comment_text, $parent_id_int);

        if ($stmt->execute()) {
            // Get updated comment count
            $count_query = "SELECT COUNT(*) as total FROM comments WHERE rant_ID = ?";
            $count_stmt = $conn->prepare($count_query);
            $count_stmt->bind_param("i", $rant_id);
            $count_stmt->execute();
            $count_result = $count_stmt->get_result();
            $count_row = $count_result->fetch_assoc();
            
            echo json_encode([
                'success' => true, 
                'message' => 'Comment posted successfully',
                'comment_count' => $count_row['total']
            ]);
        } else {
            echo json_encode(['success' => false, 'message' => $conn->error]);
        }
    } catch (Exception $e) {
        echo json_encode(['success' => false, 'message' => $e->getMessage()]);
    }
}
?>