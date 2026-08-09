<?php

namespace App\Controllers;

use Core\Request;
use Core\Response;
use App\Services\InventoryService;

class InventoryController extends BaseController
{
    private InventoryService $inventoryService;

    public function __construct(InventoryService $inventoryService)
    {
        $this->inventoryService = $inventoryService;
    }

    public function index(Request $request)
    {
        $params = $this->getPaginationParams($request);
        $data = $this->inventoryService->getInventorySummary($params['page'], $params['limit'], $request->all());
        return Response::json(true, 'Inventory summary retrieved', $data, null, 200);
    }

    public function movements(Request $request)
    {
        $params = $this->getPaginationParams($request);
        $data = $this->inventoryService->getStockMovements($params['page'], $params['limit'], $request->all());
        return Response::json(true, 'Stock movements retrieved', $data, null, 200);
    }

    public function adjust(Request $request)
    {
        $data = $request->all();
        $userId = $this->getAuthUserId();
        
        $this->inventoryService->adjustStock(
            $data['product_id'] ?? 0,
            $data['warehouse_id'] ?? 0,
            $data['quantity'] ?? 0,
            $data['reason'] ?? '',
            $userId
        );
        
        return Response::json(true, 'Stock adjusted successfully', null, null, 200);
    }

    public function transfer(Request $request)
    {
        $data = $request->all();
        $userId = $this->getAuthUserId();
        
        $this->inventoryService->transferStock(
            $data['product_id'] ?? 0,
            $data['from_warehouse_id'] ?? 0,
            $data['to_warehouse_id'] ?? 0,
            $data['quantity'] ?? 0,
            $userId
        );
        
        return Response::json(true, 'Stock transferred successfully', null, null, 200);
    }
}
