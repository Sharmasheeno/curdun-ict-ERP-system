<?php

namespace App\Controllers;

use Core\Request;
use Core\Response;
use App\Services\SalesReturnService;

class SalesReturnController extends BaseController
{
    private SalesReturnService $salesReturnService;

    public function __construct(SalesReturnService $salesReturnService)
    {
        $this->salesReturnService = $salesReturnService;
    }

    public function index(Request $request)
    {
        $params = $this->getPaginationParams($request);
        $data = $this->salesReturnService->getSalesReturns($params['page'], $params['limit']);
        return Response::json(true, 'Sales returns retrieved successfully', $data, null, 200);
    }

    public function show(Request $request, int $id)
    {
        $return = $this->salesReturnService->getSalesReturnById($id);
        if (!$return) {
            return Response::json(false, 'Sales return not found', null, null, 404);
        }
        return Response::json(true, 'Sales return retrieved successfully', $return, null, 200);
    }

    public function store(Request $request)
    {
        $data = $request->all();
        $data['created_by'] = $this->getAuthUserId();
        $return = $this->salesReturnService->createSalesReturn($data);
        return Response::json(true, 'Sales return created successfully', $return, null, 201);
    }

    public function approve(Request $request, int $id)
    {
        $userId = $this->getAuthUserId();
        $this->salesReturnService->approveSalesReturn($id, $userId);
        return Response::json(true, 'Sales return approved successfully', null, null, 200);
    }

    public function reject(Request $request, int $id)
    {
        $userId = $this->getAuthUserId();
        $this->salesReturnService->rejectSalesReturn($id, $userId);
        return Response::json(true, 'Sales return rejected successfully', null, null, 200);
    }
}
