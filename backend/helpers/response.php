<?php

use Core\Response;

if (!function_exists('api_success')) {
    function api_success(string $message, mixed $data = null, int $code = 200) {
        return Response::success($message, $data, $code);
    }
}

if (!function_exists('api_error')) {
    function api_error(string $message, mixed $errors = null, int $code = 400) {
        return Response::error($message, $errors, $code);
    }
}

if (!function_exists('api_created')) {
    function api_created(string $message, mixed $data = null) {
        return Response::created($message, $data);
    }
}

if (!function_exists('api_not_found')) {
    function api_not_found(string $message = 'Resource not found') {
        return Response::notFound($message);
    }
}

if (!function_exists('api_unauthorized')) {
    function api_unauthorized(string $message = 'Unauthorized') {
        return Response::unauthorized($message);
    }
}

if (!function_exists('api_forbidden')) {
    function api_forbidden(string $message = 'Forbidden') {
        return Response::forbidden($message);
    }
}

if (!function_exists('api_validation_error')) {
    function api_validation_error(array $errors, string $message = 'Validation failed') {
        return Response::validationError($errors, $message);
    }
}

if (!function_exists('paginated_response')) {
    function paginated_response(string $message, array $items, int $page, int $limit, int $total) {
        $meta = build_pagination_meta($page, $limit, $total);
        return Response::success($message, [
            'items' => $items,
            'meta' => $meta
        ]);
    }
}
