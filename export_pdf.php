<?php
session_start();
if (!isset($_SESSION['user_ID']) || $_SESSION['role'] !== 'admin') {
    header("Location: login.php");
    exit();
}

require_once 'tcpdf/tcpdf.php';

// --- Connect to both DBs ---
$oltp = new mysqli('localhost', 'root', '', 'echowall');
$olap = new mysqli('localhost', 'root', '', 'echowall_olap');

// --- Fetch Summary Stats from OLTP ---
$stats = [];
$r = $oltp->query("SELECT COUNT(*) as total FROM users"); 
$stats['users'] = $r->fetch_assoc()['total'];

$r = $oltp->query("SELECT COUNT(*) as total FROM rants"); 
$stats['rants'] = $r->fetch_assoc()['total'];

$r = $oltp->query("SELECT COUNT(*) as total FROM rants WHERE DATE(created_at) = CURDATE()"); 
$stats['today'] = $r->fetch_assoc()['total'];

$r = $oltp->query("SELECT COUNT(*) as total FROM comments"); 
$stats['comments'] = $r->fetch_assoc()['total'];

$r = $oltp->query("SELECT COUNT(*) as total FROM users WHERE status = 'banned'"); 
$stats['banned'] = $r->fetch_assoc()['total'];

// --- Fetch Top Users from OLAP ---
$top_users = [];
$r = $olap->query("
    SELECT du.username, COUNT(*) as total
    FROM fact_rants fr
    JOIN dim_user du ON fr.user_key = du.user_key
    GROUP BY du.user_key
    ORDER BY total DESC
    LIMIT 5
");
while ($row = $r->fetch_assoc()) $top_users[] = $row;

// --- Fetch Rants per Day from OLAP ---
$rants_per_day = [];
$r = $olap->query("
    SELECT dt.full_date, dt.month_name, dt.year, COUNT(*) as total
    FROM fact_rants fr
    JOIN dim_time dt ON fr.time_key = dt.time_key
    GROUP BY dt.full_date
    ORDER BY dt.full_date DESC
    LIMIT 10
");
while ($row = $r->fetch_assoc()) $rants_per_day[] = $row;

// --- Fetch Anonymous Ratio from OLAP ---
$anon_data = [];
$r = $olap->query("
    SELECT drt.type_label, COUNT(*) as total
    FROM fact_rants fr
    JOIN dim_rant_type drt ON fr.rant_type_key = drt.rant_type_key
    GROUP BY drt.rant_type_key
");
while ($row = $r->fetch_assoc()) $anon_data[] = $row;

// --- Fetch Recent Rants from OLTP ---
$recent_rants = [];
$r = $oltp->query("
    SELECT r.content, u.username, r.anonymous, r.created_at,
           COUNT(DISTINCT rc.reaction_ID) as reactions,
           COUNT(DISTINCT c.comment_ID) as comments
    FROM rants r
    LEFT JOIN users u ON r.user_ID = u.user_ID
    LEFT JOIN reactions rc ON rc.rant_ID = r.rant_ID
    LEFT JOIN comments c ON c.rant_ID = r.rant_ID
    GROUP BY r.rant_ID
    ORDER BY r.created_at DESC
    LIMIT 10
");
while ($row = $r->fetch_assoc()) $recent_rants[] = $row;

// ============================================================
// BUILD PDF
// ============================================================
class EchowallPDF extends TCPDF {
    public function Header() {
        $this->SetFillColor(30, 20, 60);
        $this->Rect(0, 0, 220, 22, 'F');
        $this->SetFont('helvetica', 'B', 16);
        $this->SetTextColor(255, 255, 255);
        $this->SetXY(10, 5);
        $this->Cell(0, 12, 'EchoWall / RantBox — Analytics Report', 0, 1, 'L');
        $this->SetFont('helvetica', '', 9);
        $this->SetTextColor(180, 160, 220);
        $this->SetXY(10, 13);
        $this->Cell(0, 6, 'Generated: ' . date('F d, Y h:i A') . '  |  Admin: ' . $_SESSION['username'], 0, 1, 'L');
        $this->SetTextColor(0, 0, 0);
        $this->Ln(8);
    }
    public function Footer() {
        $this->SetY(-12);
        $this->SetFont('helvetica', 'I', 8);
        $this->SetTextColor(150, 150, 150);
        $this->Cell(0, 8, 'EchoWall Analytics  |  Page ' . $this->getAliasNumPage() . ' of ' . $this->getAliasNbPages() . '  |  Confidential', 0, 0, 'C');
    }
}

$pdf = new EchowallPDF('P', 'mm', 'A4', true, 'UTF-8');
$pdf->SetCreator('EchoWall Admin');
$pdf->SetAuthor($_SESSION['username']);
$pdf->SetTitle('EchoWall Analytics Report');
$pdf->SetMargins(12, 30, 12);
$pdf->SetAutoPageBreak(true, 20);
$pdf->AddPage();

// ── Section helper ──────────────────────────────────────────
function section_title($pdf, $title) {
    $pdf->SetFillColor(124, 58, 237);
    $pdf->SetTextColor(255, 255, 255);
    $pdf->SetFont('helvetica', 'B', 11);
    $pdf->Cell(0, 8, $title, 0, 1, 'L', true);
    $pdf->SetTextColor(0, 0, 0);
    $pdf->Ln(2);
}

function table_header($pdf, $cols, $widths) {
    $pdf->SetFillColor(240, 235, 255);
    $pdf->SetTextColor(60, 40, 100);
    $pdf->SetFont('helvetica', 'B', 9);
    foreach ($cols as $i => $col) {
        $pdf->Cell($widths[$i], 7, $col, 1, 0, 'C', true);
    }
    $pdf->Ln();
    $pdf->SetTextColor(0, 0, 0);
    $pdf->SetFont('helvetica', '', 9);
}

// ── 1. Summary Stats ────────────────────────────────────────
section_title($pdf, '  1. Platform Overview');

$pdf->SetFont('helvetica', '', 10);
$items = [
    ['Total Users', $stats['users']],
    ['Total Rants', $stats['rants']],
    ['Rants Today', $stats['today']],
    ['Total Comments', $stats['comments']],
    ['Banned Users', $stats['banned']],
];

$x = 12; $y = $pdf->GetY();
$col_w = 90; $row_h = 10;
foreach ($items as $i => $item) {
    $cx = ($i % 2 === 0) ? $x : $x + $col_w + 6;
    if ($i % 2 === 0 && $i > 0) $y += $row_h;
    $pdf->SetXY($cx, $y);
    $pdf->SetFillColor(245, 240, 255);
    $pdf->SetDrawColor(200, 180, 240);
    $pdf->Cell($col_w, $row_h, '  ' . $item[0] . ': ' . $item[1], 1, 0, 'L', true);
}
$pdf->Ln($row_h + 6);

// ── 2. Anonymous vs Named ───────────────────────────────────
section_title($pdf, '  2. Rant Type Breakdown (OLAP)');
table_header($pdf, ['Type', 'Count'], [130, 56]);
$fill = false;
foreach ($anon_data as $row) {
    $pdf->SetFillColor($fill ? 250 : 255, $fill ? 248 : 255, $fill ? 255 : 255);
    $pdf->Cell(130, 7, $row['type_label'], 1, 0, 'L', $fill);
    $pdf->Cell(56, 7, $row['total'], 1, 1, 'C', $fill);
    $fill = !$fill;
}
$pdf->Ln(4);

// ── 3. Top Active Users ─────────────────────────────────────
section_title($pdf, '  3. Top 5 Most Active Users (OLAP)');
table_header($pdf, ['Rank', 'Username', 'Rant Count'], [20, 130, 36]);
$fill = false;
foreach ($top_users as $i => $row) {
    $pdf->SetFillColor($fill ? 250 : 255, $fill ? 248 : 255, $fill ? 255 : 255);
    $pdf->Cell(20,  7, $i + 1,           1, 0, 'C', $fill);
    $pdf->Cell(130, 7, '@' . $row['username'], 1, 0, 'L', $fill);
    $pdf->Cell(36,  7, $row['total'],    1, 1, 'C', $fill);
    $fill = !$fill;
}
$pdf->Ln(4);

// ── 4. Rants Per Day ────────────────────────────────────────
section_title($pdf, '  4. Rants Per Day — Last 10 Days (OLAP)');
table_header($pdf, ['Date', 'Month', 'Year', 'Rant Count'], [50, 60, 40, 36]);
$fill = false;
foreach ($rants_per_day as $row) {
    $pdf->SetFillColor($fill ? 250 : 255, $fill ? 248 : 255, $fill ? 255 : 255);
    $pdf->Cell(50, 7, $row['full_date'],   1, 0, 'C', $fill);
    $pdf->Cell(60, 7, $row['month_name'],  1, 0, 'C', $fill);
    $pdf->Cell(40, 7, $row['year'],        1, 0, 'C', $fill);
    $pdf->Cell(36, 7, $row['total'],       1, 1, 'C', $fill);
    $fill = !$fill;
}
$pdf->Ln(4);

// ── 5. Recent Rants ─────────────────────────────────────────
section_title($pdf, '  5. Recent Rants (Last 10)');
table_header($pdf, ['User', 'Content', 'Anon', 'Reactions', 'Date'], [30, 90, 15, 20, 31]);
$fill = false;
foreach ($recent_rants as $row) {
    $content = mb_strimwidth($row['content'], 0, 55, '...');
    $anon    = $row['anonymous'] ? 'Yes' : 'No';
    $date    = date('m/d H:i', strtotime($row['created_at']));i
    $user    = $row['anonymous'] ? 'Anon' : '@' . $row['username'];
    $pdf->SetFillColor($fill ? 250 : 255, $fill ? 248 : 255, $fill ? 255 : 255);
    $pdf->Cell(30, 7, $user,             1, 0, 'L', $fill);
    $pdf->Cell(90, 7, $content,          1, 0, 'L', $fill);
    $pdf->Cell(15, 7, $anon,             1, 0, 'C', $fill);
    $pdf->Cell(20, 7, $row['reactions'], 1, 0, 'C', $fill);
    $pdf->Cell(31, 7, $date,             1, 1, 'C', $fill);
    $fill = !$fill;
}

// ── Output PDF ──────────────────────────────────────────────
$pdf->Output('echowall_report_' . date('Y-m-d') . '.pdf', 'D');
?>