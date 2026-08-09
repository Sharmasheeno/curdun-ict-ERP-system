<?php
// backend/api/pharmacy/medicines.php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: GET, POST");
header("Access-Control-Max-Age: 3600");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

include_once '../../config/database.php';
include_once '../../models/Pharmacy.php';

$database = new Database();
$db = $database->getConnection();
$pharmacy = new Pharmacy($db);

$method = $_SERVER['REQUEST_METHOD'];

if ($method == 'GET') {
    $stmt = $pharmacy->read();
    $num = $stmt->rowCount();

    if($num > 0) {
        $medicines_arr = array();
        $medicines_arr["records"] = array();

        while ($row = $stmt->fetch(PDO::FETCH_ASSOC)){
            extract($row);
            $medicine_item = array(
                "id" => $id,
                "name" => $name,
                "category" => $category,
                "quantity" => $quantity,
                "price" => $price,
                "expiry_date" => $expiry_date,
                "created_at" => $created_at
            );
            array_push($medicines_arr["records"], $medicine_item);
        }
        http_response_code(200);
        echo json_encode($medicines_arr);
    } else {
        http_response_code(404);
        echo json_encode(array("message" => "No medicines found."));
    }
} elseif ($method == 'POST') {
    $data = json_decode(file_get_contents("php://input"));

    if(!empty($data->name) && !empty($data->price)) {
        $pharmacy->name = $data->name;
        $pharmacy->category = isset($data->category) ? $data->category : null;
        $pharmacy->quantity = isset($data->quantity) ? $data->quantity : 0;
        $pharmacy->price = $data->price;
        $pharmacy->expiry_date = isset($data->expiry_date) ? $data->expiry_date : null;

        if($pharmacy->create()) {
            http_response_code(201);
            echo json_encode(array("message" => "Medicine created successfully.", "status" => "success"));
        } else {
            http_response_code(503);
            echo json_encode(array("message" => "Unable to create medicine.", "status" => "error"));
        }
    } else {
        http_response_code(400);
        echo json_encode(array("message" => "Unable to create medicine. Incomplete data.", "status" => "error"));
    }
} else {
    http_response_code(405);
    echo json_encode(array("message" => "Method not allowed."));
}
?>
