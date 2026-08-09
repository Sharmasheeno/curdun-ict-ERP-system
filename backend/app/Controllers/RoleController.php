<?php

namespace App\Controllers;

use Core\Request;
use Core\Response;
use App\Services\RoleService;

class RoleController extends BaseController
{
    private RoleService $roleService;

    public function __construct(RoleService $roleService)
    {
        $this->roleService = $roleService;
    }

    public function index(Request $request)
    {
        $params = $this->getPaginationParams($request);
        $data = $this->roleService->getRoles($params['page'], $params['limit']);
        return Response::json(true, 'Roles retrieved successfully', $data, null, 200);
    }

    public function show(Request $request, int $id)
    {
        $role = $this->roleService->getRoleById($id);
        if (!$role) {
            return Response::json(false, 'Role not found', null, null, 404);
        }
        return Response::json(true, 'Role retrieved successfully', $role, null, 200);
    }

    public function store(Request $request)
    {
        $data = $request->all();
        $role = $this->roleService->createRole($data);
        return Response::json(true, 'Role created successfully', $role, null, 201);
    }

    public function update(Request $request, int $id)
    {
        $data = $request->all();
        $role = $this->roleService->updateRole($id, $data);
        return Response::json(true, 'Role updated successfully', $role, null, 200);
    }

    public function destroy(Request $request, int $id)
    {
        $this->roleService->deleteRole($id);
        return Response::json(true, 'Role deleted successfully', null, null, 200);
    }

    public function syncPermissions(Request $request, int $id)
    {
        $permissions = $request->input('permissions', []);
        $this->roleService->syncPermissions($id, $permissions);
        return Response::json(true, 'Permissions synced successfully', null, null, 200);
    }
}
