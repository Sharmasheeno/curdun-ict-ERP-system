<?php

namespace App\Repositories;

class NotificationRepository extends BaseRepository
{
    public function findByUser(int $userId, bool $unreadOnly = false, int $limit = 50): array
    {
        $params = ['user_id' => $userId];
        $where = ["user_id = :user_id"];
        
        if ($unreadOnly) {
            $where[] = "is_read = 0";
        }
        
        $whereClause = "WHERE " . implode(" AND ", $where);
        $sql = "SELECT * FROM notifications {$whereClause} ORDER BY created_at DESC LIMIT " . (int)$limit;
        
        return $this->db->query($sql, $params)->fetchAll();
    }

    public function markAsRead(int $id): bool
    {
        return (bool) $this->db->query("UPDATE notifications SET is_read = 1 WHERE id = :id", ['id' => $id]);
    }

    public function markAllAsRead(int $userId): bool
    {
        return (bool) $this->db->query("UPDATE notifications SET is_read = 1 WHERE user_id = :user_id AND is_read = 0", ['user_id' => $userId]);
    }

    public function getUnreadCount(int $userId): int
    {
        return (int) $this->db->query(
            "SELECT COUNT(*) FROM notifications WHERE user_id = :user_id AND is_read = 0", 
            ['user_id' => $userId]
        )->fetchColumn();
    }

    public function create(array $data): void
    {
        $sql = "INSERT INTO notifications (user_id, title, message, type, reference_id, is_read) 
                VALUES (:user_id, :title, :message, :type, :reference_id, 0)";
                
        $this->db->query($sql, [
            'user_id' => $data['user_id'],
            'title' => $data['title'],
            'message' => $data['message'],
            'type' => $data['type'] ?? 'info',
            'reference_id' => $data['reference_id'] ?? null
        ]);
    }
}
