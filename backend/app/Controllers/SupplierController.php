<?php

namespace App\Controllers;

use Core\Request;
use Core\Response;
use App\Services\SupplierService;

class SupplierController extends BaseController
{
    private SupplierService $supplierService;

    public function __construct(SupplierService $supplierService)
    {
        $this->supplierService = $supplierService;
    }

    public function index(Request $request)
    {
        $params = $this->getPaginationParams($request);
        $data = $this->supplierService->getSuppliers($params['page'], $params['limit'], $request->all());
        return Response::json(true, 'Suppliers retrieved successfully', $data, null, 200);
    }

    public function show(Request $request, int $id)
    {
        $supplier = $this->supplierService->getSupplierById($id);
        if (!$supplier) {
            return Response::json(false, 'Supplier not found', null, null, 404);
        }
        return Response::json(true, 'Supplier retrieved successfully', $supplier, null, 200);
    }

    public function store(Request $request)
    {
        $data = $request->all();
        $supplier = $this->supplierService->createSupplier($data);
        return Response::json(true, 'Supplier created successfully', $supplier, null, 201);
    }

    public function update(Request $request, int $id)
    {
        $data = $request->all();
        $supplier = $this->supplierService->updateSupplier($id, $data);
        return Response::json(true, 'Supplier updated successfully', $supplier, null, 200);
    }

    public function destroy(Request $request, int $id)
    {
        $this->supplierService->deleteSupplier($id);
        return Response::json(true, 'Supplier deleted successfully', null, null, 200);
    }
}
