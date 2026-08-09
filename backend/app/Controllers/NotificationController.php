<?php

namespace App\Controllers;

use Core\Request;
use Core\Response;
use App\Services\NotificationService;

class NotificationController extends BaseController
{
    public function __construct(private NotificationService $notificationService) {}

    public function index(Request $request): void
    {
        $userId = $this->getAuthUserId();
        $unreadOnly = (bool) $request->getQueryParam('unread_only', false);
        $notifications = $this->notificationService->getForUser($userId, $unreadOnly);
        Response::success('Notifications retrieved successfully.', $notifications);
    }

    public function count(Request $request): void
    {
        $userId = $this->getAuthUserId();
        $count = $this->notificationService->getUnreadCount($userId);
        Response::success('Unread notification count retrieved.', ['count' => $count]);
    }

    public function markRead(Request $request, int $id): void
    {
        $userId = $this->getAuthUserId();
        $this->notificationService->markAsRead($id, $userId);
        Response::success('Notification marked as read.');
    }

    public function markAllRead(Request $request): void
    {
        $userId = $this->getAuthUserId();
        $this->notificationService->markAllAsRead($userId);
        Response::success('All notifications marked as read.');
    }
}
