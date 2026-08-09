<?php

namespace App\Services;

use App\Repositories\CategoryRepository;
use App\Repositories\AuditLogRepository;
use Core\Validator;
use Exception;

class CategoryService
{
    public function __construct(
        private CategoryRepository $categoryRepository,
        private AuditLogRepository $auditLogRepository,
        private Validator $validator
    ) {}

    public function getAll(): array
    {
        return $this->categoryRepository->getAll();
    }

    public function getTree(): array
    {
        $categories = $this->getAll();
        $tree = [];
        $references = [];

        foreach ($categories as $category) {
            $category['children'] = [];
            $references[$category['id']] = $category;
        }

        foreach ($references as $id => &$category) {
            if ($category['parent_id']) {
                $references[$category['parent_id']]['children'][] = &$category;
            } else {
                $tree[] = &$category;
            }
        }

        return $tree;
    }

    public function getById(int $id): array
    {
        $category = $this->categoryRepository->findById($id);
        if (!$category) {
            throw new Exception('Category not found.', 404);
        }
        return $category;
    }

    public function create(array $data): array
    {
        $this->validator->validate($data, [
            'name' => 'required'
        ]);

        $id = $this->categoryRepository->create($data);

        $this->auditLogRepository->create([
            'module' => 'CATEGORY',
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

        if (isset($data['parent_id']) && $data['parent_id'] == $id) {
            throw new Exception('Category cannot be its own parent.', 400);
        }

        $this->categoryRepository->update($id, $data);
        $new = $this->getById($id);

        $this->auditLogRepository->create([
            'module' => 'CATEGORY',
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
        $category = $this->getById($id);
        
        $children = $this->categoryRepository->findByParentId($id);
        if (!empty($children)) {
            throw new Exception('Cannot delete category with children.', 400);
        }

        $this->categoryRepository->delete($id);

        $this->auditLogRepository->create([
            'module' => 'CATEGORY',
            'action' => 'DELETE',
            'record_id' => $id,
            'old_values' => json_encode($category),
            'created_at' => date('Y-m-d H:i:s')
        ]);

        return true;
    }
}
