<?php

namespace App\Models;

class Product extends BaseModel
{
    protected string $table = 'products';
    protected bool $softDelete = true;
    protected array $fillable = [
        'company_id', 
        'category_id', 
        'unit_id', 
        'tax_id', 
        'sku', 
        'barcode', 
        'name', 
        'description', 
        'purchase_price',
        'selling_price',
        'wholesale_price',
        'minimum_stock',
        'current_stock', 
        'image', 
        'status'
    ];

    public function isLowStock(int $id): bool
    {
        $sql = "SELECT current_stock, minimum_stock FROM {$this->table} WHERE id = :id";
        $stmt = $this->pdo()->prepare($sql);
        $stmt->execute(['id' => $id]);
        $row = $stmt->fetch(\PDO::FETCH_ASSOC);

        if ($row) {
            return (float)$row['current_stock'] <= (float)$row['minimum_stock'];
        }

        return false;
    }

    public function adjustStock(int $id, float $quantity): bool
    {
        $sql = "UPDATE {$this->table} SET current_stock = current_stock + :qty WHERE id = :id";
        $stmt = $this->pdo()->prepare($sql);
        return $stmt->execute(['qty' => $quantity, 'id' => $id]);
    }

    public function lockForUpdate(int $id): ?array
    {
        $sql = "SELECT * FROM {$this->table} WHERE id = :id FOR UPDATE";
        $stmt = $this->pdo()->prepare($sql);
        $stmt->execute(['id' => $id]);
        $row = $stmt->fetch(\PDO::FETCH_ASSOC);

        return $row ? $this->hideFields($row) : null;
    }
}
