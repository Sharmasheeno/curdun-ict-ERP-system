<?php

namespace App\Services;

use App\Repositories\ExpenseRepository;
use App\Repositories\AuditLogRepository;
use Core\Validator;
use Exception;

class ExpenseService
{
    public function __construct(
        private ExpenseRepository $expenseRepository,
        private AuditLogRepository $auditLogRepository,
        private Validator $validator
    ) {}

    public function getAll(array $filters = []): array
    {
        return $this->expenseRepository->getAllPaginated($filters);
    }

    public function getById(int $id): array
    {
        $expense = $this->expenseRepository->findById($id);
        if (!$expense) {
            throw new Exception('Expense not found.', 404);
        }
        return $expense;
    }

    public function create(array $data): array
    {
        $this->validator->validate($data, [
            'title' => 'required',
            'amount' => 'required|numeric',
            'expense_date' => 'required'
        ]);

        $id = $this->expenseRepository->create($data);

        $this->auditLogRepository->create([
            'module' => 'EXPENSE',
            'action' => 'CREATE',
            'record_id' => $id,
            'created_at' => date('Y-m-d H:i:s')
        ]);

        return $this->getById($id);
    }

    public function update(int $id, array $data): array
    {
        $old = $this->getById($id);
        
        $this->validator->validate($data, [
            'title' => 'required',
            'amount' => 'required|numeric',
            'expense_date' => 'required'
        ]);

        $this->expenseRepository->update($id, $data);

        $this->auditLogRepository->create([
            'module' => 'EXPENSE',
            'action' => 'UPDATE',
            'record_id' => $id,
            'created_at' => date('Y-m-d H:i:s')
        ]);

        return $this->getById($id);
    }

    public function delete(int $id): bool
    {
        $expense = $this->getById($id);

        $this->expenseRepository->delete($id);

        $this->auditLogRepository->create([
            'module' => 'EXPENSE',
            'action' => 'DELETE',
            'record_id' => $id,
            'created_at' => date('Y-m-d H:i:s')
        ]);

        return true;
    }

    public function approve(int $id): array
    {
        $this->expenseRepository->update($id, ['status' => 'APPROVED']);
        return $this->getById($id);
    }

    public function getSummary(array $filters = []): array
    {
        return $this->expenseRepository->getSummaryByCategory($filters);
    }
}
