<?php

namespace App\Controllers;

use Core\Request;
use Core\Response;
use App\Services\PurchaseService;

class PurchaseController extends BaseController
{
    private PurchaseService $purchaseService;

    public function __construct(PurchaseService $purchaseService)
    {
        $this->purchaseService = $purchaseService;
    }

    public function index(Request $request)
    {
        $params = $this->getPaginationParams($request);
        $data = $this->purchaseService->getPurchases($params['page'], $params['limit'], $request->all());
        return Response::json(true, 'Purchases retrieved successfully', $data, null, 200);
    }

    public function show(Request $request, int $id)
    {
        $purchase = $this->purchaseService->getPurchaseById($id);
        if (!$purchase) {
            return Response::json(false, 'Purchase not found', null, null, 404);
        }
        return Response::json(true, 'Purchase retrieved successfully', $purchase, null, 200);
    }

    public function store(Request $request)
    {
        $data = $request->all();
        $data['created_by'] = $this->getAuthUserId();
        $purchase = $this->purchaseService->createPurchase($data);
        return Response::json(true, 'Purchase created successfully', $purchase, null, 201);
    }

    public function update(Request $request, int $id)
    {
        $data = $request->all();
        $purchase = $this->purchaseService->updatePurchase($id, $data);
        return Response::json(true, 'Purchase updated successfully', $purchase, null, 200);
    }

    public function destroy(Request $request, int $id)
    {
        $this->purchaseService->cancelPurchase($id);
        return Response::json(true, 'Purchase cancelled successfully', null, null, 200);
    }

    public function approve(Request $request, int $id)
    {
        $userId = $this->getAuthUserId();
        $this->purchaseService->approvePurchase($id, $userId);
        return Response::json(true, 'Purchase approved successfully', null, null, 200);
    }

    public function receive(Request $request, int $id)
    {
        $items = $request->input('items', []);
        $userId = $this->getAuthUserId();
        $this->purchaseService->receivePurchase($id, $items, $userId);
        return Response::json(true, 'Purchase received successfully', null, null, 200);
    }
}
