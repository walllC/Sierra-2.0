<?php
require_once 'database.php';
header('Content-Type: application/json');

session_start();
$user_id = $_SESSION['user_ID'] ?? 0;

if (!isset($_GET['rant_id'])) {
    echo json_encode([]);
    exit;
}

$rant_id = (int)$_GET['rant_id'];

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
    $cid = (int)$row['comment_ID'];

    // Reaction counts grouped by type for this comment
    $rStmt = $conn->prepare("
        SELECT type, COUNT(*) as count
        FROM comment_reactions
        WHERE comment_ID = ?
        GROUP BY type
    ");
    $rStmt->bind_param("i", $cid);
    $rStmt->execute();
    $rResult = $rStmt->get_result();
    $reactions = [];
    while ($r = $rResult->fetch_assoc()) {
        $reactions[$r['type']] = (int)$r['count'];
    }
    $rStmt->close();

    // This user's reaction on this comment
    $myStmt = $conn->prepare("
        SELECT type FROM comment_reactions
        WHERE comment_ID = ? AND user_ID = ?
        LIMIT 1
    ");
    $myStmt->bind_param("ii", $cid, $user_id);
    $myStmt->execute();
    $myRow = $myStmt->get_result()->fetch_assoc();
    $userReaction = $myRow ? $myRow['type'] : null;
    $myStmt->close();

    $row['reactions']     = $reactions;
    $row['user_reaction'] = $userReaction;
    $comments[] = $row;
}

echo json_encode($comments, JSON_UNESCAPED_UNICODE);
?>