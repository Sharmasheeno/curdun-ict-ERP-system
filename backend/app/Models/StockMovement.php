<?php

namespace App\Models;

class StockMovement extends BaseModel
{
    protected string $table = 'stock_movements';
    protected array $fillable = [
        'product_id', 
        'warehouse_id', 
        'user_id', 
        'reference_type', 
        'reference_id', 
        'type', 
        'quantity', 
        'quantity_before', 
        'quantity_after', 
        'notes'
    ];

    public function getMovementsByProduct(int $productId, int $limit = 50): array
    {
        $sql = "SELECT * FROM {$this->table} WHERE product_id = :product_id ORDER BY created_at DESC LIMIT :limit";
        $stmt = $this->pdo()->prepare($sql);
        
        // PDO bindParam is safer for limit
        $stmt->bindValue(':product_id', $productId, \PDO::PARAM_INT);
        $stmt->bindValue(':limit', $limit, \PDO::PARAM_INT);
        
        $stmt->execute();
        return $stmt->fetchAll(\PDO::FETCH_ASSOC);
    }
}
