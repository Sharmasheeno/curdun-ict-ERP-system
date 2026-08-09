<?php

namespace App\Controllers;

use Core\Request;
use Core\Response;
use App\Services\UserService;

class UserController extends BaseController
{
    public function __construct(private UserService $userService) {}

    public function index(Request $request): void
    {
        $pagination = $this->getPaginationParams($request);
        $filters = array_merge($request->getQueryParams(), $pagination);
        $result = $this->userService->getAll($filters);
        Response::success('Users retrieved successfully.', $result);
    }

    public function show(Request $request, int $id): void
    {
        $user = $this->userService->getById($id);
        Response::success('User retrieved successfully.', $user);
    }

    public function store(Request $request): void
    {
        $data = $request->getBody();
        $user = $this->userService->create($data);
        Response::created('User created successfully.', $user);
    }

    public function update(Request $request, int $id): void
    {
        $data = $request->getBody();
        $user = $this->userService->update($id, $data);
        Response::success('User updated successfully.', $user);
    }

    public function destroy(Request $request, int $id): void
    {
        $this->userService->delete($id);
        Response::success('User deleted successfully.');
    }

    public function assignRoles(Request $request, int $id): void
    {
        $roleIds = $request->getBodyParam('role_ids', []);
        $this->userService->assignRoles($id, $roleIds);
        Response::success('Roles assigned successfully.');
    }

    public function changePassword(Request $request, int $id): void
    {
        $currentPassword = $request->getBodyParam('current_password', '');
        $newPassword     = $request->getBodyParam('new_password', '');
        $this->userService->changePassword($id, $currentPassword, $newPassword);
        Response::success('Password changed successfully.');
    }
}
