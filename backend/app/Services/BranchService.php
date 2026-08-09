<?php

namespace App\Services;

use App\Repositories\BranchRepository;
use App\Repositories\AuditLogRepository;
use Core\Validator;
use Exception;

class BranchService
{
    public function __construct(
        private BranchRepository $branchRepository,
        private AuditLogRepository $auditLogRepository,
        private Validator $validator
    ) {}

    public function getAll(): array
    {
        return $this->branchRepository->getAll();
    }

    public function getByCompany(int $companyId): array
    {
        return $this->branchRepository->getByCompany($companyId);
    }

    public function getById(int $id): array
    {
        $branch = $this->branchRepository->findById($id);
        if (!$branch) {
            throw new Exception('Branch not found.', 404);
        }
        return $branch;
    }

    public function create(array $data): array
    {
        $this->validator->validate($data, [
            'name' => 'required',
            'company_id' => 'required|numeric'
        ]);

        $branchId = $this->branchRepository->create($data);

        $this->auditLogRepository->create([
            'module' => 'BRANCH',
            'action' => 'CREATE',
            'record_id' => $branchId,
            'new_values' => json_encode($data),
            'created_at' => date('Y-m-d H:i:s')
        ]);

        return $this->getById($branchId);
    }

    public function update(int $id, array $data): array
    {
        $oldBranch = $this->getById($id);

        $this->validator->validate($data, [
            'name' => 'required'
        ]);

        $this->branchRepository->update($id, $data);
        $newBranch = $this->getById($id);

        $this->auditLogRepository->create([
            'module' => 'BRANCH',
            'action' => 'UPDATE',
            'record_id' => $id,
            'old_values' => json_encode($oldBranch),
            'new_values' => json_encode($newBranch),
            'created_at' => date('Y-m-d H:i:s')
        ]);

        return $newBranch;
    }

    public function delete(int $id): bool
    {
        $branch = $this->getById($id);

        $this->branchRepository->softDelete($id);

        $this->auditLogRepository->create([
            'module' => 'BRANCH',
            'action' => 'DELETE',
            'record_id' => $id,
            'old_values' => json_encode($branch),
            'created_at' => date('Y-m-d H:i:s')
        ]);

        return true;
    }
}
