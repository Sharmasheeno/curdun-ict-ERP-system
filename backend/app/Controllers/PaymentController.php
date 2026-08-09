<?php

namespace App\Controllers;

use Core\Request;
use Core\Response;
use App\Services\PaymentService;

class PaymentController extends BaseController
{
    private PaymentService $paymentService;

    public function __construct(PaymentService $paymentService)
    {
        $this->paymentService = $paymentService;
    }

    public function index(Request $request)
    {
        $params = $this->getPaginationParams($request);
        $data = $this->paymentService->getPayments($params['page'], $params['limit'], $request->all());
        return Response::json(true, 'Payments retrieved successfully', $data, null, 200);
    }

    public function show(Request $request, int $id)
    {
        $payment = $this->paymentService->getPaymentById($id);
        if (!$payment) {
            return Response::json(false, 'Payment not found', null, null, 404);
        }
        return Response::json(true, 'Payment retrieved successfully', $payment, null, 200);
    }

    public function store(Request $request)
    {
        $data = $request->all();
        $data['created_by'] = $this->getAuthUserId();
        $payment = $this->paymentService->recordPayment($data);
        return Response::json(true, 'Payment recorded successfully', $payment, null, 201);
    }

    public function refund(Request $request, int $id)
    {
        $userId = $this->getAuthUserId();
        $this->paymentService->refundPayment($id, $userId);
        return Response::json(true, 'Payment refunded successfully', null, null, 200);
    }
}
