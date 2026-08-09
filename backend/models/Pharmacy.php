<?php
// backend/models/Pharmacy.php
class Pharmacy {
    private $conn;
    private $table_name = "pharmacy_medicines";

    public $id;
    public $name;
    public $category;
    public $quantity;
    public $price;
    public $expiry_date;
    public $created_at;

    public function __construct($db) {
        $this->conn = $db;
    }

    // Read all medicines
    function read() {
        $query = "SELECT * FROM " . $this->table_name . " ORDER BY created_at DESC";
        $stmt = $this->conn->prepare($query);
        $stmt->execute();
        return $stmt;
    }

    // Create a new medicine
    function create() {
        $query = "INSERT INTO " . $this->table_name . " SET name=:name, category=:category, quantity=:quantity, price=:price, expiry_date=:expiry_date";
        $stmt = $this->conn->prepare($query);

        $this->name = htmlspecialchars(strip_tags($this->name));
        $this->category = htmlspecialchars(strip_tags($this->category));
        $this->quantity = htmlspecialchars(strip_tags($this->quantity));
        $this->price = htmlspecialchars(strip_tags($this->price));
        $this->expiry_date = htmlspecialchars(strip_tags($this->expiry_date));

        $stmt->bindParam(":name", $this->name);
        $stmt->bindParam(":category", $this->category);
        $stmt->bindParam(":quantity", $this->quantity);
        $stmt->bindParam(":price", $this->price);
        $stmt->bindParam(":expiry_date", $this->expiry_date);

        if($stmt->execute()) {
            return true;
        }
        return false;
    }
}
?>
