<?php
session_start();
require_once __DIR__ . '/../database.php';
header('Content-Type: application/json');

if (!isset($_SESSION['user_ID'])) {
    echo json_encode(['success' => false, 'message' => 'Unauthorized']);
    exit();
}

try {
    $user_id = $_SESSION['user_ID'];
    
    // Get unread notifications
    $query = "SELECT 
        n.*,
        u.username as from_username,
        r.content as rant_content
    FROM notifications n
    LEFT JOIN users u ON n.from_user_ID = u.user_IDs
    LEFT JOIN rants r ON n.rant_ID = r.rant_ID
    WHERE n.to_user_ID = ?
    ORDER BY n.created_at DESC
    LIMIT 50";
    
    $stmt = $conn->prepare($query);
    $stmt->bind_param("i", $user_id);
    $stmt->execute();
    $result = $stmt->get_result();

    $notifications = [];
    while ($row = $result->fetch_assoc()) {
        $row['read_status'] = (bool)$row['read_status'];
        $notifications[] = $row;
    }

    echo json_encode($notifications);
} catch (Exception $e) {
    echo json_encode(['error' => $e->getMessage()]);
}
?>
