<?php
session_start();
$conn = new mysqli('localhost', 'root', '', 'echowall_olap');
header('Content-Type: application/json');


if (!isset($_SESSION['user_ID']) || $_SESSION['role'] !== 'admin') {
    echo json_encode(['error' => 'Unauthorized']);
    exit;
}

$type = $_GET['type'] ?? 'rants_per_day';

if ($type === 'rants_per_day') {
    // Rants posted per day for the last 7 days
    $result = $conn->query("
        SELECT dt.full_date as day, COUNT(*) as total
FROM fact_rants fr
JOIN dim_time dt ON fr.time_key = dt.time_key
WHERE dt.full_date >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
GROUP BY dt.full_date
ORDER BY dt.full_date ASC
    ");
    $labels = [];
    $data = [];
    while ($row = $result->fetch_assoc()) {
        $labels[] = date('M d', strtotime($row['day']));
        $data[] = (int)$row['total'];
    }
    echo json_encode(['labels' => $labels, 'data' => $data]);
}

elseif ($type === 'top_users') {
    // Top 5 most active users by rant count
    $result = $conn->query("
    SELECT du.username, COUNT(*) as total
    FROM fact_rants fr
    JOIN dim_user du ON fr.user_key = du.user_key
    WHERE du.role != 'admin'
    GROUP BY du.user_key
    ORDER BY total DESC
    LIMIT 5
");
    $labels = [];
    $data = [];
    while ($row = $result->fetch_assoc()) {
        $labels[] = '@' . $row['username'];
        $data[] = (int)$row['total'];
    }
    echo json_encode(['labels' => $labels, 'data' => $data]);
}

elseif ($type === 'anonymous_ratio') {
    $result = $conn->query("
        SELECT drt.type_label, COUNT(*) as total
        FROM fact_rants fr
        JOIN dim_rant_type drt ON fr.rant_type_key = drt.rant_type_key
        GROUP BY drt.rant_type_key
    ");
    $labels = [];
    $data = [];
    while ($row = $result->fetch_assoc()) {
        $labels[] = $row['type_label'];
        $data[] = (int)$row['total'];
    }
    echo json_encode(['labels' => $labels, 'data' => $data]);
}

elseif ($type === 'rants_per_hour') {
    // Rants by hour of day (all time) to show peak activity
    $result = $conn->query("
        SELECT dt.hour, COUNT(*) as total
FROM fact_rants fr
JOIN dim_time dt ON fr.time_key = dt.time_key
GROUP BY dt.hour
ORDER BY dt.hour ASC
    ");
    $labels = [];
    $data = array_fill(0, 24, 0);
    while ($row = $result->fetch_assoc()) {
        $data[(int)$row['hour']] = (int)$row['total'];
    }
    for ($i = 0; $i < 24; $i++) {
        $labels[] = $i . ':00';
    }
    echo json_encode(['labels' => $labels, 'data' => $data]);
}
?>