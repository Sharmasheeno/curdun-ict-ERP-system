<?php

namespace App\Services;

use App\Repositories\WarehouseRepository;
use App\Repositories\AuditLogRepository;
use Core\Validator;
use Exception;

class WarehouseService
{
    public function __construct(
        private WarehouseRepository $warehouseRepository,
        private AuditLogRepository $auditLogRepository,
        private Validator $validator
    ) {}

    public function getAll(): array
    {
        return $this->warehouseRepository->getAll();
    }

    public function getByCompany(int $companyId): array
    {
        return $this->warehouseRepository->getByCompany($companyId);
    }

    public function getById(int $id): array
    {
        $warehouse = $this->warehouseRepository->findById($id);
        if (!$warehouse) {
            throw new Exception('Warehouse not found.', 404);
        }
        return $warehouse;
    }

    public function create(array $data): array
    {
        $this->validator->validate($data, [
            'name' => 'required',
            'company_id' => 'required|numeric'
        ]);

        $id = $this->warehouseRepository->create($data);

        $this->auditLogRepository->create([
            'module' => 'WAREHOUSE',
            'action' => 'CREATE',
            'record_id' => $id,
            'new_values' => json_encode($data),
            'created_at' => date('Y-m-d H:i:s')
        ]);

        return $this->getById($id);
    }

    public function update(int $id, array $data): array
    {
        $old = $this->getById($id);

        $this->validator->validate($data, [
            'name' => 'required'
        ]);

        $this->warehouseRepository->update($id, $data);
        $new = $this->getById($id);

        $this->auditLogRepository->create([
            'module' => 'WAREHOUSE',
            'action' => 'UPDATE',
            'record_id' => $id,
            'old_values' => json_encode($old),
            'new_values' => json_encode($new),
            'created_at' => date('Y-m-d H:i:s')
        ]);

        return $new;
    }

    public function delete(int $id): bool
    {
        $warehouse = $this->getById($id);

        $this->warehouseRepository->softDelete($id);

        $this->auditLogRepository->create([
            'module' => 'WAREHOUSE',
            'action' => 'DELETE',
            'record_id' => $id,
            'old_values' => json_encode($warehouse),
            'created_at' => date('Y-m-d H:i:s')
        ]);

        return true;
    }
}
