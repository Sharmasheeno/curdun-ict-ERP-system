<?php

namespace App\Controllers;

use Core\Request;
use Core\Response;
use App\Services\InvoiceService;

class InvoiceController extends BaseController
{
    private InvoiceService $invoiceService;

    public function __construct(InvoiceService $invoiceService)
    {
        $this->invoiceService = $invoiceService;
    }

    public function index(Request $request)
    {
        $params = $this->getPaginationParams($request);
        $data = $this->invoiceService->getInvoices($params['page'], $params['limit'], $request->all());
        return Response::json(true, 'Invoices retrieved successfully', $data, null, 200);
    }

    public function show(Request $request, int $id)
    {
        $invoice = $this->invoiceService->getInvoiceById($id);
        if (!$invoice) {
            return Response::json(false, 'Invoice not found', null, null, 404);
        }
        return Response::json(true, 'Invoice retrieved successfully', $invoice, null, 200);
    }

    public function store(Request $request)
    {
        $data = $request->all();
        $data['created_by'] = $this->getAuthUserId();
        $invoice = $this->invoiceService->createInvoice($data);
        return Response::json(true, 'Invoice created successfully', $invoice, null, 201);
    }

    public function update(Request $request, int $id)
    {
        $data = $request->all();
        $invoice = $this->invoiceService->updateInvoice($id, $data);
        return Response::json(true, 'Invoice updated successfully', $invoice, null, 200);
    }

    public function destroy(Request $request, int $id)
    {
        $this->invoiceService->cancelInvoice($id);
        return Response::json(true, 'Invoice cancelled successfully', null, null, 200);
    }

    public function send(Request $request, int $id)
    {
        $this->invoiceService->sendInvoice($id);
        return Response::json(true, 'Invoice marked as sent', null, null, 200);
    }

    public function overdue(Request $request)
    {
        $params = $this->getPaginationParams($request);
        $data = $this->invoiceService->getOverdueInvoices($params['page'], $params['limit']);
        return Response::json(true, 'Overdue invoices retrieved successfully', $data, null, 200);
    }
}
