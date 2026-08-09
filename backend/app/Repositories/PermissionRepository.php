<?php

namespace App\Repositories;

class PermissionRepository extends BaseRepository
{
    public function findAll(string $module = ''): array
    {
        if ($module) {
            return $this->db->query(
                "SELECT * FROM permissions WHERE module = :module ORDER BY name ASC", 
                ['module' => $module]
            )->fetchAll();
        }
        
        return $this->db->query("SELECT * FROM permissions ORDER BY module ASC, name ASC")->fetchAll();
    }

    public function findByModule(): array
    {
        $permissions = $this->findAll();
        $grouped = [];
        
        foreach ($permissions as $perm) {
            $grouped[$perm['module']][] = $perm;
        }
        
        return $grouped;
    }
}
