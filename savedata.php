<?php
$servername = "localhost";
$username = "root";
$password = "CoyDiva1";
$myDB = "BoothLayout";

try {

    $conn = new PDO("mysql:host=$servername;dbname=$myDB", $username, $password);
    // set the PDO error mode to exception
    $conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    // echo "Connected successfully";

    // read POST data
    $data = json_decode($_POST['json_string'], true);
    // var_dump($data);
    // $json_string="{\"new\":[{\"id\":1,\"x\":-0.5,\"y\":-0.4,\"w\":0.2,\"h\":0.2,\"vendor\":\"\"},{\"id\":2,\"x\":0.1,\"y\":-0.4,\"w\":0.2,\"h\":0.2,\"vendor\":\"\"},{\"id\":3,\"x\":-0.2,\"y\":-0.4,\"w\":0.2,\"h\":0.2,\"vendor\":\"Scott\"}],\"changed\":[]}";
    // $data = json_decode($json_string, true);
    // var_dump($data["new"]);
    //var_dump($data->changed);
    //die();
    // prepare sql and bind parameters for insertion
    $stmt_insert = $conn->prepare("INSERT INTO booths (id, x, y, width, height, vendor) 
    VALUES (:id, :x, :y, :w, :h, :v)");
    $stmt_insert->bindParam(':id', $id, PDO::PARAM_INT, 11);
    $stmt_insert->bindParam(':x', $x, PDO::PARAM_STR, 20);
    $stmt_insert->bindParam(':y', $y, PDO::PARAM_STR, 20); 
    $stmt_insert->bindParam(':w', $width, PDO::PARAM_STR, 20);
    $stmt_insert->bindParam(':h', $height, PDO::PARAM_STR, 20);
    $stmt_insert->bindParam(':v', $vendor, PDO::PARAM_STR, 255); 

    //Update test
    // $json_string="{\"new\":[],\"changed\":[{\"id\":1,\"x\":0.7,\"y\":0.6,\"w\":0.2,\"h\":0.2,\"vendor\":\"Tyler\"}]}";
    // $data = json_decode($json_string, true);
    // var_dump($data);
    // $id = 4;
    // $x = "0.6";
    // $y = "0.0";
    // $width = "0.2";
    // $height = "0.4";
    // $vendor = "Herbie";

    // $stmt_insert->execute();
    // echo "Stuff should be in the table";
    $new = $data["new"];
    $len = count($new);

    for ($i = 0; $i < $len; $i++) {
        $id = $new[$i]["id"];
        var_dump($id);
        $x = $new[$i]["x"];
        var_dump($x);
        $y = $new[$i]["y"];
        var_dump($y);
        $width = $new[$i]["w"];
        var_dump($width);
        $height = $new[$i]["h"];
        var_dump($height);
        $vendor = $new[$i]["vendor"];

        $stmt_insert->execute();
    }

    // prepare sql and bind parameters for update
    $stmt_update = $conn->prepare("Update booths SET x = :x, 
        y = :y, width = :w, height = :h, vendor = :v
        WHERE id = :id");
    $stmt_update->bindParam(':id', $idc, PDO::PARAM_INT, 11);
    $stmt_update->bindParam(':x', $xc, PDO::PARAM_STR, 20);
    $stmt_update->bindParam(':y', $yc, PDO::PARAM_STR, 20); 
    $stmt_update->bindParam(':w', $widthc, PDO::PARAM_STR, 20);
    $stmt_update->bindParam(':h', $heightc, PDO::PARAM_STR, 20);
    $stmt_update->bindParam(':v', $vendorc, PDO::PARAM_STR, 255); 

    $changed = $data["changed"];
    $len = count($changed);

    for($i = 0; $i < $len; $i++) {
        $idc = $changed[$i]["id"];
        $xc = $changed[$i]["x"];
        $yc = $changed[$i]["y"];
        $widthc = $changed[$i]["w"];
        $heightc = $changed[$i]["h"];
        $vendorc = $changed[$i]["vendor"];

        $stmt_update->execute();
    }
}
catch(PDOException $e) {
    echo "Connection failed: " . $e->getMessage();
}
?>