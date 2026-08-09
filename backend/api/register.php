<?php
// backend/api/register.php
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

if(!empty($data->name) && !empty($data->email) && !empty($data->password)){
    $user->name = $data->name;
    $user->email = $data->email;
    $user->password = password_hash($data->password, PASSWORD_BCRYPT);
    $user->role = isset($data->role) ? $data->role : 'user';

    // Check if email exists
    $stmt = $user->login();
    if($stmt->rowCount() > 0) {
        http_response_code(400);
        echo json_encode(array("message" => "Email already exists.", "status" => "error"));
        exit();
    }

    $query = "INSERT INTO users SET name=:name, email=:email, password=:password, role=:role";
    $stmt = $db->prepare($query);
    
    $stmt->bindParam(":name", $user->name);
    $stmt->bindParam(":email", $user->email);
    $stmt->bindParam(":password", $user->password);
    $stmt->bindParam(":role", $user->role);

    if($stmt->execute()){
        http_response_code(201);
        echo json_encode(array("message" => "User was created.", "status" => "success"));
    } else {
        http_response_code(503);
        echo json_encode(array("message" => "Unable to create user.", "status" => "error"));
    }
} else {
    http_response_code(400);
    echo json_encode(array("message" => "Unable to create user. Data is incomplete.", "status" => "error"));
}
?>
