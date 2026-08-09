<?php

namespace App\Services;

use Core\Database;

class ReportService
{
    public function __construct(
        private Database $db
    ) {}

    public function getSalesReport(array $filters): array
    {
        $where = [];
        $params = [];
        if (!empty($filters['date_from'])) {
            $where[] = "DATE(o.created_at) >= ?";
            $params[] = $filters['date_from'];
        }
        if (!empty($filters['date_to'])) {
            $where[] = "DATE(o.created_at) <= ?";
            $params[] = $filters['date_to'];
        }
        $whereSql = !empty($where) ? "WHERE " . implode(" AND ", $where) : "";

        $summaryQuery = "SELECT COUNT(id) as total_orders, SUM(total_amount) as total_revenue FROM orders o $whereSql AND o.status = 'COMPLETED'";
        $stmt = $this->db->prepare($summaryQuery);
        $stmt->execute($params);
        $summary = $stmt->fetch();

        return [
            'summary' => $summary,
            // Additional report queries can be added here
        ];
    }

    public function getRevenueReport(array $filters): array
    {
        $where = [];
        $params = [];
        if (!empty($filters['date_from'])) {
            $where[] = "DATE(payment_date) >= ?";
            $params[] = $filters['date_from'];
        }
        if (!empty($filters['date_to'])) {
            $where[] = "DATE(payment_date) <= ?";
            $params[] = $filters['date_to'];
        }
        $whereSql = !empty($where) ? "WHERE " . implode(" AND ", $where) : "";
        
        $query = "SELECT DATE(payment_date) as date, SUM(amount) as revenue FROM payments $whereSql GROUP BY DATE(payment_date) ORDER BY date ASC";
        $stmt = $this->db->prepare($query);
        $stmt->execute($params);
        return $stmt->fetchAll();
    }

    public function getExpenseReport(array $filters): array
    {
        $where = [];
        $params = [];
        if (!empty($filters['date_from'])) {
            $where[] = "expense_date >= ?";
            $params[] = $filters['date_from'];
        }
        if (!empty($filters['date_to'])) {
            $where[] = "expense_date <= ?";
            $params[] = $filters['date_to'];
        }
        $whereSql = !empty($where) ? "WHERE " . implode(" AND ", $where) : "";

        $query = "SELECT category, SUM(amount) as total FROM expenses $whereSql GROUP BY category";
        $stmt = $this->db->prepare($query);
        $stmt->execute($params);
        return $stmt->fetchAll();
    }

    public function getInvoiceReport(array $filters): array
    {
        $query = "SELECT status, COUNT(id) as count, SUM(total_amount) as total FROM invoices GROUP BY status";
        $stmt = $this->db->prepare($query);
        $stmt->execute();
        return $stmt->fetchAll();
    }

    public function getPaymentReport(array $filters): array
    {
        $query = "SELECT payment_method, COUNT(id) as count, SUM(amount) as total FROM payments GROUP BY payment_method";
        $stmt = $this->db->prepare($query);
        $stmt->execute();
        return $stmt->fetchAll();
    }

    public function getInventoryReport(array $filters): array
    {
        $query = "SELECT p.name, p.sku, p.current_stock, c.name as category FROM products p LEFT JOIN categories c ON p.category_id = c.id WHERE p.deleted_at IS NULL ORDER BY p.current_stock ASC";
        $stmt = $this->db->prepare($query);
        $stmt->execute();
        return $stmt->fetchAll();
    }

    public function getCustomerReport(array $filters): array
    {
        $query = "SELECT c.name, COUNT(o.id) as order_count, SUM(o.total_amount) as total_revenue FROM customers c JOIN orders o ON c.id = o.customer_id WHERE o.status = 'COMPLETED' GROUP BY c.id ORDER BY total_revenue DESC LIMIT 10";
        $stmt = $this->db->prepare($query);
        $stmt->execute();
        return $stmt->fetchAll();
    }
}
