<?php
session_start();
require_once __DIR__ . '/../database.php';
header('Content-Type: application/json');

$current_user_id = $_SESSION['user_ID'] ?? 0;

// TEMP DEBUG - remove after fixing
if (isset($_GET['debug'])) {
    echo json_encode(['current_user_id' => $current_user_id, 'session' => $_SESSION]);
    exit;
}

try {
    $hasAnon = false; $hasCreatedAt = false; $hasUpdatedAt = false;
    
    $colResult = $conn->query("SHOW COLUMNS FROM rants LIKE 'anonymous'");
    if ($colResult && $colResult->num_rows > 0) $hasAnon = true;
    $colResult = $conn->query("SHOW COLUMNS FROM rants LIKE 'created_at'");
    if ($colResult && $colResult->num_rows > 0) $hasCreatedAt = true;
    $colResult = $conn->query("SHOW COLUMNS FROM rants LIKE 'updated_at'");
    if ($colResult && $colResult->num_rows > 0) $hasUpdatedAt = true;
    
    $anonColumn    = $hasAnon      ? 'r.anonymous'               : '0 as anonymous';
    $createdColumn = $hasCreatedAt ? "CONCAT(r.created_at, 'Z') as createdAt" : "CONCAT(NOW(), 'Z') as createdAt";
    $updatedColumn = $hasUpdatedAt ? "CONCAT(r.updated_at, 'Z') as updatedAt" : 'NULL as updatedAt';
    $orderColumn   = $hasCreatedAt ? 'r.created_at'              : 'r.rant_ID';
    
    $query = "SELECT r.rant_ID as id, r.user_ID, r.content, {$anonColumn} as anonymous,
        {$createdColumn}, {$updatedColumn}, u.username,
        COUNT(DISTINCT c.comment_ID) as comment_count
    FROM rants r 
    JOIN users u ON r.user_ID = u.user_ID
    LEFT JOIN comments c ON r.rant_ID = c.rant_ID
    GROUP BY r.rant_ID 
    ORDER BY {$orderColumn} DESC";
    
    $stmt = $conn->prepare($query);
    $stmt->execute();
    $result = $stmt->get_result();

    $rants = [];
    while ($row = $result->fetch_assoc()) {
        $row['anonymous'] = (bool)$row['anonymous'];

        $rid = (int)$row['id'];

        $rcounts = $conn->query("SELECT type, COUNT(*) as c FROM reactions WHERE rant_ID = $rid GROUP BY type");
        $reactions = [];
        while ($rc = $rcounts->fetch_assoc()) {
            $reactions[$rc['type']] = (int)$rc['c'];
        }
        $row['reactions'] = $reactions;

        // Fetch current user's reaction separately
if ($current_user_id) {
    $myreact_result = $conn->query("SELECT type FROM reactions WHERE rant_ID = $rid AND user_ID = $current_user_id LIMIT 1");
    $myrow = $myreact_result ? $myreact_result->fetch_assoc() : null;
    $row['user_reaction'] = $myrow ? $myrow['type'] : null;
} else {
    $row['user_reaction'] = null;
}

        $rants[] = $row;
    }

    echo json_encode($rants, JSON_UNESCAPED_UNICODE);

} catch (Exception $e) {
    echo json_encode(['error' => $e->getMessage()]);
}
?>