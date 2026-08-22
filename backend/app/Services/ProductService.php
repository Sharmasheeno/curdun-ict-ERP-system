<?php

namespace App\Services;

use App\Repositories\ProductRepository;
use App\Repositories\CategoryRepository;
use App\Repositories\UnitRepository;
use App\Repositories\AuditLogRepository;
use Core\Validator;
use Exception;

class ProductService
{
    public function __construct(
        private ProductRepository $productRepository,
        private CategoryRepository $categoryRepository,
        private UnitRepository $unitRepository,
        private InventoryService $inventoryService,
        private AuditLogRepository $auditLogRepository,
        private Validator $validator
    ) {}

    public function getAll(array $filters = []): array
    {
        return $this->productRepository->getAllPaginated($filters);
    }

    public function getById(int $id): array
    {
        $product = $this->productRepository->findById($id);
        if (!$product) {
            throw new Exception('Product not found.', 404);
        }
        
        if (!empty($product['category_id'])) {
            $product['category'] = $this->categoryRepository->findById($product['category_id']);
        }
        if (!empty($product['unit_id'])) {
            $product['unit'] = $this->unitRepository->findById($product['unit_id']);
        }
        
        return $product;
    }

    public function create(array $data): array
    {
        $this->validator->validate($data, [
            'name' => 'required',
            'selling_price' => 'required|numeric',
            'wholesale_price' => 'numeric|nullable',
            'sku' =>'unique:products,sku'
        ]);

        if (empty($data['sku'])) {
            $data['sku'] = 'PRD-' . strtoupper(uniqid());
        }

        $id = $this->productRepository->create($data);

        $this->auditLogRepository->create([
            'module' => 'PRODUCT',
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
            'selling_price' => 'required|numeric',
            'wholesale_price' => 'numeric|nullable',
            'sku' =>"unique:products,sku,{$id}"
        ]);

        $this->productRepository->update($id, $data);
        $new = $this->getById($id);

        $this->auditLogRepository->create([
            'module' => 'PRODUCT',
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
        $product = $this->getById($id);

        $this->productRepository->softDelete($id);

        $this->auditLogRepository->create([
            'module' => 'PRODUCT',
            'action' => 'DELETE',
            'record_id' => $id,
            'old_values' => json_encode($product),
            'created_at' => date('Y-m-d H:i:s')
        ]);

        return true;
    }

    public function getLowStock(?int $companyId = null): array
    {
        $companyId = $companyId ?: (int)(\Core\Auth::user()['company_id'] ?? 0);
        if ($companyId <= 0) return [];
        return array_values(array_filter($this->inventoryService->getPosProducts($companyId, true),
            fn(array $product): bool => $product['stock_status'] === InventoryService::LOW_STOCK));
    }

    public function getLowStockProducts(int $page = 1, int $limit = 20): array
    {
        $rows = $this->getLowStock();
        $offset = max(0, ($page - 1) * $limit);
        return [
            'data' => array_slice($rows, $offset, $limit),
            'pagination' => ['current_page' => $page, 'per_page' => $limit,
                'total' => count($rows), 'last_page' => max(1, (int)ceil(count($rows) / max(1, $limit)))],
        ];
    }
}
