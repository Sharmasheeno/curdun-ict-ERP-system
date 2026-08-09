<?php

namespace App\Services;

use App\Repositories\SupplierRepository;
use App\Repositories\AuditLogRepository;
use Core\Validator;
use Exception;

class SupplierService
{
    public function __construct(
        private SupplierRepository $supplierRepository,
        private AuditLogRepository $auditLogRepository,
        private Validator $validator
    ) {}

    public function getAll(array $filters = []): array
    {
        return $this->supplierRepository->getAllPaginated($filters);
    }

    public function getById(int $id): array
    {
        $supplier = $this->supplierRepository->findById($id);
        if (!$supplier) {
            throw new Exception('Supplier not found.', 404);
        }
        return $supplier;
    }

    public function create(array $data): array
    {
        $this->validator->validate($data, [
            'name' => 'required',
            'email' => 'email'
        ]);

        if (empty($data['supplier_code'])) {
            $data['supplier_code'] = 'SUPP-' . strtoupper(uniqid());
        }

        $id = $this->supplierRepository->create($data);

        $this->auditLogRepository->create([
            'module' => 'SUPPLIER',
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
            'name' => 'required',
            'email' => 'email'
        ]);

        $this->supplierRepository->update($id, $data);
        $new = $this->getById($id);

        $this->auditLogRepository->create([
            'module' => 'SUPPLIER',
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
        $supplier = $this->getById($id);

        $this->supplierRepository->softDelete($id);

        $this->auditLogRepository->create([
            'module' => 'SUPPLIER',
            'action' => 'DELETE',
            'record_id' => $id,
            'old_values' => json_encode($supplier),
            'created_at' => date('Y-m-d H:i:s')
        ]);

        return true;
    }
}
