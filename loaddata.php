<?php
$servername = "localhost";
$username = "root";
$password = "CoyDiva1";
$myDB = "BoothLayout";

try {
    $conn = new PDO("mysql:host=$servername;dbname=$myDB", $username, $password);
    // set the PDO error mode to exception
    $conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $stmt = $conn->prepare("SELECT * FROM booths"); 
    $stmt->execute();
    $result = $stmt->fetchAll();
    $json_string = json_encode($result);
    echo $json_string;

}
catch(PDOException $e) {
    echo "Connection failed: " . $e->getMessage();
}
?>