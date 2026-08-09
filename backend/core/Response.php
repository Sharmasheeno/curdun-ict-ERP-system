<?php
namespace Core;

class Response {
    /**
     * Two calling shapes supported:
     *   Response::json(array $data, int $status = 200)                                 — raw JSON
     *   Response::json(bool $success, string $message, mixed $data = null,
     *                  mixed $errors = null, int $status = 200)                         — envelope
     * The second form is what the app Controllers use.
     */
    public static function json(mixed ...$args): never {
        // Envelope form: json(true, 'Message', $data, $errors, $status)
        if (isset($args[0]) && is_bool($args[0])) {
            $success = $args[0];
            $message = (string)($args[1] ?? '');
            $data    = $args[2] ?? null;
            $errors  = $args[3] ?? null;
            $status  = (int)($args[4] ?? 200);
            self::envelope($success, $message, $data, $errors, $status);
        }
        // Raw form: json($data, $status)
        $data   = $args[0] ?? [];
        $status = (int)($args[1] ?? 200);
        http_response_code($status);
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode($data, JSON_UNESCAPED_UNICODE);
        exit;
    }

    private static function envelope(bool $success, string $message, mixed $data, mixed $errors, int $status): never {
        http_response_code($status);
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode([
            'success' => $success,
            'message' => $message,
            'data'    => $data,
            'errors'  => $errors,
        ], JSON_UNESCAPED_UNICODE);
        exit;
    }

    public static function success(string $message, mixed $data = null, int $statusCode = 200): never {
        self::json([
            'success' => true,
            'message' => $message,
            'data' => $data,
            'errors' => null
        ], $statusCode);
    }

    public static function created(string $message, mixed $data = null): never {
        self::success($message, $data, 201);
    }

    public static function noContent(): never {
        http_response_code(204);
        exit;
    }

    public static function error(string $message, mixed $errors = null, int $statusCode = 400): never {
        self::json([
            'success' => false,
            'message' => $message,
            'data' => null,
            'errors' => $errors
        ], $statusCode);
    }

    public static function unauthorized(string $message = 'Unauthorized'): never {
        self::error($message, null, 401);
    }

    public static function forbidden(string $message = 'Forbidden'): never {
        self::error($message, null, 403);
    }

    public static function notFound(string $message = 'Not found'): never {
        self::error($message, null, 404);
    }

    public static function conflict(string $message = 'Conflict'): never {
        self::error($message, null, 409);
    }

    public static function validationError(array $errors, string $message = 'Validation failed'): never {
        self::error($message, $errors, 422);
    }

    public static function tooManyRequests(string $message = 'Too many requests'): never {
        self::error($message, null, 429);
    }

    public static function serverError(string $message = 'Internal server error'): never {
        self::error($message, null, 500);
    }
}
