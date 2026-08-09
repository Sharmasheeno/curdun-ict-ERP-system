<?php
namespace Exceptions;

use Core\ApiException;

class ConflictException extends ApiException {
    public function __construct(string $message = 'Conflict') {
        parent::__construct($message, 409);
    }
}
