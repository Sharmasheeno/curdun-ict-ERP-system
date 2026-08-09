<?php
namespace Core;

class Request {
    private array $body;

    public function __construct() {
        $this->parseBody();
    }

    private function parseBody(): void {
        $this->body = $_POST;
        $input = file_get_contents('php://input');
        if (!empty($input)) {
            $decoded = json_decode($input, true);
            if (json_last_error() === JSON_ERROR_NONE && is_array($decoded)) {
                $this->body = array_merge($this->body, $decoded);
            }
        }
    }

    public function getMethod(): string {
        return strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET');
    }

    public function getUri(): string {
        $uri = $_SERVER['REQUEST_URI'] ?? '/';
        $pos = strpos($uri, '?');
        if ($pos !== false) {
            $uri = substr($uri, 0, $pos);
        }
        return rtrim($uri, '/') ?: '/';
    }

    public function getQueryParams(): array {
        return $_GET;
    }

    public function getBody(): array {
        return $this->body;
    }

    public function getBodyParam(string $key, mixed $default = null): mixed {
        return $this->body[$key] ?? $default;
    }

    public function getQueryParam(string $key, mixed $default = null): mixed {
        return $_GET[$key] ?? $default;
    }

    public function getHeader(string $name): ?string {
        $headers = $this->getHeaders();
        $name = strtolower($name);
        foreach ($headers as $key => $value) {
            if (strtolower($key) === $name) {
                return $value;
            }
        }
        return null;
    }

    public function getHeaders(): array {
        if (function_exists('getallheaders')) {
            return getallheaders();
        }
        $headers = [];
        foreach ($_SERVER as $name => $value) {
            if (strpos($name, 'HTTP_') === 0) {
                $headers[str_replace(' ', '-', ucwords(strtolower(str_replace('_', ' ', substr($name, 5)))))] = $value;
            }
        }
        return $headers;
    }

    public function getFiles(): array {
        return $_FILES;
    }

    public function getIp(): string {
        return $_SERVER['HTTP_CLIENT_IP'] ?? $_SERVER['HTTP_X_FORWARDED_FOR'] ?? $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0';
    }

    public function getUserAgent(): ?string {
        return $_SERVER['HTTP_USER_AGENT'] ?? null;
    }

    public function getBearerToken(): ?string {
        $authHeader = $this->getHeader('Authorization');
        if ($authHeader && preg_match('/Bearer\s(\S+)/', $authHeader, $matches)) {
            return $matches[1];
        }
        return null;
    }

    public function getParam(string $key, mixed $default = null): mixed {
        if (array_key_exists($key, $this->body)) {
            return $this->body[$key];
        }
        if (array_key_exists($key, $_GET)) {
            return $_GET[$key];
        }
        return $default;
    }

    public function all(): array {
        return array_merge($_GET, $this->body);
    }
}
