<?php

namespace App\Services;

use App\Repositories\UnitRepository;
use App\Repositories\AuditLogRepository;
use Core\Validator;
use Exception;

class UnitService
{
    public function __construct(
        private UnitRepository $unitRepository,
        private AuditLogRepository $auditLogRepository,
        private Validator $validator
    ) {}

    public function getAll(): array
    {
        return $this->unitRepository->getAll();
    }

    public function getById(int $id): array
    {
        $unit = $this->unitRepository->findById($id);
        if (!$unit) {
            throw new Exception('Unit not found.', 404);
        }
        return $unit;
    }

    public function create(array $data): array
    {
        $this->validator->validate($data, [
            'name' => 'required',
            'short_name' => 'required'
        ]);

        $id = $this->unitRepository->create($data);

        $this->auditLogRepository->create([
            'module' => 'UNIT',
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
            'short_name' => 'required'
        ]);

        $this->unitRepository->update($id, $data);
        $new = $this->getById($id);

        $this->auditLogRepository->create([
            'module' => 'UNIT',
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
        $unit = $this->getById($id);

        $this->unitRepository->delete($id);

        $this->auditLogRepository->create([
            'module' => 'UNIT',
            'action' => 'DELETE',
            'record_id' => $id,
            'old_values' => json_encode($unit),
            'created_at' => date('Y-m-d H:i:s')
        ]);

        return true;
    }
}
