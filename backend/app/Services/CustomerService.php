<?php

namespace App\Services;

use App\Repositories\CustomerRepository;
use App\Repositories\AuditLogRepository;
use Core\Validator;
use Exception;

class CustomerService
{
    public function __construct(
        private CustomerRepository $customerRepository,
        private AuditLogRepository $auditLogRepository,
        private Validator $validator
    ) {}

    public function getAll(array $filters = []): array
    {
        return $this->customerRepository->getAllPaginated($filters);
    }

    public function getById(int $id): array
    {
        $customer = $this->customerRepository->findById($id);
        if (!$customer) {
            throw new Exception('Customer not found.', 404);
        }
        return $customer;
    }

    public function create(array $data): array
    {
        $this->validator->validate($data, [
            'name' => 'required',
            'email' => 'email'
        ]);

        if (empty($data['customer_code'])) {
            $data['customer_code'] = 'CUST-' . strtoupper(uniqid());
        }

        $id = $this->customerRepository->create($data);

        $this->auditLogRepository->create([
            'module' => 'CUSTOMER',
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

        $this->customerRepository->update($id, $data);
        $new = $this->getById($id);

        $this->auditLogRepository->create([
            'module' => 'CUSTOMER',
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
        $customer = $this->getById($id);

        $this->customerRepository->softDelete($id);

        $this->auditLogRepository->create([
            'module' => 'CUSTOMER',
            'action' => 'DELETE',
            'record_id' => $id,
            'old_values' => json_encode($customer),
            'created_at' => date('Y-m-d H:i:s')
        ]);

        return true;
    }
}
