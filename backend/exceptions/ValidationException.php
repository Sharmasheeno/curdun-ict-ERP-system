<?php
namespace Exceptions;

use Core\ApiException;

class ValidationException extends ApiException {
    public function __construct(array $errors, string $message = 'Validation failed') {
        parent::__construct($message, 422, $errors);
    }
}
