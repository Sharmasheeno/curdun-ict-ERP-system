<?php

namespace App\Services;

use PHPMailer\PHPMailer\PHPMailer;

class DeliveryService
{
    private array $config;

    public function __construct()
    {
        $this->config = require ROOT_PATH . '/config/delivery.php';
    }

    public function resetLink(string $token): string
    {
        return $this->config['public_url'] . '/app.html?reset=' . rawurlencode($token);
    }

    public function sendResetEmail(array $user, string $token): array
    {
        $link = $this->resetLink($token);
        $name = (string)($user['name'] ?? 'Administrator');
        $text = "Hello {$name},\n\nA password reset was requested for your Curdun account.\n{$link}\n\nThis link expires in 60 minutes. If you did not expect this, contact Curdun support.";
        $html = '<p>Hello ' . htmlspecialchars($name) . ',</p><p>A password reset was requested for your Curdun account.</p>'
            . '<p><a href="' . htmlspecialchars($link) . '" style="background:#2D1859;color:#F5C411;padding:12px 18px;border-radius:8px;text-decoration:none;font-weight:bold">Reset my password</a></p>'
            . '<p>This link expires in 60 minutes. If you did not expect this, contact Curdun support.</p>';
        $result = $this->sendEmail((string)$user['email'], $name, 'Reset your Curdun password', $text, $html);
        $result['destination'] = $this->maskEmail((string)$user['email']);
        $result['preview_link'] = $result['status'] === 'preview' ? $link : null;
        return $result;
    }

    public function sendResetOtp(array $user, string $otp): array
    {
        $phone = trim((string)($user['phone'] ?? ''));
        if ($phone === '') return ['channel'=>'sms','status'=>'failed','message'=>'This administrator has no phone number. Add one before using SMS OTP.'];
        $message = "Curdun password reset OTP: {$otp}. It expires in 10 minutes. Do not share this code.";
        $result = $this->sendSms($phone, $message);
        $result['destination'] = $this->maskPhone($phone);
        $result['preview_otp'] = $result['status'] === 'preview' ? $otp : null;
        return $result;
    }

    public function sendTemporaryCredential(array $user, string $password, string $channel): array
    {
        $name = (string)($user['name'] ?? 'Administrator');
        $loginUrl = $this->config['public_url'] . '/app.html';
        if ($channel === 'sms') {
            $phone = trim((string)($user['phone'] ?? ''));
            if ($phone === '') return ['channel'=>'sms','status'=>'failed','message'=>'No phone number is registered for SMS delivery.'];
            $result = $this->sendSms($phone, "Curdun account: {$user['email']} Temporary password: {$password} Sign in: {$loginUrl} Change it immediately.");
            $result['destination'] = $this->maskPhone($phone);
            return $result;
        }

        $text = "Hello {$name},\n\nYour Curdun company administrator account is ready.\nEmail: {$user['email']}\nTemporary password: {$password}\nSign in: {$loginUrl}\n\nYou must create a new password on first sign-in.";
        $html = '<p>Hello ' . htmlspecialchars($name) . ',</p><p>Your Curdun company administrator account is ready.</p>'
            . '<p><b>Email:</b> ' . htmlspecialchars((string)$user['email']) . '<br><b>Temporary password:</b> <code>' . htmlspecialchars($password) . '</code></p>'
            . '<p><a href="' . htmlspecialchars($loginUrl) . '">Sign in to Curdun</a></p><p>You must create a new password on first sign-in.</p>';
        $result = $this->sendEmail((string)$user['email'], $name, 'Your Curdun administrator account', $text, $html);
        $result['destination'] = $this->maskEmail((string)$user['email']);
        return $result;
    }

