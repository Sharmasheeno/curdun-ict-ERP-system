<?php

namespace App\Repositories;

class ProductRepository extends BaseRepository
{
    protected string $table = 'products';
    protected bool   $softDelete = true;
    protected array  $fillable = [
        'company_id','category_id','unit_id','tax_id',
        'sku','barcode','name','description',
        'purchase_price','selling_price','wholesale_price',
        'minimum_stock','current_stock','image','status',
    ];

    public function findAll(array $filters = [], int $page = 1, int $limit = 20): array
    {
        $params = [];
        $where = [];

        if (!empty($filters['search'])) {
            $searchCond = $this->buildSearchCondition($filters['search'], ['p.name', 'p.sku', 'p.barcode'], $params);
            if ($searchCond) $where[] = $searchCond;
        }

        if (!empty($filters['category_id'])) {
            $where[] = "p.category_id = :category_id";
            $params['category_id'] = $filters['category_id'];
        }

        if (!empty($filters['status'])) {
            $where[] = "p.status = :status";
            $params['status'] = $filters['status'];
        }

        $whereClause = empty($where) ? "" : "WHERE " . implode(" AND ", $where);
        
        $sql = "SELECT p.*, c.name as category_name, u.name as unit_name 
                FROM products p 
                LEFT JOIN categories c ON p.category_id = c.id 
                LEFT JOIN units u ON p.unit_id = u.id 
                {$whereClause} 
                ORDER BY p.name ASC";

        return $this->findWithPagination($sql, $params, $page, $limit);
    }

    public function findBySku(string $sku): mixed
    {
        return $this->db->query("SELECT * FROM products WHERE sku = :sku", ['sku' => $sku])->fetch();
    }

    public function findByBarcode(string $barcode): mixed
    {
        return $this->db->query("SELECT * FROM products WHERE barcode = :barcode", ['barcode' => $barcode])->fetch();
    }

    public function updateStock(int $productId, float $newQuantity): bool
    {
        return (bool) $this->db->query(
            "UPDATE products SET current_stock = :stock WHERE id = :id", 
            ['stock' => $newQuantity, 'id' => $productId]
        );
    }

    public function checkSkuExists(string $sku, int $excludeId = 0): bool
    {
        $sql = "SELECT COUNT(*) FROM products WHERE sku = :sku AND id != :exclude_id";
        return (bool)$this->db->query($sql, ['sku' => $sku, 'exclude_id' => $excludeId])->fetchColumn();
    }
}
