<?php

namespace App\Controllers;

use Core\Request;
use Core\Response;
use App\Services\OrderService;

class OrderController extends BaseController
{
    private OrderService $orderService;

    public function __construct(OrderService $orderService)
    {
        $this->orderService = $orderService;
    }

    public function index(Request $request)
    {
        $params = $this->getPaginationParams($request);
        $data = $this->orderService->getOrders($params['page'], $params['limit'], $request->all());
        return Response::json(true, 'Orders retrieved successfully', $data, null, 200);
    }

    public function show(Request $request, int $id)
    {
        $order = $this->orderService->getOrderById($id);
        if (!$order) {
            return Response::json(false, 'Order not found', null, null, 404);
        }
        return Response::json(true, 'Order retrieved successfully', $order, null, 200);
    }

    public function store(Request $request)
    {
        $data = $request->all();
        $data['created_by'] = $this->getAuthUserId();
        $order = $this->orderService->createOrder($data);
        return Response::json(true, 'Order created successfully', $order, null, 201);
    }

    public function update(Request $request, int $id)
    {
        $data = $request->all();
        $order = $this->orderService->updateOrder($id, $data);
        return Response::json(true, 'Order updated successfully', $order, null, 200);
    }

    public function destroy(Request $request, int $id)
    {
        $this->orderService->cancelOrder($id);
        return Response::json(true, 'Order cancelled successfully', null, null, 200);
    }

    public function confirm(Request $request, int $id)
    {
        $this->orderService->confirmOrder($id);
        return Response::json(true, 'Order confirmed successfully', null, null, 200);
    }

    public function complete(Request $request, int $id)
    {
        $this->orderService->completeOrder($id);
        return Response::json(true, 'Order completed successfully', null, null, 200);
    }
}
