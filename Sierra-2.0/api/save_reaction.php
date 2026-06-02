<?php
error_reporting(0);
ini_set('display_errors', 0);
session_start();
require_once __DIR__ . '/../database.php';
header('Content-Type: application/json');

$user_id = $_SESSION['user_ID'] ?? 0;
$rant_id = (int)($_POST['rant_id'] ?? 0);
$type    = trim($_POST['reaction_type'] ?? '');

if (!$user_id || !$rant_id || !$type) {
    echo json_encode([
        'success' => false,
        'message' => 'Missing data',
        'debug'   => ['user_id' => $user_id, 'rant_id' => $rant_id, 'type' => $type]
    ]);
    exit;
}

try {
    // Check if this exact reaction already exists
    $check = $conn->prepare("SELECT reaction_ID FROM reactions WHERE rant_ID = ? AND user_ID = ? AND type = ?");
    $check->bind_param("iis", $rant_id, $user_id, $type);
    $check->execute();
    $existing = $check->get_result()->fetch_assoc();

    $removed = false;

    if ($existing) {
        // Same emoji clicked again → toggle off
        $del = $conn->prepare("DELETE FROM reactions WHERE rant_ID = ? AND user_ID = ? AND type = ?");
        $del->bind_param("iis", $rant_id, $user_id, $type);
        $del->execute();
        $removed = true;
    } else {
        // Different emoji or no reaction → remove old, insert new
        $del = $conn->prepare("DELETE FROM reactions WHERE rant_ID = ? AND user_ID = ?");
        $del->bind_param("ii", $rant_id, $user_id);
        $del->execute();

        $ins = $conn->prepare("INSERT INTO reactions (rant_ID, user_ID, type) VALUES (?, ?, ?)");
        $ins->bind_param("iis", $rant_id, $user_id, $type);
        $ins->execute();
    }

    // Get updated counts
    $counts = $conn->prepare("SELECT type, COUNT(*) as c FROM reactions WHERE rant_ID = ? GROUP BY type HAVING COUNT(*) > 0");
    $counts->bind_param("i", $rant_id);
    $counts->execute();
    $rows = $counts->get_result();

    $reactions = [];
    while ($row = $rows->fetch_assoc()) {
        $reactions[$row['type']] = (int)$row['c'];
    }

    // Get current user's reaction after update
    $myreact = $conn->prepare("SELECT type FROM reactions WHERE rant_ID = ? AND user_ID = ? LIMIT 1");
    $myreact->bind_param("ii", $rant_id, $user_id);
    $myreact->execute();
    $myrow = $myreact->get_result()->fetch_assoc();
    $user_reaction = $myrow ? $myrow['type'] : null;

    echo json_encode([
        'success'       => true,
        'removed'       => $removed,
        'user_reaction' => $user_reaction,
        'reactions'     => $reactions
    ], JSON_UNESCAPED_UNICODE);

} catch (Exception $e) {
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
?>