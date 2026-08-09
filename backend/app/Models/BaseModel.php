<?php

namespace App\Models;

use Core\Database;

abstract class BaseModel
{
    protected Database $db;
    protected string $table;
    protected array $fillable = [];
    protected array $hidden = [];
    protected bool $softDelete = false;
    protected string $primaryKey = 'id';

    public function __construct(Database $db)
    {
        $this->db = $db;
    }

    /**
     * Get the PDO connection. Assuming Database class either extends PDO or has a getConnection method.
     */
    protected function pdo(): \PDO
    {
        if (method_exists($this->db, 'getConnection')) {
            return $this->db->getConnection();
        }
        return $this->db;
    }

    public function findById(int $id): ?array
    {
        $sql = "SELECT * FROM {$this->table} WHERE {$this->primaryKey} = :id";
        if ($this->softDelete) {
            $sql .= " AND deleted_at IS NULL";
        }
        $stmt = $this->pdo()->prepare($sql);
        $stmt->execute(['id' => $id]);
        $row = $stmt->fetch(\PDO::FETCH_ASSOC);

        return $row ? $this->hideFields($row) : null;
    }

    public function findAll(array $conditions = [], string $orderBy = 'created_at DESC', int $limit = 0, int $offset = 0): array
    {
        $sql = "SELECT * FROM {$this->table}";
        
        if ($this->softDelete) {
            $conditions['deleted_at'] = null;
        }

        $where = $this->buildWhereClause($conditions);
        if ($where['clause'] !== '') {
            $sql .= " WHERE " . $where['clause'];
        }

        $sql .= " ORDER BY {$orderBy}";

        if ($limit > 0) {
            $sql .= " LIMIT " . (int)$limit . " OFFSET " . (int)$offset;
        }

        $stmt = $this->pdo()->prepare($sql);
        $stmt->execute($where['params']);
        $rows = $stmt->fetchAll(\PDO::FETCH_ASSOC);

        return $this->hideFieldsFromAll($rows);
    }

    public function create(array $data): int
    {
        $filtered = $this->filterFillable($data);
        if (empty($filtered)) {
            return 0;
        }

        $columns = array_keys($filtered);
        $placeholders = array_map(fn($col) => ':' . $col, $columns);

        $sql = "INSERT INTO {$this->table} (" . implode(', ', $columns) . ") VALUES (" . implode(', ', $placeholders) . ")";
        $stmt = $this->pdo()->prepare($sql);
        $stmt->execute($filtered);

        return (int) $this->pdo()->lastInsertId();
    }

    public function update(int $id, array $data): bool
    {
        $filtered = $this->filterFillable($data);
        if (empty($filtered)) {
            return false;
        }

        $setParts = [];
        foreach ($filtered as $key => $value) {
            $setParts[] = "{$key} = :{$key}";
        }

        $sql = "UPDATE {$this->table} SET " . implode(', ', $setParts) . " WHERE {$this->primaryKey} = :id";
        if ($this->softDelete) {
            $sql .= " AND deleted_at IS NULL";
        }

        $filtered['id'] = $id;
        $stmt = $this->pdo()->prepare($sql);
        return $stmt->execute($filtered);
    }

    public function delete(int $id): bool
    {
        if ($this->softDelete) {
            return $this->softDelete($id);
        }

        $sql = "DELETE FROM {$this->table} WHERE {$this->primaryKey} = :id";
        $stmt = $this->pdo()->prepare($sql);
        return $stmt->execute(['id' => $id]);
    }

    public function softDelete(int $id): bool
    {
        $sql = "UPDATE {$this->table} SET deleted_at = NOW() WHERE {$this->primaryKey} = :id";
        $stmt = $this->pdo()->prepare($sql);
        return $stmt->execute(['id' => $id]);
    }

    public function restore(int $id): bool
    {
        $sql = "UPDATE {$this->table} SET deleted_at = NULL WHERE {$this->primaryKey} = :id";
        $stmt = $this->pdo()->prepare($sql);
        return $stmt->execute(['id' => $id]);
    }

    public function count(array $conditions = []): int
    {
        $sql = "SELECT COUNT(*) FROM {$this->table}";

        if ($this->softDelete) {
            $conditions['deleted_at'] = null;
        }

        $where = $this->buildWhereClause($conditions);
        if ($where['clause'] !== '') {
            $sql .= " WHERE " . $where['clause'];
        }

        $stmt = $this->pdo()->prepare($sql);
        $stmt->execute($where['params']);
        
        return (int) $stmt->fetchColumn();
    }

    public function exists(int $id): bool
    {
        $sql = "SELECT 1 FROM {$this->table} WHERE {$this->primaryKey} = :id";
        if ($this->softDelete) {
            $sql .= " AND deleted_at IS NULL";
        }

        $stmt = $this->pdo()->prepare($sql);
        $stmt->execute(['id' => $id]);
        return (bool) $stmt->fetchColumn();
    }

    protected function hideFields(array $row): array
    {
        foreach ($this->hidden as $field) {
            if (array_key_exists($field, $row)) {
                unset($row[$field]);
            }
        }
        return $row;
    }

    protected function hideFieldsFromAll(array $rows): array
    {
        return array_map([$this, 'hideFields'], $rows);
    }

    protected function filterFillable(array $data): array
    {
        return array_intersect_key($data, array_flip($this->fillable));
    }

    protected function buildWhereClause(array $conditions): array
    {
        $clauses = [];
        $params = [];
        $index = 0;

        foreach ($conditions as $field => $value) {
            $paramName = "p" . $index;
            if ($value === null) {
                $clauses[] = "{$field} IS NULL";
            } else {
                $clauses[] = "{$field} = :{$paramName}";
                $params[$paramName] = $value;
            }
            $index++;
        }

        return [
            'clause' => implode(' AND ', $clauses),
            'params' => $params
        ];
    }
}
