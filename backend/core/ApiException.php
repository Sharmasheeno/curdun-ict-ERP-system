<?php
namespace Core;

use RuntimeException;

class ApiException extends RuntimeException {
    protected int $statusCode;
    protected array $errors;

    public function __construct(string $message, int $statusCode = 400, array $errors = []) {
        parent::__construct($message);
        $this->statusCode = $statusCode;
        $this->errors = $errors;
    }

    public function getStatusCode(): int {
        return $this->statusCode;
    }

    public function getErrors(): array {
        return $this->errors;
    }
}
