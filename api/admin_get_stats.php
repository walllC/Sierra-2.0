<?php
session_start();
include __DIR__ . '/../database.php';
header('Content-Type: application/json');

function fetchAll($conn, $sql) {
    $result = $conn->query($sql);
    return $result ? $result->fetch_all(MYSQLI_ASSOC) : [];
}

function periodCondition($column, $period) {
    if ($period === 'today') return "AND DATE({$column}) = CURDATE()";
    if ($period === 'week') return "AND {$column} >= DATE_SUB(NOW(), INTERVAL 7 DAY)";
    if ($period === 'month') return "AND {$column} >= DATE_SUB(NOW(), INTERVAL 30 DAY)";
    return "";
}

function mostLikedRants($conn, $period) {
    $where = periodCondition('r.created_at', $period);
    return fetchAll($conn, "
        SELECT r.rant_ID AS id, r.content, r.created_at, u.username,
               COUNT(DISTINCT rx.reaction_ID) AS like_count,
               COUNT(DISTINCT c.comment_ID) AS comment_count
        FROM rants r
        JOIN users u ON r.user_ID = u.user_ID
        LEFT JOIN reactions rx ON rx.rant_ID = r.rant_ID
        LEFT JOIN comments c ON c.rant_ID = r.rant_ID
        WHERE r.is_archived = 0 {$where}
        GROUP BY r.rant_ID
        ORDER BY like_count DESC, comment_count DESC, r.created_at DESC
        LIMIT 5
    ");
}

function activeUsers($conn, $period) {
    $where = periodCondition('u.last_active_at', $period);
    $lastActiveWhere = substr($where, 4);
    $activityWhere = $period === 'all'
        ? ""
        : "AND ({$lastActiveWhere} OR COALESCE(r.rant_count, 0) > 0 OR COALESCE(c.comment_count, 0) > 0)";

    return fetchAll($conn, "
        SELECT u.user_ID AS id, u.username, u.role, u.status, u.last_active_at,
               COALESCE(r.rant_count, 0) AS rant_count,
               COALESCE(c.comment_count, 0) AS comment_count,
               COALESCE(r.rant_count, 0) + COALESCE(c.comment_count, 0) AS activity_score
        FROM users u
        LEFT JOIN (
            SELECT user_ID, COUNT(*) AS rant_count
            FROM rants
            WHERE is_archived = 0 " . periodCondition('created_at', $period) . "
            GROUP BY user_ID
        ) r ON r.user_ID = u.user_ID
        LEFT JOIN (
            SELECT user_ID, COUNT(*) AS comment_count
            FROM comments
            WHERE 1=1 " . periodCondition('created_at', $period) . "
            GROUP BY user_ID
        ) c ON c.user_ID = u.user_ID
        WHERE u.role != 'admin'
          AND u.status != 'banned'
          {$activityWhere}
        ORDER BY activity_score DESC, u.last_active_at DESC
        LIMIT 5
    ");
}

function activeUserCount($conn, $period) {
    return $conn->query("
        SELECT COUNT(DISTINCT u.user_ID)
        FROM users u
        LEFT JOIN rants r ON r.user_ID = u.user_ID
            AND r.is_archived = 0 " . periodCondition('r.created_at', $period) . "
        LEFT JOIN comments c ON c.user_ID = u.user_ID
            " . periodCondition('c.created_at', $period) . "
        WHERE u.role != 'admin'
          AND u.status != 'banned'
          AND (
            u.last_active_at >= " . ($period === 'week' ? "DATE_SUB(NOW(), INTERVAL 7 DAY)" : "DATE_SUB(NOW(), INTERVAL 30 DAY)") . "
            OR r.rant_ID IS NOT NULL
            OR c.comment_ID IS NOT NULL
          )
    ")->fetch_row()[0];
}

$recentRants = fetchAll($conn, "
    SELECT r.rant_ID as id, r.content, r.created_at, u.username
    FROM rants r
    JOIN users u ON r.user_ID = u.user_ID
    WHERE r.is_archived = 0
    ORDER BY r.created_at DESC
    LIMIT 5
");

$stats = [
    'userCount'    => $conn->query("SELECT COUNT(*) FROM users")->fetch_row()[0],
    'rantCount'    => $conn->query("SELECT COUNT(*) FROM rants WHERE is_archived = 0")->fetch_row()[0],
    'rantsToday'   => $conn->query("SELECT COUNT(*) FROM rants WHERE DATE(created_at) = CURDATE() AND is_archived = 0")->fetch_row()[0],
    'bannedCount'  => $conn->query("SELECT COUNT(*) FROM users WHERE status = 'banned'")->fetch_row()[0],
    'commentCount' => $conn->query("SELECT COUNT(*) FROM comments")->fetch_row()[0],
    'reportCount'  => $conn->query("SELECT COUNT(*) FROM reports")->fetch_row()[0],
    'activeCounts' => [
        'week'  => activeUserCount($conn, 'week'),
        'month' => activeUserCount($conn, 'month'),
    ],
    'mostLiked' => [
        'today' => mostLikedRants($conn, 'today'),
        'week'  => mostLikedRants($conn, 'week'),
        'month' => mostLikedRants($conn, 'month'),
        'all'   => mostLikedRants($conn, 'all'),
    ],
    'activeUsers' => [
        'week'  => activeUsers($conn, 'week'),
        'month' => activeUsers($conn, 'month'),
        'all'   => activeUsers($conn, 'all'),
    ],
    'recentRants'  => $recentRants
];

echo json_encode($stats);
?>