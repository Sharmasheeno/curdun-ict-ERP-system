<?php
namespace Core;

use Closure;

class Router {
    private array $routes = [];
    private array $groupStack = [];

    public function get(string $pattern, $handler): void {
        $this->addRoute('GET', $pattern, $handler);
    }

    public function post(string $pattern, $handler): void {
        $this->addRoute('POST', $pattern, $handler);
    }

    public function put(string $pattern, $handler): void {
        $this->addRoute('PUT', $pattern, $handler);
    }

    public function patch(string $pattern, $handler): void {
        $this->addRoute('PATCH', $pattern, $handler);
    }

    public function delete(string $pattern, $handler): void {
        $this->addRoute('DELETE', $pattern, $handler);
    }

    public function group(string $prefix, callable $callback, array $middlewares = []): void {
        $parent = end($this->groupStack) ?: ['prefix' => '', 'middlewares' => []];
        
        $this->groupStack[] = [
            'prefix' => $parent['prefix'] . $prefix,
            'middlewares' => array_merge($parent['middlewares'], $middlewares)
        ];

        $callback($this);

        array_pop($this->groupStack);
    }

    private function addRoute(string $method, string $pattern, $handler): void {
        $group = end($this->groupStack) ?: ['prefix' => '', 'middlewares' => []];
        
        $pattern = $group['prefix'] . $pattern;
        $pattern = rtrim($pattern, '/') ?: '/';
        
        $this->routes[] = [
            'method' => $method,
            'pattern' => $pattern,
            'handler' => $handler,
            'middlewares' => $group['middlewares']
        ];
    }

    public function dispatch(Request $request): void {
        $uri = $request->getUri();
        $method = $request->getMethod();
        
        $routeMatch = null;
        $params = [];
        $methodNotAllowed = false;

        foreach ($this->routes as $route) {
            $pattern = preg_replace('/\{([a-zA-Z0-9_]+)\}/', '(?P<\1>[a-zA-Z0-9_-]+)', $route['pattern']);
            $pattern = '#^' . $pattern . '$#';

            if (preg_match($pattern, $uri, $matches)) {
                if ($route['method'] !== $method) {
                    $methodNotAllowed = true;
                    continue;
                }

                $routeMatch = $route;
                foreach ($matches as $key => $value) {
                    if (is_string($key)) {
                        $params[$key] = $value;
                    }
                }
                break;
            }
        }

        if (!$routeMatch) {
            if ($methodNotAllowed) {
                Response::error('Method not allowed', null, 405);
            }
            Response::notFound();
        }

        $handler = $routeMatch['handler'];
        $middlewares = $routeMatch['middlewares'];

        $this->runMiddlewares($middlewares, $request, function ($req) use ($handler, $params) {
            if ($handler instanceof Closure) {
                return call_user_func_array($handler, [$req, ...array_values($params)]);
            }

            if (is_array($handler) && count($handler) === 2) {
                [$class, $method] = $handler;
                $controller = $this->resolve($class);
                // Inject the Request object first if the method's first param expects one;
                // otherwise just pass URL params.
                $args = $this->buildMethodArgs($controller, $method, $req, $params);
                return call_user_func_array([$controller, $method], $args);
            }

            throw new \RuntimeException('Invalid route handler.');
        });
    }

    /**
     * Simple reflection-based DI: instantiate $class, recursively resolving
     * its constructor parameters from their type hints. Concrete class type
     * hints are `new`'d up (also recursively). Nullable / optional scalar
     * params fall back to their default. Singletons for stateful services
     * (Database, Session, Auth) live in $this->instances so the same
     * connection/session is reused across the request.
     */
    private array $instances = [];

    /**
     * Build the argument list for a controller method. If the first parameter's
     * type hint is Request, we inject the current request object; the remaining
     * parameters get filled in order from the URL params.
     */
    private function buildMethodArgs(object $controller, string $method, Request $request, array $urlParams): array
    {
        $refl = new \ReflectionMethod($controller, $method);
        $params = $refl->getParameters();
        if (empty($params)) return [];

        $args = [];
        $urlValues = array_values($urlParams);
        $urlIdx = 0;
        foreach ($params as $p) {
            $type = $p->getType();
            if ($type instanceof \ReflectionNamedType && !$type->isBuiltin() && $type->getName() === Request::class) {
                $args[] = $request;
                continue;
            }
            $args[] = $urlValues[$urlIdx++] ?? ($p->isDefaultValueAvailable() ? $p->getDefaultValue() : null);
        }
        return $args;
    }

    private function resolve(string $class): object
    {
        if (isset($this->instances[$class])) {
            return $this->instances[$class];
        }

        // Core singletons with private constructors expose getInstance().
        if ($class === Database::class) {
            $obj = Database::getInstance();
            $this->instances[$class] = $obj;
            return $obj;
        }

        $refl = new \ReflectionClass($class);
        if (!$refl->isInstantiable()) {
            if (method_exists($class, 'getInstance')) {
                $obj = $class::getInstance();
                $this->instances[$class] = $obj;
                return $obj;
            }
            throw new \RuntimeException("Cannot instantiate {$class}");
        }

        $ctor = $refl->getConstructor();
        if (!$ctor || $ctor->getNumberOfParameters() === 0) {
            $obj = new $class();
        } else {
            $args = [];
            foreach ($ctor->getParameters() as $p) {
                $type = $p->getType();
                if ($type instanceof \ReflectionNamedType && !$type->isBuiltin()) {
                    $args[] = $this->resolve($type->getName());
                } elseif ($p->isDefaultValueAvailable()) {
                    $args[] = $p->getDefaultValue();
                } elseif ($p->allowsNull()) {
                    $args[] = null;
                } else {
                    throw new \RuntimeException(
                        "Cannot resolve parameter \${$p->getName()} of {$class}"
                    );
                }
            }
            $obj = $refl->newInstanceArgs($args);
        }

        // Cache stateful core services so we don't reconnect per resolve.
        if (in_array($class, [Database::class, Session::class, Auth::class, Validator::class, Logger::class], true)) {
            $this->instances[$class] = $obj;
        }
        return $obj;
    }

    private function runMiddlewares(array $middlewares, Request $request, callable $target) {
        $next = $target;
        
        foreach (array_reverse($middlewares) as $middleware) {
            $next = function ($req) use ($middleware, $next) {
                if (is_string($middleware)) {
                    $middlewareInstance = $this->resolve($middleware);
                    return $middlewareInstance->handle($req, $next);
                } elseif (is_object($middleware) && method_exists($middleware, 'handle')) {
                    return $middleware->handle($req, $next);
                } elseif (is_callable($middleware)) {
                    return $middleware($req, $next);
                }
                throw new \RuntimeException('Invalid middleware.');
            };
        }
        
        return $next($request);
    }
}
