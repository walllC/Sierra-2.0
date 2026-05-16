<?php
$host = 'localhost';
$db   = 'echowall';
$user = 'root'; 
$pass = '';    

$conn = new mysqli($host, $user, $pass, $db);

if ($conn->connect_error) {
    die("Connection failed: " . $conn->connect_error);
}

// ✅ FIX: Enable full UTF-8 emoji support
$conn->set_charset("utf8mb4");

// ✅ Optional: Set default timezone
date_default_timezone_set('UTC');

?>