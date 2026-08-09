<?php

namespace App\Controllers;

use Core\Request;
use Core\Response;
use App\Services\PermissionService;

class PermissionController extends BaseController
{
    private PermissionService $permissionService;

    public function __construct(PermissionService $permissionService)
    {
        $this->permissionService = $permissionService;
    }

    public function index(Request $request)
    {
        $data = $this->permissionService->getPermissionsGroupedByModule();
        return Response::json(true, 'Permissions retrieved successfully', $data, null, 200);
    }

    public function show(Request $request, int $id)
    {
        $permission = $this->permissionService->getPermissionById($id);
        if (!$permission) {
            return Response::json(false, 'Permission not found', null, null, 404);
        }
        return Response::json(true, 'Permission retrieved successfully', $permission, null, 200);
    }
}
