<?php
namespace Core;

class Logger {
    private static function getLogFile(): string {
        $basePath = defined('ROOT_PATH') ? ROOT_PATH : __DIR__ . '/..';
        $logDir = $basePath . '/storage/logs';
        if (!is_dir($logDir)) {
            @mkdir($logDir, 0777, true);
        }
        
        $logFile = $logDir . '/app.log';
        if (file_exists($logFile) && filesize($logFile) > 10 * 1024 * 1024) {
            @rename($logFile, $logFile . '.old');
        }
        
        return $logFile;
    }

    public static function log(string $level, string $message, array $context = []): void {
        try {
            $file = self::getLogFile();
            $date = date('Y-m-d H:i:s');
            $contextStr = empty($context) ? '' : json_encode($context, JSON_UNESCAPED_UNICODE);
            $logLine = "[$date] [$level] $message $contextStr" . PHP_EOL;
            @file_put_contents($file, $logLine, FILE_APPEND);
        } catch (\Throwable $e) {
            // Fail silently
        }
    }

    public static function info(string $message, array $context = []): void {
        self::log('INFO', $message, $context);
    }

    public static function warning(string $message, array $context = []): void {
        self::log('WARNING', $message, $context);
    }

    public static function error(string $message, array $context = []): void {
        self::log('ERROR', $message, $context);
    }

    public static function debug(string $message, array $context = []): void {
        self::log('DEBUG', $message, $context);
    }
}
