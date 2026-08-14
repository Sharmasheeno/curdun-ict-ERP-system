<?php

namespace App\Controllers;

use Core\Request;
use Core\Response;
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
        $userId   = isset($data['user_id']) ? (int)$data['user_id'] : null;

        if ($pin === '') {
            Response::error('PIN is required.', ['pin' => 'Required'], 400);
            return;
        }

        $ip        = $request->getIp();
        $userAgent = $request->getUserAgent();

        $result = $this->authService->pinLogin($pin, $branchId, $userId, $ip, $userAgent);
        Response::success('PIN login successful.', $result);
    }

    public function verifyManagerPin(Request $request): void
    {
        $data     = $request->getBody();
        $pin      = (string)($data['pin'] ?? '');
        $action   = (string)($data['action'] ?? '');
        $reason   = trim((string)($data['reason'] ?? ''));
        $branchId = isset($data['branch_id']) ? (int)$data['branch_id'] : null;

        if ($pin === '' || $action === '') {
            Response::error('PIN and action are required.', ['pin'=>'Required','action'=>'Required'], 400);
            return;
        }

        $ip = $request->getIp();
        $result = $this->authService->verifyManagerPin($pin, $action, $reason, $branchId, $ip);
        Response::success('Manager approval recorded.', $result);
    }

    /**
     * Drop the currently-active POS cashier (Lock button) WITHOUT logging
     * the account holder out. The browser session stays valid for whoever
     * PINned in with email + password originally, so another cashier can
     * simply PIN in and take over the terminal.
     */
    public function posLock(Request $request): void
    {
        $cashier = \Core\Auth::posCashier();
        \Core\Session::remove('pos_cashier');
        if ($cashier) {
            $this->authService->auditCashierLock((int)$cashier['id'], $request->getIp());
        }
        Response::success('POS cashier locked.', [
            'account_still_signed_in' => \Core\Auth::user() !== null,
        ]);
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

    public function changePassword(Request $request): void
    {
        $password = (string)$request->getBodyParam('password', '');
        $confirm = (string)$request->getBodyParam('password_confirmation', '');
        if ($password === '' || $password !== $confirm) {
            Response::validationError(['password_confirmation' => ['Passwords do not match.']]);
        }
        $user = $this->authService->changeOwnPassword((int)$this->getAuthUserId(), $password);
        Response::success('Password changed successfully.', $user);
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

    public function verifyResetOtp(Request $request): void
    {
        $email = strtolower(trim((string)$request->getBodyParam('email', '')));
        $otp = trim((string)$request->getBodyParam('otp', ''));
        $token = $this->authService->verifyResetOtp($email, $otp);
        Response::success('OTP verified.', ['token'=>$token]);
    }
}
