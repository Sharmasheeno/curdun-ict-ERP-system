<?php

namespace App\Controllers;

use Core\Request;
use Core\Response;
use App\Services\SettingsService;

class SettingsController extends BaseController
{
    public function __construct(private SettingsService $settingsService) {}

    public function index(Request $request): void
    {
        $settings = $this->settingsService->getAll();
        Response::success('Settings retrieved successfully.', $settings);
    }

    public function update(Request $request): void
    {
        $settings = $request->getBodyParam('settings', []);
        if (empty($settings)) {
            Response::error('Settings data is required.', null, 400);
            return;
        }
        $this->settingsService->setBulk($settings);
        Response::success('Settings updated successfully.');
    }
}
