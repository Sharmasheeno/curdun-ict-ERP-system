<?php

namespace App\Controllers;

use Core\Request;
use Core\Response;
use App\Services\BranchService;

class BranchController extends BaseController
{
    private BranchService $branchService;

    public function __construct(BranchService $branchService)
    {
        $this->branchService = $branchService;
    }

    public function index(Request $request)
    {
        $params = $this->getPaginationParams($request);
        $data = $this->branchService->getBranches($params['page'], $params['limit']);
        return Response::json(true, 'Branches retrieved successfully', $data, null, 200);
    }

    public function show(Request $request, int $id)
    {
        $branch = $this->branchService->getBranchById($id);
        if (!$branch) {
            return Response::json(false, 'Branch not found', null, null, 404);
        }
        return Response::json(true, 'Branch retrieved successfully', $branch, null, 200);
    }

    public function store(Request $request)
    {
        $data = $request->all();
        $branch = $this->branchService->createBranch($data);
        return Response::json(true, 'Branch created successfully', $branch, null, 201);
    }

    public function update(Request $request, int $id)
    {
        $data = $request->all();
        $branch = $this->branchService->updateBranch($id, $data);
        return Response::json(true, 'Branch updated successfully', $branch, null, 200);
    }

    public function destroy(Request $request, int $id)
    {
        $this->branchService->deleteBranch($id);
        return Response::json(true, 'Branch deleted successfully', null, null, 200);
    }
}
