<?php

namespace App\Controllers;

use Core\Request;
use Core\Response;
use App\Services\DepartmentService;

class DepartmentController extends BaseController
{
    private DepartmentService $departmentService;

    public function __construct(DepartmentService $departmentService)
    {
        $this->departmentService = $departmentService;
    }

    public function index(Request $request)
    {
        $params = $this->getPaginationParams($request);
        $data = $this->departmentService->getDepartments($params['page'], $params['limit']);
        return Response::json(true, 'Departments retrieved successfully', $data, null, 200);
    }

    public function show(Request $request, int $id)
    {
        $department = $this->departmentService->getDepartmentById($id);
        if (!$department) {
            return Response::json(false, 'Department not found', null, null, 404);
        }
        return Response::json(true, 'Department retrieved successfully', $department, null, 200);
    }

    public function store(Request $request)
    {
        $data = $request->all();
        $department = $this->departmentService->createDepartment($data);
        return Response::json(true, 'Department created successfully', $department, null, 201);
    }

    public function update(Request $request, int $id)
    {
        $data = $request->all();
        $department = $this->departmentService->updateDepartment($id, $data);
        return Response::json(true, 'Department updated successfully', $department, null, 200);
    }

    public function destroy(Request $request, int $id)
    {
        $this->departmentService->deleteDepartment($id);
        return Response::json(true, 'Department deleted successfully', null, null, 200);
    }
}
