<?php

namespace App\Controllers;

use App\Services\PlatformService;
use Core\Request;
use Core\Response;

class PlatformController extends BaseController
{
    public function __construct(private PlatformService $platform) {}

    public function overview(Request $request): void { Response::success('Platform overview retrieved.', $this->platform->overview()); }
    public function companies(Request $request): void { Response::success('Companies retrieved.', $this->platform->companies($request->getQueryParams())); }
    public function createCompany(Request $request): void { Response::created('Company and administrator created.', $this->platform->createCompany($request->getBody())); }
    public function updateCompany(Request $request, int $id): void { Response::success('Company updated.', $this->platform->updateCompany($id, $request->getBody())); }
    public function deleteCompany(Request $request, int $id): void { $this->platform->deleteCompany($id); Response::success('Company disabled.'); }
    public function users(Request $request): void { Response::success('Users retrieved.', $this->platform->users($request->getQueryParams())); }
    public function createUser(Request $request): void { Response::created('User created.', $this->platform->createUser($request->getBody())); }
    public function updateUser(Request $request, int $id): void { Response::success('User updated.', $this->platform->updateUser($id, $request->getBody())); }
    public function deleteUser(Request $request, int $id): void { $this->platform->deleteUser($id); Response::success('User removed.'); }
    public function resetUser(Request $request, int $id): void { Response::success('Password reset delivery processed.', $this->platform->resetUser($id, $request->getBody())); }
    public function branches(Request $request): void { Response::success('Branches retrieved.', $this->platform->branches($request->getQueryParam('company_id') ? (int)$request->getQueryParam('company_id') : null)); }
}
