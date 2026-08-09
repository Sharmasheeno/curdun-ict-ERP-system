<?php

namespace App\Services;

use App\Repositories\CompanyRepository;
use App\Repositories\AuditLogRepository;
use Core\Validator;
use Exception;

class CompanyService
{
    public function __construct(
        private CompanyRepository $companyRepository,
        private AuditLogRepository $auditLogRepository,
        private Validator $validator
    ) {}

    public function getAll(): array
    {
        return $this->companyRepository->getAll();
    }

    public function getById(int $id): array
    {
        $company = $this->companyRepository->findById($id);
        if (!$company) {
            throw new Exception('Company not found.', 404);
        }
        return $company;
    }

    public function create(array $data): array
    {
        $this->validator->validate($data, [
            'name' => 'required',
            'email' => 'unique:companies,email'
        ]);

        $companyId = $this->companyRepository->create($data);

        $this->auditLogRepository->create([
            'module' => 'COMPANY',
            'action' => 'CREATE',
            'record_id' => $companyId,
            'new_values' => json_encode($data),
            'created_at' => date('Y-m-d H:i:s')
        ]);

        return $this->getById($companyId);
    }

    public function update(int $id, array $data): array
    {
        $oldCompany = $this->getById($id);

        $this->validator->validate($data, [
            'name' => 'required',
            'email' => "unique:companies,email,{$id}"
        ]);

        $this->companyRepository->update($id, $data);
        $newCompany = $this->getById($id);

        $this->auditLogRepository->create([
            'module' => 'COMPANY',
            'action' => 'UPDATE',
            'record_id' => $id,
            'old_values' => json_encode($oldCompany),
            'new_values' => json_encode($newCompany),
            'created_at' => date('Y-m-d H:i:s')
        ]);

        return $newCompany;
    }

    public function delete(int $id): bool
    {
        $company = $this->getById($id);

        $this->companyRepository->softDelete($id);

        $this->auditLogRepository->create([
            'module' => 'COMPANY',
            'action' => 'DELETE',
            'record_id' => $id,
            'old_values' => json_encode($company),
            'created_at' => date('Y-m-d H:i:s')
        ]);

        return true;
    }
}
