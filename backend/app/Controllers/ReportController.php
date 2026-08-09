<?php

namespace App\Controllers;

use Core\Request;
use Core\Response;
use App\Services\ReportService;

class ReportController extends BaseController
{
    public function __construct(private ReportService $reportService) {}

    public function sales(Request $request): void
    {
        $filters = $request->getQueryParams();
        $report = $this->reportService->getSalesReport($filters);
        Response::success('Sales report generated successfully.', $report);
    }

    public function revenue(Request $request): void
    {
        $filters = $request->getQueryParams();
        $report = $this->reportService->getRevenueReport($filters);
        Response::success('Revenue report generated successfully.', $report);
    }

    public function expenses(Request $request): void
    {
        $filters = $request->getQueryParams();
        $report = $this->reportService->getExpenseReport($filters);
        Response::success('Expense report generated successfully.', $report);
    }

    public function invoices(Request $request): void
    {
        $filters = $request->getQueryParams();
        $report = $this->reportService->getInvoiceReport($filters);
        Response::success('Invoice report generated successfully.', $report);
    }

    public function payments(Request $request): void
    {
        $filters = $request->getQueryParams();
        $report = $this->reportService->getPaymentReport($filters);
        Response::success('Payment report generated successfully.', $report);
    }

    public function inventory(Request $request): void
    {
        $filters = $request->getQueryParams();
        $report = $this->reportService->getInventoryReport($filters);
        Response::success('Inventory report generated successfully.', $report);
    }

    public function customers(Request $request): void
    {
        $filters = $request->getQueryParams();
        $report = $this->reportService->getCustomerReport($filters);
        Response::success('Customer report generated successfully.', $report);
    }
}