    private function sendEmail(string $to, string $name, string $subject, string $text, string $html): array
    {
        $transport = $this->config['mail']['transport'];
        if ($transport === 'log') return $this->writePreview('email', $to, $subject, $text);
        try {
            $mailer = new PHPMailer(true);
            if ($transport === 'smtp') {
                $mailer->isSMTP();
                $mailer->Host = $this->config['mail']['host'];
                $mailer->Port = $this->config['mail']['port'];
                $mailer->SMTPAuth = $this->config['mail']['username'] !== '';
                $mailer->Username = $this->config['mail']['username'];
                $mailer->Password = $this->config['mail']['password'];
                if ($this->config['mail']['encryption'] !== 'none') $mailer->SMTPSecure = $this->config['mail']['encryption'];
            } elseif ($transport === 'mail') {
                $mailer->isMail();
            } else {
                return ['channel'=>'email','status'=>'failed','message'=>'Unsupported email transport.'];
            }
            $mailer->setFrom($this->config['mail']['from_address'], $this->config['mail']['from_name']);
            $mailer->addAddress($to, $name);
            $mailer->Subject = $subject;
            $mailer->Body = $html;
            $mailer->AltBody = $text;
            $mailer->isHTML(true);
            $mailer->send();
            return ['channel'=>'email','status'=>'sent','message'=>'Email sent successfully.'];
        } catch (\Throwable $error) {
            return ['channel'=>'email','status'=>'failed','message'=>'Email delivery failed: ' . $error->getMessage()];
        }
    }

    private function sendSms(string $phone, string $message): array
    {
        if ($this->config['sms']['transport'] === 'log') return $this->writePreview('sms', $phone, 'SMS', $message);
        if ($this->config['sms']['transport'] !== 'http' || $this->config['sms']['url'] === '') {
            return ['channel'=>'sms','status'=>'failed','message'=>'SMS gateway is not configured.'];
        }
        try {
            $curl = curl_init($this->config['sms']['url']);
            curl_setopt_array($curl, [
                CURLOPT_POST => true, CURLOPT_RETURNTRANSFER => true, CURLOPT_TIMEOUT => 15,
                CURLOPT_HTTPHEADER => ['Content-Type: application/json', 'Authorization: Bearer ' . $this->config['sms']['token']],
                CURLOPT_POSTFIELDS => json_encode(['to'=>$phone,'message'=>$message,'sender'=>$this->config['sms']['sender']]),
            ]);
            $body = curl_exec($curl);
            $code = (int)curl_getinfo($curl, CURLINFO_HTTP_CODE);
            $error = curl_error($curl);
            curl_close($curl);
            if ($body === false || $code < 200 || $code >= 300) throw new \RuntimeException($error ?: "Gateway returned HTTP {$code}.");
            return ['channel'=>'sms','status'=>'sent','message'=>'SMS sent successfully.'];
        } catch (\Throwable $error) {
            return ['channel'=>'sms','status'=>'failed','message'=>'SMS delivery failed: ' . $error->getMessage()];
        }
    }

    private function writePreview(string $channel, string $destination, string $subject, string $message): array
    {
        $dir = dirname($this->config['outbox']);
        if (!is_dir($dir)) mkdir($dir, 0775, true);
        file_put_contents($this->config['outbox'], json_encode([
            'created_at'=>date(DATE_ATOM),'channel'=>$channel,'destination'=>$destination,'subject'=>$subject,'message'=>$message,
        ], JSON_UNESCAPED_SLASHES) . PHP_EOL, FILE_APPEND | LOCK_EX);
        return ['channel'=>$channel,'status'=>'preview','message'=>'Provider is in local preview mode; delivery was written to the secure development outbox.'];
    }

    private function maskEmail(string $email): string
    {
        [$local, $domain] = array_pad(explode('@', $email, 2), 2, '');
        return substr($local, 0, 2) . str_repeat('*', max(2, strlen($local)-2)) . '@' . $domain;
    }

    private function maskPhone(string $phone): string
    {
        return str_repeat('*', max(0, strlen($phone)-4)) . substr($phone, -4);
    }
}
