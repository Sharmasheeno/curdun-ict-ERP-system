<?php

namespace App\Services;

use App\Repositories\SettingsRepository;

class SettingsService
{
    public function __construct(
        private SettingsRepository $settingsRepository
    ) {}

    public function getAll(?int $companyId = null): array
    {
        return $this->settingsRepository->getAll($companyId);
    }

    public function get(string $key, ?int $companyId = null, mixed $default = null): mixed
    {
        $setting = $this->settingsRepository->findByKey($key, $companyId);
        
        if (!$setting) {
            return $default;
        }

        $val = $setting['value'];
        return match($setting['type']) {
            'integer' => (int) $val,
            'boolean' => filter_var($val, FILTER_VALIDATE_BOOLEAN),
            'json' => json_decode($val, true),
            'float' => (float) $val,
            default => $val
        };
    }

    public function set(string $key, mixed $value, ?int $companyId = null, string $type = 'string'): void
    {
        if (is_array($value) || is_object($value)) {
            $value = json_encode($value);
            $type = 'json';
        } elseif (is_bool($value)) {
            $value = $value ? '1' : '0';
            $type = 'boolean';
        } else {
            $value = (string) $value;
        }

        $this->settingsRepository->updateOrCreate($key, $value, $companyId, $type);
    }

    public function setBulk(array $settings, ?int $companyId = null): void
    {
        foreach ($settings as $key => $value) {
            $this->set($key, $value, $companyId);
        }
    }
}
