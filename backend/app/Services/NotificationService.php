<?php

namespace App\Services;

use App\Repositories\NotificationRepository;
use Exception;

class NotificationService
{
    public function __construct(
        private NotificationRepository $notificationRepository
    ) {}

    public function getForUser(int $userId, bool $unreadOnly = false): array
    {
        return $this->notificationRepository->getByUserId($userId, $unreadOnly);
    }

    public function getUnreadCount(int $userId): int
    {
        return $this->notificationRepository->getUnreadCount($userId);
    }

    public function markAsRead(int $id, int $userId): void
    {
        $notification = $this->notificationRepository->findById($id);
        if (!$notification) {
            throw new Exception('Notification not found.');
        }
        if ($notification['user_id'] != $userId) {
            throw new Exception('Unauthorized to access this notification.');
        }

        $this->notificationRepository->markAsRead($id);
    }

    public function markAllAsRead(int $userId): void
    {
        $this->notificationRepository->markAllAsRead($userId);
    }

    public function create(int $userId, string $title, string $message, string $type = 'info', array $data = []): array
    {
        $id = $this->notificationRepository->create([
            'user_id' => $userId,
            'title' => $title,
            'message' => $message,
            'type' => $type,
            'data' => json_encode($data),
            'created_at' => date('Y-m-d H:i:s')
        ]);
        
        return $this->notificationRepository->findById($id);
    }

    public function notifyUser(int $userId, string $title, string $message): void
    {
        $this->create($userId, $title, $message);
    }
}
