<?php
require_once 'database.php';
header('Content-Type: application/json');

if (isset($_GET['rant_id'])) {
    $rant_id = $_GET['rant_id'];

    // Siniguro kong malaki ang "ID" (rant_ID at user_ID) base sa database mo
    $query = "SELECT c.*, u.username 
              FROM comments c 
              JOIN users u ON c.user_ID = u.user_ID 
              WHERE c.rant_ID = ? 
              ORDER BY c.created_at ASC";
    
    $stmt = $conn->prepare($query);
    $stmt->bind_param("i", $rant_id);
    $stmt->execute();
    $result = $stmt->get_result();

    $comments = [];
    while ($row = $result->fetch_assoc()) {
        $comments[] = $row;
    }

    // Ito ang magpapadala ng data pabalik sa feeds.js
    echo json_encode($comments);
} else {
    echo json_encode([]);
}
?>