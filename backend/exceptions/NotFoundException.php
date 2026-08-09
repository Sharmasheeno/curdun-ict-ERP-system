<?php
namespace Exceptions;

use Core\ApiException;

class NotFoundException extends ApiException {
    public function __construct(string $message = 'Not found') {
        parent::__construct($message, 404);
    }
}
