<?php

namespace Tests\Unit;

use PHPUnit\Framework\TestCase;
use Core\Response;

class ResponseTest extends TestCase
{
    public function testResponseStructure()
    {
        $this->assertTrue(class_exists('Core\Response'));
        $this->assertTrue(method_exists('Core\Response', 'success'));
        $this->assertTrue(method_exists('Core\Response', 'error'));
        $this->assertTrue(method_exists('Core\Response', 'json'));
    }
}
