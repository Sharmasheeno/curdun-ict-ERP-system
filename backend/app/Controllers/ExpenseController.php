<?php

namespace App\Controllers;

use Core\Request;
use Core\Response;
use App\Services\ExpenseService;

class ExpenseController extends BaseController
{
    public function __construct(private ExpenseService $expenseService) {}

    public function index(Request $request): void
    {
        $pagination = $this->getPaginationParams($request);
        $filters = array_merge($request->getQueryParams(), $pagination);
        $result = $this->expenseService->getAll($filters);
        Response::success('Expenses retrieved successfully.', $result);
    }

    public function show(Request $request, int $id): void
    {
        $expense = $this->expenseService->getById($id);
        Response::success('Expense retrieved successfully.', $expense);
    }

    public function store(Request $request): void
    {
        $data = $request->getBody();
        $expense = $this->expenseService->create($data);
        Response::created('Expense created successfully.', $expense);
    }

    public function update(Request $request, int $id): void
    {
        $data = $request->getBody();
        $expense = $this->expenseService->update($id, $data);
        Response::success('Expense updated successfully.', $expense);
    }

    public function destroy(Request $request, int $id): void
    {
        $this->expenseService->delete($id);
        Response::success('Expense deleted successfully.');
    }

    public function approve(Request $request, int $id): void
    {
        $expense = $this->expenseService->approve($id);
        Response::success('Expense approved successfully.', $expense);
    }
}
