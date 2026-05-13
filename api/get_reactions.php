<?php
require_once __DIR__ . '/../database.php';
header('Content-Type: application/json');

if (isset($_GET['rant_id'])) {
    $rant_id = (int)$_GET['rant_id'];

    try {
        // Get all reactions for the rant, grouped by type
        $query = "SELECT 
            reaction_type,
            GROUP_CONCAT(u.username) as users,
            COUNT(*) as count
        FROM reactions r
        JOIN users u ON r.user_ID = u.user_ID
        WHERE r.rant_ID = ?
        GROUP BY reaction_type
        ORDER BY count DESC";
        
        $stmt = $conn->prepare($query);
        $stmt->bind_param("i", $rant_id);
        $stmt->execute();
        $result = $stmt->get_result();

        $reactions = [];
        while ($row = $result->fetch_assoc()) {
            $reactions[$row['reaction_type']] = explode(',', $row['users']);
        }

        echo json_encode($reactions);
    } catch (Exception $e) {
        echo json_encode(['error' => $e->getMessage()]);
    }
} else {
    echo json_encode([]);
}
?>
