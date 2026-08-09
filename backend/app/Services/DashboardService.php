<?php

namespace App\Services;

use Core\Database;

class DashboardService
{
    public function __construct(
        private Database $db
    ) {}

    public function getSummary(?int $companyId = null): array
    {
        // Simple counts
        $customers = $this->db->query("SELECT COUNT(*) as count FROM customers WHERE deleted_at IS NULL")->fetch()['count'];
        $suppliers = $this->db->query("SELECT COUNT(*) as count FROM suppliers WHERE deleted_at IS NULL")->fetch()['count'];
        $products = $this->db->query("SELECT COUNT(*) as count FROM products WHERE deleted_at IS NULL")->fetch()['count'];
        $orders = $this->db->query("SELECT COUNT(*) as count FROM orders")->fetch()['count'];
        
        $revenue = $this->db->query("SELECT SUM(amount) as total FROM payments")->fetch()['total'] ?? 0;
        $expenses = $this->db->query("SELECT SUM(amount) as total FROM expenses")->fetch()['total'] ?? 0;
        
        return [
            'customers' => $customers,
            'suppliers' => $suppliers,
            'products' => $products,
            'orders' => $orders,
            'revenue' => $revenue,
            'expenses' => $expenses
        ];
    }

    public function getSalesData(?int $companyId = null, int $days = 30): array
    {
        $query = "SELECT DATE(created_at) as date, SUM(total_amount) as total FROM orders WHERE created_at >= DATE_SUB(NOW(), INTERVAL ? DAY) GROUP BY DATE(created_at) ORDER BY date ASC";
        $stmt = $this->db->prepare($query);
        $stmt->execute([$days]);
        return $stmt->fetchAll();
    }

    public function getRevenueData(?int $companyId = null, int $days = 30): array
    {
        $query = "SELECT DATE(payment_date) as date, SUM(amount) as total FROM payments WHERE payment_date >= DATE_SUB(NOW(), INTERVAL ? DAY) GROUP BY DATE(payment_date) ORDER BY date ASC";
        $stmt = $this->db->prepare($query);
        $stmt->execute([$days]);
        return $stmt->fetchAll();
    }

    public function getExpenseData(?int $companyId = null, int $days = 30): array
    {
        $query = "SELECT DATE(expense_date) as date, SUM(amount) as total FROM expenses WHERE expense_date >= DATE_SUB(NOW(), INTERVAL ? DAY) GROUP BY DATE(expense_date) ORDER BY date ASC";
        $stmt = $this->db->prepare($query);
        $stmt->execute([$days]);
        return $stmt->fetchAll();
    }

    public function getTopCustomers(?int $companyId = null, int $limit = 5): array
    {
        $query = "SELECT c.name, SUM(o.total_amount) as total FROM customers c JOIN orders o ON c.id = o.customer_id GROUP BY c.id ORDER BY total DESC LIMIT ?";
        $stmt = $this->db->prepare($query);
        $stmt->execute([$limit]);
        return $stmt->fetchAll();
    }

    public function getLowStockProducts(?int $companyId = null, int $limit = 10): array
    {
        $query = "SELECT name, sku, current_stock, minimum_stock FROM products WHERE current_stock <= minimum_stock AND deleted_at IS NULL LIMIT ?";
        $stmt = $this->db->prepare($query);
        $stmt->execute([$limit]);
        return $stmt->fetchAll();
    }

    public function getRecentOrders(?int $companyId = null, int $limit = 10): array
    {
        $query = "SELECT o.order_number, c.name as customer, o.total_amount, o.status, o.created_at FROM orders o LEFT JOIN customers c ON o.customer_id = c.id ORDER BY o.created_at DESC LIMIT ?";
        $stmt = $this->db->prepare($query);
        $stmt->execute([$limit]);
        return $stmt->fetchAll();
    }

    public function getRecentPayments(?int $companyId = null, int $limit = 10): array
    {
        $query = "SELECT p.payment_reference, p.amount, p.payment_date, i.invoice_number FROM payments p LEFT JOIN invoices i ON p.invoice_id = i.id ORDER BY p.payment_date DESC LIMIT ?";
        $stmt = $this->db->prepare($query);
        $stmt->execute([$limit]);
        return $stmt->fetchAll();
    }
}
