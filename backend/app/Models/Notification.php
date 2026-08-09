<?php

namespace App\Models;

class Notification extends BaseModel
{
    protected string $table = 'notifications';
    protected array $fillable = [
        'user_id', 
        'title', 
        'message', 
        'type', 
        'is_read', 
        'read_at', 
        'data'
    ];

    public function markAsRead(int $id): bool
    {
        $sql = "UPDATE {$this->table} SET is_read = 1, read_at = NOW() WHERE id = :id";
        $stmt = $this->pdo()->prepare($sql);
        return $stmt->execute(['id' => $id]);
    }

    public function markAllAsRead(int $userId): bool
    {
        $sql = "UPDATE {$this->table} SET is_read = 1, read_at = NOW() WHERE user_id = :user_id AND is_read = 0";
        $stmt = $this->pdo()->prepare($sql);
        return $stmt->execute(['user_id' => $userId]);
    }

    public function getUnreadCount(int $userId): int
    {
        $sql = "SELECT COUNT(*) FROM {$this->table} WHERE user_id = :user_id AND is_read = 0";
        $stmt = $this->pdo()->prepare($sql);
        $stmt->execute(['user_id' => $userId]);
        return (int) $stmt->fetchColumn();
    }
}
