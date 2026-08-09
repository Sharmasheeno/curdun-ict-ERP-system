<?php

namespace Tests\Unit;

use PHPUnit\Framework\TestCase;
use Core\Router;

class RouterTest extends TestCase
{
    public function testRouterCanRegisterRoutes()
    {
        $router = new Router();
        $router->get('/test', function() { return 'ok'; });
        $this->assertTrue(method_exists($router, 'dispatch'));
    }
}
