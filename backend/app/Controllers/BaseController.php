<?php

namespace App\Controllers;

use Core\Request;
use Core\Response;
use Core\Auth;

abstract class BaseController
{
    protected function getAuthUser(): ?array
    {
        return Auth::user();
    }

    protected function getAuthUserId(): ?int
    {
        return Auth::id();
    }

    protected function getPaginationParams(Request $request): array
    {
        $page  = max(1, (int) $request->getQueryParam('page', 1));
        $limit = min(100, max(1, (int) $request->getQueryParam('limit', 20)));
        return [
            'page'   => $page,
            'limit'  => $limit,
            'offset' => ($page - 1) * $limit,
        ];
    }
}
