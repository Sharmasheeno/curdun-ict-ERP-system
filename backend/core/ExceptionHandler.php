<?php
namespace Core;

use Throwable;
use PDOException;
use Exceptions\ValidationException;
use Exceptions\AuthenticationException;
use Exceptions\AuthorizationException;
use Exceptions\NotFoundException;
use Exceptions\ConflictException;

class ExceptionHandler {
    public static function handle(Throwable $e): void {
        $isDebug = defined('DEBUG') && DEBUG;

        if ($e instanceof ValidationException) {
            Response::validationError($e->getErrors(), $e->getMessage());
        }

        if ($e instanceof AuthenticationException) {
            Response::unauthorized($e->getMessage());
        }

        if ($e instanceof AuthorizationException) {
            Response::forbidden($e->getMessage());
        }

        if ($e instanceof NotFoundException) {
            Response::notFound($e->getMessage());
        }

        if ($e instanceof ConflictException) {
            Response::conflict($e->getMessage());
        }

        if ($e instanceof ApiException) {
            Response::error($e->getMessage(), $e->getErrors(), $e->getStatusCode());
        }

        // Log server errors
        Logger::error($e->getMessage(), [
            'file' => $e->getFile(),
            'line' => $e->getLine(),
            'trace' => $e->getTraceAsString()
        ]);

        if ($e instanceof PDOException) {
            $message = $isDebug ? $e->getMessage() : 'Database error occurred.';
            Response::serverError($message);
        }

        // If the exception carries an HTTP-like code (400-599), honor it —
        // service-layer domain errors (auth, validation, not-found) throw
        // plain \Exception with codes like 400/401/404/409/429.
        $code = (int) $e->getCode();
        $status = ($code >= 400 && $code < 600) ? $code : 500;

        $message = ($status < 500 || $isDebug) ? $e->getMessage() : 'Internal server error';
        $errors = ($isDebug && $status >= 500) ? [
            'file'  => $e->getFile(),
            'line'  => $e->getLine(),
            'trace' => explode("\n", $e->getTraceAsString()),
        ] : null;

        Response::error($message, $errors, $status);
    }
}
