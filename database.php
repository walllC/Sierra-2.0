<?php
$host = 'localhost';
$db   = 'echowall';
$user = 'root'; // Palitan mo ito kung iba ang username mo
$pass = '';     // Default ay walang password sa XAMPP

$conn = new mysqli($host, $user, $pass, $db);

if ($conn->connect_error) {
    die("Connection failed: " . $conn->connect_error);
}
?>