<?php
// ============================================================
// ETL SCRIPT: echowall → echowall_olap
// File: etl.php
// Place in your project root
// Run manually: visit http://localhost/EchoWall/etl.php
// ============================================================

// --- SECURITY: only admin can run ETL ---
session_start();
if (!isset($_SESSION['user_ID']) || $_SESSION['role'] !== 'admin') {
    die(json_encode(['error' => 'Unauthorized']));
}

$start = microtime(true);
$log = [];

// --- Connect to OLTP (source) ---
$oltp = new mysqli('localhost', 'root', '', 'echowall');
if ($oltp->connect_error) die('OLTP connect failed: ' . $oltp->connect_error);

// --- Connect to OLAP (destination) ---
$olap = new mysqli('localhost', 'root', '', 'echowall_olap');
if ($olap->connect_error) die('OLAP connect failed: ' . $olap->connect_error);

$log[] = "✅ Connected to both databases";

// ============================================================
// STEP 1: Load dim_user
// Sync all users from echowall → dim_user
// ============================================================
$users = $oltp->query("SELECT user_ID, username, role, status, created_at FROM users");
$u_inserted = 0;
while ($row = $users->fetch_assoc()) {
    $id       = (int)$row['user_ID'];
    $username = $olap->real_escape_string($row['username']);
    $role     = $olap->real_escape_string($row['role']);
    $status   = $olap->real_escape_string($row['status']);
    $created  = $olap->real_escape_string($row['created_at']);

    $olap->query("
        INSERT INTO dim_user (source_user_id, username, role, status, created_at)
        VALUES ($id, '$username', '$role', '$status', '$created')
        ON DUPLICATE KEY UPDATE
            username = '$username',
            role     = '$role',
            status   = '$status'
    ");
    if ($olap->affected_rows > 0) $u_inserted++;
}
$log[] = "✅ dim_user: $u_inserted rows synced";

// ============================================================
// STEP 2: Load dim_time
// Generate one time row per unique date+hour from rants
// ============================================================
$times = $oltp->query("
    SELECT DISTINCT 
        DATE(created_at) as full_date,
        HOUR(created_at) as hour
    FROM rants
");
$t_inserted = 0;
while ($row = $times->fetch_assoc()) {
    $date     = $row['full_date'];
    $hour     = (int)$row['hour'];
    $ts       = strtotime($date);
    $dow      = date('l', $ts);
    $dom      = (int)date('j', $ts);
    $woy      = (int)date('W', $ts);
    $month    = (int)date('n', $ts);
    $mname    = date('F', $ts);
    $quarter  = (int)ceil($month / 3);
    $year     = (int)date('Y', $ts);
    $weekend  = in_array($dow, ['Saturday', 'Sunday']) ? 1 : 0;

    $olap->query("
        INSERT IGNORE INTO dim_time 
            (full_date, hour, day_of_week, day_of_month, week_of_year, month_num, month_name, quarter, year, is_weekend)
        VALUES 
            ('$date', $hour, '$dow', $dom, $woy, $month, '$mname', $quarter, $year, $weekend)
    ");
    if ($olap->affected_rows > 0) $t_inserted++;
}
$log[] = "✅ dim_time: $t_inserted rows inserted";

// ============================================================
// STEP 3: Load fact_rants
// One row per rant with all foreign keys resolved
// ============================================================
$rants = $oltp->query("
    SELECT 
        r.rant_ID,
        r.user_ID,
        r.anonymous,
        r.is_archived,
        r.repost_of_id,
        DATE(r.created_at)  as full_date,
        HOUR(r.created_at)  as hour,
        COUNT(DISTINCT rc.reaction_ID) as reaction_count,
        COUNT(DISTINCT c.comment_ID)   as comment_count
    FROM rants r
    LEFT JOIN reactions rc ON rc.rant_ID = r.rant_ID
    LEFT JOIN comments  c  ON c.rant_ID  = r.rant_ID
    GROUP BY r.rant_ID
");

$f_inserted = 0;
while ($row = $rants->fetch_assoc()) {
    $rant_id   = (int)$row['rant_ID'];
    $anon      = (int)$row['anonymous'];
    $archived  = (int)($row['is_archived'] ?? 0);
    $is_repost = $row['repost_of_id'] ? 1 : 0;
    $reactions = (int)$row['reaction_count'];
    $comments  = (int)$row['comment_count'];
    $date      = $row['full_date'];
    $hour      = (int)$row['hour'];

    // Get user_key
    $uq = $olap->query("SELECT user_key FROM dim_user WHERE source_user_id = {$row['user_ID']}");
    $uk = $uq->fetch_assoc();
    if (!$uk) continue;
    $user_key = (int)$uk['user_key'];

    // Get time_key
    $tq = $olap->query("SELECT time_key FROM dim_time WHERE full_date = '$date' AND hour = $hour");
    $tk = $tq->fetch_assoc();
    if (!$tk) continue;
    $time_key = (int)$tk['time_key'];

    // Get rant_type_key
    $rtq = $olap->query("SELECT rant_type_key FROM dim_rant_type WHERE is_anonymous = $anon AND is_archived = $archived");
    $rtk = $rtq->fetch_assoc();
    if (!$rtk) continue;
    $rant_type_key = (int)$rtk['rant_type_key'];

    $olap->query("
        INSERT INTO fact_rants 
            (source_rant_id, time_key, user_key, rant_type_key, reaction_count, comment_count, is_repost)
        VALUES 
            ($rant_id, $time_key, $user_key, $rant_type_key, $reactions, $comments, $is_repost)
        ON DUPLICATE KEY UPDATE
            reaction_count = $reactions,
            comment_count  = $comments
    ");
    if ($olap->affected_rows > 0) $f_inserted++;
}
$log[] = "✅ fact_rants: $f_inserted rows synced";

// ============================================================
// DONE
// ============================================================
$elapsed = round(microtime(true) - $start, 2);
$log[] = "⏱ ETL completed in {$elapsed}s";

$oltp->close();
$olap->close();

// Output result
header('Content-Type: text/html');
echo '<pre style="font-family:monospace; background:#111; color:#0f0; padding:2rem;">';
echo "ECHOWALL ETL — " . date('Y-m-d H:i:s') . "\n";
echo str_repeat("=", 40) . "\n";
foreach ($log as $line) echo $line . "\n";
echo '</pre>';
?>