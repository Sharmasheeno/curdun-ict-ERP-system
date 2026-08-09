<?php
namespace Exceptions;

use Core\ApiException;

class AuthenticationException extends ApiException {
    public function __construct(string $message = 'Unauthorized') {
        parent::__construct($message, 401);
    }
}
