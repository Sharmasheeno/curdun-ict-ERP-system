<?php

if (!function_exists('validate_required')) {
    function validate_required(array $data, array $fields): array {
        $missing = [];
        foreach ($fields as $field) {
            if (!isset($data[$field]) || (is_string($data[$field]) && trim($data[$field]) === '')) {
                $missing[] = $field;
            }
        }
        return $missing;
    }
}

if (!function_exists('sanitize_string')) {
    function sanitize_string(string $value): string {
        return trim(strip_tags(htmlspecialchars($value, ENT_QUOTES, 'UTF-8')));
    }
}

if (!function_exists('sanitize_email')) {
    function sanitize_email(string $email): string {
        return filter_var(trim($email), FILTER_SANITIZE_EMAIL);
    }
}

if (!function_exists('is_valid_email')) {
    function is_valid_email(string $email): bool {
        return filter_var($email, FILTER_VALIDATE_EMAIL) !== false;
    }
}

if (!function_exists('is_valid_phone')) {
    function is_valid_phone(string $phone): bool {
        return (bool) preg_match('/^\+?[0-9]{7,15}$/', trim($phone));
    }
}

if (!function_exists('is_valid_date')) {
    function is_valid_date(string $date, string $format = 'Y-m-d'): bool {
        $d = DateTime::createFromFormat($format, $date);
        return $d && $d->format($format) === $date;
    }
}
