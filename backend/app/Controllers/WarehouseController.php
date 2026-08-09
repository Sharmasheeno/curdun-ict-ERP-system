<?php

namespace App\Controllers;

use Core\Request;
use Core\Response;
use App\Services\WarehouseService;

class WarehouseController extends BaseController
{
    private WarehouseService $warehouseService;

    public function __construct(WarehouseService $warehouseService)
    {
        $this->warehouseService = $warehouseService;
    }

    public function index(Request $request)
    {
        $params = $this->getPaginationParams($request);
        $data = $this->warehouseService->getWarehouses($params['page'], $params['limit']);
        return Response::json(true, 'Warehouses retrieved successfully', $data, null, 200);
    }

    public function show(Request $request, int $id)
    {
        $warehouse = $this->warehouseService->getWarehouseById($id);
        if (!$warehouse) {
            return Response::json(false, 'Warehouse not found', null, null, 404);
        }
        return Response::json(true, 'Warehouse retrieved successfully', $warehouse, null, 200);
    }

    public function store(Request $request)
    {
        $data = $request->all();
        $warehouse = $this->warehouseService->createWarehouse($data);
        return Response::json(true, 'Warehouse created successfully', $warehouse, null, 201);
    }

    public function update(Request $request, int $id)
    {
        $data = $request->all();
        $warehouse = $this->warehouseService->updateWarehouse($id, $data);
        return Response::json(true, 'Warehouse updated successfully', $warehouse, null, 200);
    }

    public function destroy(Request $request, int $id)
    {
        $this->warehouseService->deleteWarehouse($id);
        return Response::json(true, 'Warehouse deleted successfully', null, null, 200);
    }
}
