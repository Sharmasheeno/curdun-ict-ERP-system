<?php

namespace App\Controllers;

use Core\Request;
use Core\Response;
use App\Services\CustomerService;

class CustomerController extends BaseController
{
    private CustomerService $customerService;

    public function __construct(CustomerService $customerService)
    {
        $this->customerService = $customerService;
    }

    public function index(Request $request)
    {
        $params = $this->getPaginationParams($request);
        $filters = [
            'search' => $request->input('search'),
            'status' => $request->input('status'),
            'sort'   => $request->input('sort', 'id'),
            'order'  => $request->input('order', 'desc')
        ];
        
        $data = $this->customerService->getCustomers($params['page'], $params['limit'], $filters);
        return Response::json(true, 'Customers retrieved successfully', $data, null, 200);
    }

    public function show(Request $request, int $id)
    {
        $customer = $this->customerService->getCustomerById($id);
        if (!$customer) {
            return Response::json(false, 'Customer not found', null, null, 404);
        }
        return Response::json(true, 'Customer retrieved successfully', $customer, null, 200);
    }

    public function store(Request $request)
    {
        $data = $request->all();
        $customer = $this->customerService->createCustomer($data);
        return Response::json(true, 'Customer created successfully', $customer, null, 201);
    }

    public function update(Request $request, int $id)
    {
        $data = $request->all();
        $customer = $this->customerService->updateCustomer($id, $data);
        return Response::json(true, 'Customer updated successfully', $customer, null, 200);
    }

    public function destroy(Request $request, int $id)
    {
        $this->customerService->deleteCustomer($id);
        return Response::json(true, 'Customer deleted successfully', null, null, 200);
    }
}
