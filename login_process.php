<?php
session_start();
include 'database.php';

if ($_SERVER["REQUEST_METHOD"] == "POST") {
    // These names ('username' and 'password') must match the "name" attribute in your HTML inputs
    $username = mysqli_real_escape_string($conn, $_POST['username']);
    $password = $_POST['password']; 

    // Look for the user in the database
    $query = "SELECT * FROM users WHERE username = '$username' LIMIT 1";
    $result = mysqli_query($conn, $query);

    if (mysqli_num_rows($result) > 0) {
        $user = mysqli_fetch_assoc($result);

        // Check if password matches
        // Note: If you used password_hash() during signup, use password_verify() here
        if ($password === $user['password']) {
            
            // Set session variables so the website "remembers" you
            $_SESSION['user_ID'] = $user['user_ID'];
            $_SESSION['username'] = $user['username'];
            $_SESSION['role'] = $user['role'];

            // Redirect based on role
            if ($user['role'] === 'admin') {
                header("Location: admin.php");
            } else {
                header("Location: index.php");
            }
            exit();
        } else {
            // Wrong password
            header("Location: login.php?error=Invalid password");
            exit();
        }
    } else {
        // User doesn't exist
        header("Location: login.php?error=User not found");
        exit();
    }
}
?>