<?php

if (!function_exists('format_currency')) {
    function format_currency(float $amount, string $currency = 'USD', int $decimals = 2): string {
        return $currency . ' ' . number_format($amount, $decimals);
    }
}

if (!function_exists('format_date')) {
    function format_date(string $date, string $format = 'd M Y'): string {
        $d = strtotime($date);
        return $d ? date($format, $d) : $date;
    }
}

if (!function_exists('format_datetime')) {
    function format_datetime(string $datetime, string $format = 'd M Y H:i'): string {
        $d = strtotime($datetime);
        return $d ? date($format, $d) : $datetime;
    }
}

if (!function_exists('format_number')) {
    function format_number(float $number, int $decimals = 2): string {
        return number_format($number, $decimals);
    }
}

if (!function_exists('truncate_string')) {
    function truncate_string(string $str, int $length = 100): string {
        if (mb_strlen($str) <= $length) {
            return $str;
        }
        return mb_substr($str, 0, $length) . '...';
    }
}

if (!function_exists('generate_code')) {
    function generate_code(string $prefix, int $number, int $pad = 5): string {
        return $prefix . '-' . str_pad((string)$number, $pad, '0', STR_PAD_LEFT);
    }
}

if (!function_exists('bytes_to_human')) {
    function bytes_to_human(int $bytes): string {
        $units = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
        $i = 0;
        while ($bytes > 1024 && $i < count($units) - 1) {
            $bytes /= 1024;
            $i++;
        }
        return round($bytes, 2) . ' ' . $units[$i];
    }
}
