<?php
// backend/api/login.php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: POST");
header("Access-Control-Max-Age: 3600");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

include_once '../config/database.php';
include_once '../models/User.php';

$database = new Database();
$db = $database->getConnection();

$user = new User($db);

$data = json_decode(file_get_contents("php://input"));

if(!empty($data->email) && !empty($data->password)){
    $user->email = $data->email;
    $stmt = $user->login();
    $num = $stmt->rowCount();

    if($num > 0){
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        $id = $row['id'];
        $name = $row['name'];
        $password_hash = $row['password'];
        $role = $row['role'];

        if(password_verify($data->password, $password_hash)){
            // Successful login
            echo json_encode(array(
                "message" => "Login successful.",
                "status" => "success",
                "user" => array(
                    "id" => $id,
                    "name" => $name,
                    "email" => $user->email,
                    "role" => $role
                )
            ));
        } else {
            http_response_code(401);
            echo json_encode(array("message" => "Login failed. Incorrect password.", "status" => "error"));
        }
    } else {
        http_response_code(401);
        echo json_encode(array("message" => "Login failed. User not found.", "status" => "error"));
    }
} else {
    http_response_code(400);
    echo json_encode(array("message" => "Incomplete data. Provide email and password.", "status" => "error"));
}
?>
