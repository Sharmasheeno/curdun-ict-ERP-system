<?php

namespace App\Controllers;

use Core\Request;
use Core\Response;
use App\Services\AuditService;

class AuditLogController extends BaseController
{
    public function __construct(private AuditService $auditService) {}

    public function index(Request $request): void
    {
        $pagination = $this->getPaginationParams($request);
        $filters = array_merge($request->getQueryParams(), $pagination);
        $logs = $this->auditService->getAll($filters);
        Response::success('Audit logs retrieved successfully.', $logs);
    }

    public function show(Request $request, int $id): void
    {
        $pagination = $this->getPaginationParams($request);
        $filters = array_merge($request->getQueryParams(), ['id' => $id], $pagination);
        $logs = $this->auditService->getAll($filters);
        $log = $logs['items'][0] ?? null;

        if (!$log) {
            Response::notFound('Audit log entry not found.');
            return;
        }

        Response::success('Audit log entry retrieved successfully.', $log);
    }
}
