<?php
$servername = "127.0.0.1";
$username = "root";
$password = "CoyDiva1";
$myDB = "BoothLayout";

try {
    $conn = new PDO("mysql:host=$servername;dbname=$myDB", $username, $password);
    // set the PDO error mode to exception
    $conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    // read POST data
    $data = json_decode($_POST['json_string'], true);

    // prepare sql and bind parameters for insertion
    $stmt_insert = $conn->prepare("INSERT INTO booths (id, x, y, width, height, vendor, boothType) 
    VALUES (:id, :x, :y, :w, :h, :v, :t)");
    $stmt_insert->bindParam(':id', $id, PDO::PARAM_INT, 11);
    $stmt_insert->bindParam(':x', $x, PDO::PARAM_STR, 20);
    $stmt_insert->bindParam(':y', $y, PDO::PARAM_STR, 20); 
    $stmt_insert->bindParam(':w', $width, PDO::PARAM_STR, 20);
    $stmt_insert->bindParam(':h', $height, PDO::PARAM_STR, 20);
    $stmt_insert->bindParam(':v', $vendor, PDO::PARAM_STR, 255); 
    $stmt_insert->bindParam(':t', $type, PDO::PARAM_INT, 11);

    $new = $data["new"];
    $len = count($new);

    // insert
    for ($i = 0; $i < $len; $i++) {
        $id = $new[$i]["id"];
        $x = $new[$i]["x"];
        $y = $new[$i]["y"];
        $width = $new[$i]["w"];
        $height = $new[$i]["h"];
        $vendor = $new[$i]["vendor"];
        $type = $new[$i]["type"];

        $stmt_insert->execute();
    }

    // prepare sql and bind parameters for update
    $stmt_update = $conn->prepare("Update booths SET x = :x, 
        y = :y, width = :w, height = :h, vendor = :v, boothType = :t
        WHERE id = :id");
    $stmt_update->bindParam(':id', $idc, PDO::PARAM_INT, 11);
    $stmt_update->bindParam(':x', $xc, PDO::PARAM_STR, 20);
    $stmt_update->bindParam(':y', $yc, PDO::PARAM_STR, 20); 
    $stmt_update->bindParam(':w', $widthc, PDO::PARAM_STR, 20);
    $stmt_update->bindParam(':h', $heightc, PDO::PARAM_STR, 20);
    $stmt_update->bindParam(':v', $vendorc, PDO::PARAM_STR, 255); 
    $stmt_update->bindParam(':t', $typec, PDO::PARAM_INT, 11);

    $changed = $data["changed"];
    $len = count($changed);

    // update
    for($i = 0; $i < $len; $i++) {
        $idc = $changed[$i]["id"];
        $xc = $changed[$i]["x"];
        $yc = $changed[$i]["y"];
        $widthc = $changed[$i]["w"];
        $heightc = $changed[$i]["h"];
        $vendorc = $changed[$i]["vendor"];
        $typec = $changed[$i]["type"];

        $stmt_update->execute();
    }

    // prepare sql and bind parameter for delete
    $stmt_delete = $conn->prepare("DELETE FROM booths WHERE id = :id");
    $stmt_delete->bindParam(':id', $idd, PDO::PARAM_INT, 11);

    $delete = $data["deleted"];
    $len = count($delete);

    // delete
    for($i = 0; $i < $len; $i++) {
        $idd = $delete[$i]["id"];
        $stmt_delete->execute();
    }
}
catch(PDOException $e) {
    echo "Connection failed: " . $e->getMessage();
}
?>