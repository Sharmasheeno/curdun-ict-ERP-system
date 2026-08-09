<?php

namespace App\Controllers;

use Core\Request;
use Core\Response;
use App\Services\DashboardService;

class DashboardController extends BaseController
{
    public function __construct(private DashboardService $dashboardService) {}

    public function summary(Request $request): void
    {
        $summary = $this->dashboardService->getSummary();
        Response::success('Dashboard summary retrieved successfully.', $summary);
    }

    public function sales(Request $request): void
    {
        $days = (int) $request->getQueryParam('days', 30);
        $data = $this->dashboardService->getSalesData(null, $days);
        Response::success('Sales analytics retrieved successfully.', $data);
    }

    public function revenue(Request $request): void
    {
        $days = (int) $request->getQueryParam('days', 30);
        $data = $this->dashboardService->getRevenueData(null, $days);
        Response::success('Revenue analytics retrieved successfully.', $data);
    }

    public function expenses(Request $request): void
    {
        $days = (int) $request->getQueryParam('days', 30);
        $data = $this->dashboardService->getExpenseData(null, $days);
        Response::success('Expense analytics retrieved successfully.', $data);
    }

    public function customers(Request $request): void
    {
        $limit = (int) $request->getQueryParam('limit', 5);
        $data = $this->dashboardService->getTopCustomers(null, $limit);
        Response::success('Top customers retrieved successfully.', $data);
    }

    public function inventory(Request $request): void
    {
        $limit = (int) $request->getQueryParam('limit', 10);
        $data = $this->dashboardService->getLowStockProducts(null, $limit);
        Response::success('Inventory analytics retrieved successfully.', $data);
    }
}
