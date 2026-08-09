<?php

namespace App\Controllers;

use Core\Request;
use Core\Response;
use App\Services\CategoryService;

class CategoryController extends BaseController
{
    private CategoryService $categoryService;

    public function __construct(CategoryService $categoryService)
    {
        $this->categoryService = $categoryService;
    }

    public function index(Request $request)
    {
        $params = $this->getPaginationParams($request);
        $data = $this->categoryService->getCategories($params['page'], $params['limit']);
        return Response::json(true, 'Categories retrieved successfully', $data, null, 200);
    }

    public function tree(Request $request)
    {
        $data = $this->categoryService->getCategoryTree();
        return Response::json(true, 'Category tree retrieved successfully', $data, null, 200);
    }

    public function show(Request $request, int $id)
    {
        $category = $this->categoryService->getCategoryById($id);
        if (!$category) {
            return Response::json(false, 'Category not found', null, null, 404);
        }
        return Response::json(true, 'Category retrieved successfully', $category, null, 200);
    }

    public function store(Request $request)
    {
        $data = $request->all();
        $category = $this->categoryService->createCategory($data);
        return Response::json(true, 'Category created successfully', $category, null, 201);
    }

    public function update(Request $request, int $id)
    {
        $data = $request->all();
        $category = $this->categoryService->updateCategory($id, $data);
        return Response::json(true, 'Category updated successfully', $category, null, 200);
    }

    public function destroy(Request $request, int $id)
    {
        $this->categoryService->deleteCategory($id);
        return Response::json(true, 'Category deleted successfully', null, null, 200);
    }
}
