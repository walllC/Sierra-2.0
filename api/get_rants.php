<?php
session_start();
require_once __DIR__ . '/../database.php';
header('Content-Type: application/json');

$current_user_id = $_SESSION['user_ID'] ?? 0;

try {
    $hasAnon = false; $hasCreatedAt = false; $hasUpdatedAt = false;
    
    $colResult = $conn->query("SHOW COLUMNS FROM rants LIKE 'anonymous'");
    if ($colResult && $colResult->num_rows > 0) $hasAnon = true;
    $colResult = $conn->query("SHOW COLUMNS FROM rants LIKE 'created_at'");
    if ($colResult && $colResult->num_rows > 0) $hasCreatedAt = true;
    $colResult = $conn->query("SHOW COLUMNS FROM rants LIKE 'updated_at'");
    if ($colResult && $colResult->num_rows > 0) $hasUpdatedAt = true;
    
    $anonColumn    = $hasAnon      ? 'r.anonymous'      : '0 as anonymous';
    $createdColumn = $hasCreatedAt ? 'r.created_at'     : 'NOW() as created_at';
    $updatedColumn = $hasUpdatedAt ? 'r.updated_at'     : 'NULL as updated_at';

    $query = "SELECT r.rant_ID, r.user_ID, 
    CASE 
        WHEN r.repost_of_id IS NOT NULL AND original.is_archived = 0 
        THEN original.content 
        ELSE r.content 
    END as content,
    {$anonColumn} as anonymous,
    r.repost_of_id, r.repost_of_user,
    {$createdColumn}, {$updatedColumn}, u.username, u.avatar,
    COUNT(DISTINCT c.comment_ID) as comment_count,
    (r.repost_of_id IS NOT NULL AND (original.rant_ID IS NULL OR original.is_archived = 1)) as is_original_deleted
    FROM rants r 
    JOIN users u ON r.user_ID = u.user_ID
    LEFT JOIN comments c ON r.rant_ID = c.rant_ID
    LEFT JOIN rants original ON r.repost_of_id = original.rant_ID
    WHERE r.is_archived = 0
    GROUP BY r.rant_ID
    ORDER BY r.created_at DESC LIMIT 500";  

    $stmt = $conn->prepare($query);
    $stmt->execute();
    $result = $stmt->get_result();

    $rants = [];
    while ($row = $result->fetch_assoc()) {
        $row['anonymous'] = (bool)$row['anonymous'];
        $row['is_original_deleted'] = (bool)$row['is_original_deleted'];
        $rid = (int)$row['rant_ID'];

        // Reactions count
        $rcounts = $conn->query("SELECT type, COUNT(*) as c FROM reactions WHERE rant_ID = $rid GROUP BY type");
        $reactions = [];
        while ($rc = $rcounts->fetch_assoc()) {
            $reactions[$rc['type']] = (int)$rc['c'];
        }
        $row['reactions'] = $reactions;

        // Current user's reaction
        if ($current_user_id) {
            $myreact = $conn->query("SELECT type FROM reactions WHERE rant_ID = $rid AND user_ID = $current_user_id LIMIT 1");
            $myrow = $myreact ? $myreact->fetch_assoc() : null;
            $row['user_reaction'] = $myrow ? $myrow['type'] : null;
        } else {
            $row['user_reaction'] = null;
        }

        // Repost info
        if (!empty($row['repost_of_id'])) {
            $row['repostOf'] = [
                'id'       => $row['repost_of_id'],
                'username' => $row['repost_of_user']
            ];
        }

        $rants[] = $row;
    }

    echo json_encode($rants, JSON_UNESCAPED_UNICODE);

} catch (Exception $e) {
    echo json_encode(['error' => $e->getMessage()]);
}
?>