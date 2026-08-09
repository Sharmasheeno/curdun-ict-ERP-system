<?php

namespace App\Services;

use App\Repositories\DepartmentRepository;
use App\Repositories\AuditLogRepository;
use Core\Validator;
use Exception;

class DepartmentService
{
    public function __construct(
        private DepartmentRepository $departmentRepository,
        private AuditLogRepository $auditLogRepository,
        private Validator $validator
    ) {}

    public function getAll(): array
    {
        return $this->departmentRepository->getAll();
    }

    public function getByCompany(int $companyId): array
    {
        return $this->departmentRepository->getByCompany($companyId);
    }

    public function getById(int $id): array
    {
        $department = $this->departmentRepository->findById($id);
        if (!$department) {
            throw new Exception('Department not found.', 404);
        }
        return $department;
    }

    public function create(array $data): array
    {
        $this->validator->validate($data, [
            'name' => 'required',
            'company_id' => 'required|numeric'
        ]);

        $id = $this->departmentRepository->create($data);

        $this->auditLogRepository->create([
            'module' => 'DEPARTMENT',
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

        $this->departmentRepository->update($id, $data);
        $new = $this->getById($id);

        $this->auditLogRepository->create([
            'module' => 'DEPARTMENT',
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
        $dept = $this->getById($id);

        $this->departmentRepository->softDelete($id);

        $this->auditLogRepository->create([
            'module' => 'DEPARTMENT',
            'action' => 'DELETE',
            'record_id' => $id,
            'old_values' => json_encode($dept),
            'created_at' => date('Y-m-d H:i:s')
        ]);

        return true;
    }
}
