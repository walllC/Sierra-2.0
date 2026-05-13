<?php
session_start();
require_once 'database.php';
header('Content-Type: application/json');

if (!isset($_SESSION['user_ID'])) {
    echo json_encode(['success' => false, 'message' => 'Unauthorized']);
    exit();
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $user_id = $_SESSION['user_ID'];
    $content = isset($_POST['content']) ? trim($_POST['content']) : '';
    $anonymous = isset($_POST['anonymous']) ? filter_var($_POST['anonymous'], FILTER_VALIDATE_BOOLEAN) : false;

    if (empty($content)) {
        echo json_encode(['success' => false, 'message' => 'Rant content cannot be empty']);
        exit();
    }

    try {
        $hasAnon = false;
        $hasCreatedAt = false;
        $colResult = $conn->query("SHOW COLUMNS FROM rants LIKE 'anonymous'");
        if ($colResult && $colResult->num_rows > 0) {
            $hasAnon = true;
        }
        $colResult = $conn->query("SHOW COLUMNS FROM rants LIKE 'created_at'");
        if ($colResult && $colResult->num_rows > 0) {
            $hasCreatedAt = true;
        }

        if ($hasAnon && $hasCreatedAt) {
            $query = "INSERT INTO rants (user_ID, content, anonymous, created_at) VALUES (?, ?, ?, ?)";
            $stmt = $conn->prepare($query);
            $createdAt = date('Y-m-d H:i:s');
            $stmt->bind_param("isis", $user_id, $content, $anonymous, $createdAt);
        } elseif ($hasAnon) {
            $query = "INSERT INTO rants (user_ID, content, anonymous) VALUES (?, ?, ?)";
            $stmt = $conn->prepare($query);
            $stmt->bind_param("isi", $user_id, $content, $anonymous);
        } elseif ($hasCreatedAt) {
            $query = "INSERT INTO rants (user_ID, content, created_at) VALUES (?, ?, ?)";
            $stmt = $conn->prepare($query);
            $createdAt = date('Y-m-d H:i:s');
            $stmt->bind_param("iss", $user_id, $content, $createdAt);
        } else {
            $query = "INSERT INTO rants (user_ID, content) VALUES (?, ?)";
            $stmt = $conn->prepare($query);
            $stmt->bind_param("is", $user_id, $content);
        }

        if ($stmt->execute()) {
            $rant_id = $stmt->insert_id;
            echo json_encode([
                'success' => true,
                'message' => 'Rant posted successfully',
                'rant_id' => $rant_id,
                'rant' => [
                    'rant_ID' => $rant_id,
                    'user_ID' => $user_id,
                    'content' => $content,
                    'anonymous' => $hasAnon ? $anonymous : false,
                    'created_at' => date('c'),
                    'username' => $_SESSION['username']
                ]
            ]);
        } else {
            echo json_encode(['success' => false, 'message' => $conn->error]);
        }
    } catch (Exception $e) {
        echo json_encode(['success' => false, 'message' => $e->getMessage()]);
    }
}
?>
