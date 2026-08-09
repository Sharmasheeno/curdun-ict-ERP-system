<?php
namespace Exceptions;

use Core\ApiException;

class AuthorizationException extends ApiException {
    public function __construct(string $message = 'Forbidden') {
        parent::__construct($message, 403);
    }
}
