<?php

namespace App\Models;

class Setting extends BaseModel
{
    protected string $table = 'settings';
    protected array $fillable = [
        'company_id', 
        'key', 
        'value', 
        'type'
    ];

    public function getValue(string $key, ?int $companyId = null, mixed $default = null): mixed
    {
        $sql = "SELECT value, type FROM {$this->table} WHERE `key` = :key";
        $params = ['key' => $key];

        if ($companyId !== null) {
            $sql .= " AND company_id = :company_id";
            $params['company_id'] = $companyId;
        } else {
            $sql .= " AND company_id IS NULL";
        }

        $stmt = $this->pdo()->prepare($sql);
        $stmt->execute($params);
        $row = $stmt->fetch(\PDO::FETCH_ASSOC);

        if (!$row) {
            return $default;
        }

        $value = $row['value'];
        $type = $row['type'];

        return match ($type) {
            'int', 'integer' => (int) $value,
            'float', 'double' => (float) $value,
            'bool', 'boolean' => filter_var($value, FILTER_VALIDATE_BOOLEAN),
            'json', 'array' => json_decode($value, true),
            default => $value,
        };
    }

    public function setValue(string $key, mixed $value, ?int $companyId = null, string $type = 'string'): bool
    {
        $stringValue = is_array($value) ? json_encode($value) : (string) $value;

        // Check if exists
        $sqlCheck = "SELECT id FROM {$this->table} WHERE `key` = :key";
        $paramsCheck = ['key' => $key];
        
        if ($companyId !== null) {
            $sqlCheck .= " AND company_id = :company_id";
            $paramsCheck['company_id'] = $companyId;
        } else {
            $sqlCheck .= " AND company_id IS NULL";
        }

        $stmtCheck = $this->pdo()->prepare($sqlCheck);
        $stmtCheck->execute($paramsCheck);
        $existingId = $stmtCheck->fetchColumn();

        if ($existingId) {
            return $this->update((int) $existingId, [
                'value' => $stringValue,
                'type' => $type
            ]);
        }

        return (bool) $this->create([
            'company_id' => $companyId,
            'key' => $key,
            'value' => $stringValue,
            'type' => $type
        ]);
    }
}
