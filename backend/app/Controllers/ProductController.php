<?php

namespace App\Controllers;

use Core\Request;
use Core\Response;
use App\Services\ProductService;

class ProductController extends BaseController
{
    private ProductService $productService;

    public function __construct(ProductService $productService)
    {
        $this->productService = $productService;
    }

    public function index(Request $request)
    {
        $params = $this->getPaginationParams($request);
        $data = $this->productService->getProducts($params['page'], $params['limit'], $request->all());
        return Response::json(true, 'Products retrieved successfully', $data, null, 200);
    }

    public function show(Request $request, int $id)
    {
        $product = $this->productService->getProductById($id);
        if (!$product) {
            return Response::json(false, 'Product not found', null, null, 404);
        }
        return Response::json(true, 'Product retrieved successfully', $product, null, 200);
    }

    public function store(Request $request)
    {
        $data = $request->all();
        $product = $this->productService->create($data);
        return Response::json(true, 'Product created successfully', $product, null, 201);
    }

    public function update(Request $request, int $id)
    {
        $data = $request->all();
        $product = $this->productService->update($id, $data);
        return Response::json(true, 'Product updated successfully', $product, null, 200);
    }

    public function destroy(Request $request, int $id)
    {
        $this->productService->delete($id);
        return Response::json(true, 'Product deleted successfully', null, null, 200);
    }

    public function lowStock(Request $request)
    {
        $params = $this->getPaginationParams($request);
        $data = $this->productService->getLowStockProducts($params['page'], $params['limit']);
        return Response::json(true, 'Low stock products retrieved', $data, null, 200);
    }
}
