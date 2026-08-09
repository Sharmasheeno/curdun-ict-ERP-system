<?php

namespace App\Controllers;

use Core\Request;
use Core\Response;
use App\Services\UnitService;

class UnitController extends BaseController
{
    private UnitService $unitService;

    public function __construct(UnitService $unitService)
    {
        $this->unitService = $unitService;
    }

    public function index(Request $request)
    {
        $params = $this->getPaginationParams($request);
        $data = $this->unitService->getUnits($params['page'], $params['limit']);
        return Response::json(true, 'Units retrieved successfully', $data, null, 200);
    }

    public function show(Request $request, int $id)
    {
        $unit = $this->unitService->getUnitById($id);
        if (!$unit) {
            return Response::json(false, 'Unit not found', null, null, 404);
        }
        return Response::json(true, 'Unit retrieved successfully', $unit, null, 200);
    }

    public function store(Request $request)
    {
        $data = $request->all();
        $unit = $this->unitService->createUnit($data);
        return Response::json(true, 'Unit created successfully', $unit, null, 201);
    }

    public function update(Request $request, int $id)
    {
        $data = $request->all();
        $unit = $this->unitService->updateUnit($id, $data);
        return Response::json(true, 'Unit updated successfully', $unit, null, 200);
    }

    public function destroy(Request $request, int $id)
    {
        $this->unitService->deleteUnit($id);
        return Response::json(true, 'Unit deleted successfully', null, null, 200);
    }
}
