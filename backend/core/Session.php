<?php
namespace Core;

class Session {
    public static function start(): void {
        if (session_status() === PHP_SESSION_NONE) {
            $lifetime = defined('SESSION_LIFETIME') ? SESSION_LIFETIME : 7200;
            
            // Cookie 'domain' must be a host without port. An empty string
            // ('' — not '0') tells the browser to use the current host,
            // which is what we want for both localhost:8000 and production.
            $host = $_SERVER['HTTP_HOST'] ?? '';
            $cookieDomain = strpos($host, ':') !== false ? '' : $host;

            session_set_cookie_params([
                'lifetime' => $lifetime,
                'path' => '/',
                'domain' => $cookieDomain,
                'secure' => isset($_SERVER['HTTPS']),
                'httponly' => true,
                'samesite' => 'Strict'
            ]);

            session_start();
            
            if (self::isExpired()) {
                self::destroy();
                session_start();
            }
            
            self::updateActivity();
        }
    }

    public static function set(string $key, mixed $value): void {
        $_SESSION[$key] = $value;
    }

    public static function get(string $key, mixed $default = null): mixed {
        return $_SESSION[$key] ?? $default;
    }

    public static function has(string $key): bool {
        return isset($_SESSION[$key]);
    }

    public static function remove(string $key): void {
        unset($_SESSION[$key]);
    }

    public static function destroy(): void {
        $_SESSION = [];
        if (ini_get("session.use_cookies")) {
            $params = session_get_cookie_params();
            setcookie(session_name(), '', time() - 42000,
                $params["path"], $params["domain"],
                $params["secure"], $params["httponly"]
            );
        }
        session_destroy();
    }

    public static function regenerate(): void {
        session_regenerate_id(true);
    }

    public static function isExpired(): bool {
        $lastActivity = self::get('last_activity');
        $lifetime = defined('SESSION_LIFETIME') ? SESSION_LIFETIME : 7200;
        if ($lastActivity && (time() - $lastActivity > $lifetime)) {
            return true;
        }
        return false;
    }

    public static function updateActivity(): void {
        self::set('last_activity', time());
    }
}
