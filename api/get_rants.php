<?php
require_once __DIR__ . '/../database.php';
header('Content-Type: application/json');

try {
    $hasAnon = false;
    $hasCreatedAt = false;
    $hasUpdatedAt = false;

    $colResult = $conn->query("SHOW COLUMNS FROM rants LIKE 'anonymous'");
    if ($colResult && $colResult->num_rows > 0) {
        $hasAnon = true;
    }
    $colResult = $conn->query("SHOW COLUMNS FROM rants LIKE 'created_at'");
    if ($colResult && $colResult->num_rows > 0) {
        $hasCreatedAt = true;
    }
    $colResult = $conn->query("SHOW COLUMNS FROM rants LIKE 'updated_at'");
    if ($colResult && $colResult->num_rows > 0) {
        $hasUpdatedAt = true;
    }

    // Get all rants with user info, ordered by newest first
    $anonColumn = $hasAnon ? 'r.anonymous' : '0 as anonymous';
    $createdColumn = $hasCreatedAt ? 'r.created_at as createdAt' : 'NOW() as createdAt';
    $updatedColumn = $hasUpdatedAt ? 'r.updated_at as updatedAt' : 'NULL as updatedAt';
    $orderColumn = $hasCreatedAt ? 'r.created_at' : 'r.rant_ID';

    $query = "SELECT 
        r.rant_ID as id,
        r.user_ID,
        r.content,
        {$anonColumn} as anonymous,
        {$createdColumn},
        {$updatedColumn},
        u.username,
        COUNT(DISTINCT c.comment_ID) as comment_count,
        COUNT(DISTINCT re.reaction_ID) as reaction_count
    FROM rants r
    JOIN users u ON r.user_ID = u.user_ID
    LEFT JOIN comments c ON r.rant_ID = c.rant_ID
    LEFT JOIN reactions re ON r.rant_ID = re.rant_ID
    GROUP BY r.rant_ID
    ORDER BY {$orderColumn} DESC";
    
    $result = $conn->query($query);
    
    if (!$result) {
        echo json_encode(['error' => $conn->error]);
        exit();
    }
    
    $rants = [];
    while ($row = $result->fetch_assoc()) {
        // Convert numeric string booleans to actual booleans
        $row['anonymous'] = (bool)$row['anonymous'];
        $row['likes'] = [];
        $row['reactions'] = [];
        $rants[] = $row;
    }
    
    echo json_encode($rants);
} catch (Exception $e) {
    echo json_encode(['error' => $e->getMessage()]);
}
?>
