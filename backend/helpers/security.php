<?php

if (!function_exists('generate_token')) {
    function generate_token(int $length = 64): string {
        return bin2hex(random_bytes(max(1, $length / 2)));
    }
}

if (!function_exists('hash_password')) {
    function hash_password(string $password): string {
        return password_hash($password, PASSWORD_BCRYPT, ['cost' => 12]);
    }
}

if (!function_exists('verify_password')) {
    function verify_password(string $password, string $hash): bool {
        return password_verify($password, $hash);
    }
}

if (!function_exists('generate_reference')) {
    function generate_reference(string $prefix = 'REF'): string {
        $date = date('Ymd');
        $random = str_pad((string) random_int(0, 99999), 5, '0', STR_PAD_LEFT);
        return sprintf('%s-%s-%s', $prefix, $date, $random);
    }
}

if (!function_exists('mask_sensitive')) {
    function mask_sensitive(string $value, int $visible = 4): string {
        $length = strlen($value);
        if ($length <= $visible) {
            return $value;
        }
        $masked = str_repeat('*', $length - $visible);
        $unmasked = substr($value, -$visible);
        return $masked . $unmasked;
    }
}

if (!function_exists('get_client_ip')) {
    function get_client_ip(): string {
        if (!empty($_SERVER['HTTP_CLIENT_IP'])) {
            return $_SERVER['HTTP_CLIENT_IP'];
        } elseif (!empty($_SERVER['HTTP_X_FORWARDED_FOR'])) {
            $ips = explode(',', $_SERVER['HTTP_X_FORWARDED_FOR']);
            return trim($ips[0]);
        }
        return $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0';
    }
}

if (!function_exists('check_rate_limit')) {
    function check_rate_limit(string $key, int $maxAttempts, int $decaySeconds): bool {
        $cacheDir = __DIR__ . '/../storage/cache/rate_limit';
        if (!is_dir($cacheDir)) {
            @mkdir($cacheDir, 0755, true);
        }
        
        $filename = $cacheDir . '/' . md5($key) . '.json';
        $currentTime = time();
        $attempts = [];
        
        if (file_exists($filename)) {
            $content = file_get_contents($filename);
            if ($content) {
                $attempts = json_decode($content, true) ?: [];
            }
        }
        
        $attempts = array_filter($attempts, fn($timestamp) => $timestamp > ($currentTime - $decaySeconds));
        
        if (count($attempts) >= $maxAttempts) {
            return false;
        }
        
        $attempts[] = $currentTime;
        file_put_contents($filename, json_encode(array_values($attempts)));
        return true;
    }
}
