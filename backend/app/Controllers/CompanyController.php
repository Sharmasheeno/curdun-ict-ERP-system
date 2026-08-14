<?php

namespace App\Controllers;

use Core\Request;
use Core\Response;
use App\Services\CompanyService;

class CompanyController extends BaseController
{
    private CompanyService $companyService;

    public function __construct(CompanyService $companyService)
    {
        $this->companyService = $companyService;
    }

    public function index(Request $request)
    {
        $params = $this->getPaginationParams($request);
        $data = $this->companyService->getCompanies($params['page'], $params['limit']);
        return Response::json(true, 'Companies retrieved successfully', $data, null, 200);
    }

    public function show(Request $request, int $id)
    {
        $company = $this->companyService->getCompanyById($id);
        if (!$company) {
            return Response::json(false, 'Company not found', null, null, 404);
        }
        return Response::json(true, 'Company retrieved successfully', $company, null, 200);
    }

    public function store(Request $request)
    {
        $data = $request->all();
        $company = $this->companyService->create($data);
        return Response::json(true, 'Company created successfully', $company, null, 201);
    }

    public function update(Request $request, int $id)
    {
        $data = $request->all();
        $company = $this->companyService->update($id, $data);
        return Response::json(true, 'Company updated successfully', $company, null, 200);
    }

    public function destroy(Request $request, int $id)
    {
        $this->companyService->delete($id);
        return Response::json(true, 'Company deleted successfully', null, null, 200);
    }
}
