<?php

namespace App\Repositories;

class SettingsRepository extends BaseRepository
{
    public function findAll(?int $companyId = null): array
    {
        $params = [];
        $sql = "SELECT * FROM settings";
        
        if ($companyId !== null) {
            $sql .= " WHERE company_id = :company_id OR company_id IS NULL";
            $params['company_id'] = $companyId;
        } else {
            $sql .= " WHERE company_id IS NULL";
        }
        
        $sql .= " ORDER BY `key` ASC";
        
        return $this->db->query($sql, $params)->fetchAll();
    }

    public function getValue(string $key, ?int $companyId = null): mixed
    {
        $params = ['key' => $key];
        $sql = "SELECT value, type FROM settings WHERE `key` = :key";
        
        if ($companyId !== null) {
            $sql .= " AND (company_id = :company_id OR company_id IS NULL) ORDER BY company_id DESC LIMIT 1";
            $params['company_id'] = $companyId;
        } else {
            $sql .= " AND company_id IS NULL LIMIT 1";
        }
        
        $setting = $this->db->query($sql, $params)->fetch();
        
        if (!$setting) return null;
        
        $val = $setting['value'];
        if ($setting['type'] === 'json') return json_decode($val, true);
        if ($setting['type'] === 'boolean') return filter_var($val, FILTER_VALIDATE_BOOLEAN);
        if ($setting['type'] === 'integer') return (int) $val;
        if ($setting['type'] === 'float') return (float) $val;
        
        return $val;
    }

    public function setValue(string $key, mixed $value, ?int $companyId = null, string $type = 'string'): void
    {
        if (is_array($value) || is_object($value)) {
            $value = json_encode($value);
            $type = 'json';
        } elseif (is_bool($value)) {
            $value = $value ? '1' : '0';
            $type = 'boolean';
        }
        
        $sql = "INSERT INTO settings (`key`, value, company_id, type) 
                VALUES (:key, :value, :company_id, :type) 
                ON DUPLICATE KEY UPDATE value = VALUES(value), type = VALUES(type)";
                
        $this->db->query($sql, [
            'key' => $key,
            'value' => (string)$value,
            'company_id' => $companyId,
            'type' => $type
        ]);
    }

    public function setBulk(array $settings, ?int $companyId = null): void
    {
        $this->db->beginTransaction();
        try {
            foreach ($settings as $key => $data) {
                $val = is_array($data) && isset($data['value']) ? $data['value'] : $data;
                $type = is_array($data) && isset($data['type']) ? $data['type'] : 'string';
                
                $this->setValue($key, $val, $companyId, $type);
            }
            $this->db->commit();
        } catch (\Exception $e) {
            $this->db->rollBack();
            throw $e;
        }
    }
}
