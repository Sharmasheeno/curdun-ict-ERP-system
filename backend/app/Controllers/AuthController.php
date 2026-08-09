<?php

namespace App\Controllers;

use Core\Request;
use Core\Response;
use Core\Auth;
use Core\Session;
use App\Services\AuthService;

class AuthController extends BaseController
{
    public function __construct(private AuthService $authService) {}

    public function login(Request $request): void
    {
        $data = $request->getBody();
        $email    = $data['email'] ?? '';
        $password = $data['password'] ?? '';

        if (empty($email) || empty($password)) {
            Response::error('Email and password are required.', ['email' => 'Required', 'password' => 'Required'], 400);
            return;
        }

        $ip        = $request->getIp();
        $userAgent = $request->getUserAgent();

        $user = $this->authService->login($email, $password, $ip, $userAgent);
        Response::success('Login successful.', $user);
    }

    public function pinLogin(Request $request): void
    {
        $data     = $request->getBody();
        $pin      = (string)($data['pin'] ?? '');
        $branchId = isset($data['branch_id']) ? (int)$data['branch_id'] : null;

        if ($pin === '') {
            Response::error('PIN is required.', ['pin' => 'Required'], 400);
            return;
        }

        $ip        = $request->getIp();
        $userAgent = $request->getUserAgent();

        $result = $this->authService->pinLogin($pin, $branchId, $ip, $userAgent);
        Response::success('PIN login successful.', $result);
    }

    public function logout(Request $request): void
    {
        $userId = $this->getAuthUserId();
        $this->authService->logout($userId);
        Response::success('Logged out successfully.');
    }

    public function me(Request $request): void
    {
        $user = $this->authService->me();
        Response::success('Authenticated user retrieved.', $user);
    }

    public function forgotPassword(Request $request): void
    {
        $email = $request->getBodyParam('email', '');
        if (empty($email)) {
            Response::error('Email is required.', null, 400);
            return;
        }
        // Always return 200 to avoid user enumeration
        $this->authService->forgotPassword($email);
        Response::success('If that email exists, a reset link has been sent.');
    }

    public function resetPassword(Request $request): void
    {
        $token    = $request->getBodyParam('token', '');
        $password = $request->getBodyParam('password', '');
        $confirm  = $request->getBodyParam('password_confirmation', '');

        if (empty($token) || empty($password)) {
            Response::error('Token and password are required.', null, 400);
            return;
        }
        if ($password !== $confirm) {
            Response::validationError(['password_confirmation' => ['Passwords do not match.']]);
            return;
        }

        $this->authService->resetPassword($token, $password);
        Response::success('Password reset successfully.');
    }
}
