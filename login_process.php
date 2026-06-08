<?php
session_start();
include 'database.php';

if ($_SERVER["REQUEST_METHOD"] == "POST") {
    $username = trim($_POST['username']);
    $password = $_POST['password'];

    // Prepared statement - safe from SQL injection
    $stmt = $conn->prepare("SELECT * FROM users WHERE username = ? LIMIT 1");
    $stmt->bind_param("s", $username);
    $stmt->execute();
    $result = $stmt->get_result();

    if ($result->num_rows > 0) {
        $user = $result->fetch_assoc();

        // Check password using password_verify()
        if (password_verify($password, $user['password'])) {

            // Check if banned
            if ($user['status'] === 'banned') {
                header("Location: login.php?error=banned");
                exit();
            }

            // Set session
            $_SESSION['user_ID']  = $user['user_ID'];
            $_SESSION['username'] = $user['username'];
            $_SESSION['role']     = $user['role'];

            // Update last active
            $id = (int)$user['user_ID'];
            $conn->query("UPDATE users SET last_active_at = NOW() WHERE user_ID = $id");

            // Redirect
            if ($user['role'] === 'admin') {
                header("Location: admin.php");
            } else {
                header("Location: index.php");
            }
            exit();

        } else {
            header("Location: login.php?error=Invalid password");
            exit();
        }
    } else {
        header("Location: login.php?error=User not found");
        exit();
    }
}
?>