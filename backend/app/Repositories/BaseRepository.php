<?php

namespace App\Repositories;

use Core\Database;

abstract class BaseRepository
{
    protected Database $db;

    /** Concrete repositories may set these to enable generic CRUD. */
    protected string $table    = '';   // e.g. 'products'
    protected array  $fillable = [];   // whitelisted columns for create/update
    protected bool   $softDelete = false; // true if the table has deleted_at

    public function __construct(Database $db)
    {
        $this->db = $db;
    }

    /**
     * INSERT a row using only whitelisted $fillable columns.
     * Returns the new primary-key ID.
     */
    public function create(array $data): int
    {
        $this->requireTable(__METHOD__);
        $data = $this->onlyFillable($data);
        if (empty($data)) {
            throw new \RuntimeException("No fillable data provided for {$this->table}::create");
        }
        $cols = array_keys($data);
        $placeholders = array_map(fn($c) => ":{$c}", $cols);
        $sql = "INSERT INTO {$this->table} (" . implode(',', $cols) . ") VALUES (" . implode(',', $placeholders) . ")";
        $this->db->query($sql, $data);
        return (int) $this->db->lastInsertId();
    }

    /**
     * UPDATE by primary key using only whitelisted $fillable columns.
     * Returns true if the row was matched (row count > 0 not required —
     * MySQL returns 0 for a no-op update).
     */
    public function update(int $id, array $data): bool
    {
        $this->requireTable(__METHOD__);
        $data = $this->onlyFillable($data);
        if (empty($data)) return false;
        $sets = array_map(fn($c) => "{$c} = :{$c}", array_keys($data));
        $data['__id'] = $id;
        $sql = "UPDATE {$this->table} SET " . implode(', ', $sets) . " WHERE id = :__id";
        $this->db->query($sql, $data);
        return true;
    }

    /**
     * SELECT a single row by primary key. Respects soft-delete when enabled.
     */
    public function findById(int $id): ?array
    {
        $this->requireTable(__METHOD__);
        $where = "id = :id";
        if ($this->softDelete) $where .= " AND deleted_at IS NULL";
        $row = $this->db->query("SELECT * FROM {$this->table} WHERE {$where} LIMIT 1", ['id' => $id])->fetch();
        return $row ?: null;
    }

    /**
     * Soft-delete when $softDelete is true, otherwise hard DELETE.
     */
    public function softDelete(int $id): bool
    {
        $this->requireTable(__METHOD__);
        if ($this->softDelete) {
            $this->db->query("UPDATE {$this->table} SET deleted_at = NOW() WHERE id = :id", ['id' => $id]);
        } else {
            $this->db->query("DELETE FROM {$this->table} WHERE id = :id", ['id' => $id]);
        }
        return true;
    }

    /**
     * Simple paginated fetch. Concrete repos with joins/filters should keep
     * their own richer methods (e.g. ProductRepository::findAll); this exists
     * so ProductService::getAll() etc. don't crash when a repo doesn't
     * override it.
     */
    public function getAllPaginated(array $filters = [], int $page = 1, int $limit = 20): array
    {
        $this->requireTable(__METHOD__);
        $where = $this->softDelete ? "WHERE deleted_at IS NULL" : "";
        $sql = "SELECT * FROM {$this->table} {$where} ORDER BY id DESC";
        return $this->findWithPagination($sql, [], $page, $limit);
    }

    private function requireTable(string $method): void
    {
        if ($this->table === '') {
            // Fallback: derive from class name — ProductRepository → 'products'.
            // Handles regular pluralization for the schema names used in this ERP.
            $short = (new \ReflectionClass(static::class))->getShortName();
            $base  = preg_replace('/Repository$/', '', $short);
            $snake = strtolower(preg_replace('/([a-z])([A-Z])/', '$1_$2', $base));
            $this->table = $this->pluralize($snake);
        }
    }

    private function pluralize(string $word): string
    {
        // Small set of irregulars matching the curdun_erp schema.
        static $irregular = [
            'category' => 'categories',
            'tax'      => 'taxes',
            'branch'   => 'branches',
            'company'  => 'companies',
            'expense_category' => 'expense_categories',
            'currency' => 'currencies',
            'stock_movement'   => 'stock_movements',
            'purchase_order'   => 'purchase_orders',
            'purchase_order_item' => 'purchase_order_items',
            'order_item'       => 'order_items',
            'sales_return'     => 'sales_returns',
            'sales_return_item'=> 'sales_return_items',
            'invoice_item'     => 'invoice_items',
        ];
        if (isset($irregular[$word])) return $irregular[$word];
        if (preg_match('/(s|x|z|ch|sh)$/', $word)) return $word . 'es';
        if (preg_match('/[^aeiou]y$/', $word))     return substr($word, 0, -1) . 'ies';
        return $word . 's';
    }

    private function onlyFillable(array $data): array
    {
        if (empty($this->fillable)) return $data; // no whitelist → allow anything
        return array_intersect_key($data, array_flip($this->fillable));
    }

    protected function findWithPagination(string $sql, array $params, int $page, int $limit): array
    {
        $offset = ($page - 1) * $limit;
        
        $countSql = "SELECT COUNT(*) FROM (" . $sql . ") as count_table";
        $total = (int) $this->db->query($countSql, $params)->fetchColumn();
        
        $paginatedSql = $sql . " LIMIT " . (int)$limit . " OFFSET " . (int)$offset;
        $items = $this->db->query($paginatedSql, $params)->fetchAll();

        return [
            'items' => $items,
            'total' => $total
        ];
    }

    protected function buildSearchCondition(string $search, array $columns, array &$params): string
    {
        if (empty($search) || empty($columns)) {
            return "";
        }

        $conditions = [];
        $searchTerm = "%" . $search . "%";
        $paramKey = "search_" . uniqid();
        
        foreach ($columns as $column) {
            $conditions[] = "{$column} LIKE :{$paramKey}";
        }
        
        $params[$paramKey] = $searchTerm;
        
        return "(" . implode(" OR ", $conditions) . ")";
    }

    protected function buildStatusFilter(string $status, array &$params): string
    {
        if (empty($status)) {
            return "";
        }
        
        $paramKey = "status_" . uniqid();
        $params[$paramKey] = $status;
        return "status = :{$paramKey}";
    }

    protected function buildDateFilter(string $from, string $to, string $column, array &$params): string
    {
        $conditions = [];
        
        if (!empty($from)) {
            $paramKeyFrom = "date_from_" . uniqid();
            $conditions[] = "{$column} >= :{$paramKeyFrom}";
            $params[$paramKeyFrom] = $from . " 00:00:00";
        }
        
        if (!empty($to)) {
            $paramKeyTo = "date_to_" . uniqid();
            $conditions[] = "{$column} <= :{$paramKeyTo}";
            $params[$paramKeyTo] = $to . " 23:59:59";
        }
        
        return empty($conditions) ? "" : "(" . implode(" AND ", $conditions) . ")";
    }
}
