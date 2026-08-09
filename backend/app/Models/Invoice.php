<?php

namespace App\Models;

class Invoice extends BaseModel
{
    protected string $table = 'invoices';
    protected array $fillable = [
        'company_id', 
        'customer_id', 
        'order_id', 
        'user_id', 
        'invoice_number', 
        'status', 
        'invoice_date', 
        'due_date', 
        'subtotal', 
        'tax_amount', 
        'discount_amount', 
        'total_amount', 
        'paid_amount', 
        'balance', 
        'currency_id', 
        'notes', 
        'terms'
    ];

    public function updatePaymentStatus(int $invoiceId, float $paidAmount): bool
    {
        $invoice = $this->findById($invoiceId);
        if (!$invoice) {
            return false;
        }

        $newPaidAmount = (float)$invoice['paid_amount'] + $paidAmount;
        $totalAmount = (float)$invoice['total_amount'];
        $balance = $totalAmount - $newPaidAmount;
        
        $status = $invoice['status'];
        if ($balance <= 0) {
            $status = 'paid';
            $balance = 0;
        } elseif ($newPaidAmount > 0) {
            $status = 'partial';
        }

        $sql = "UPDATE {$this->table} SET paid_amount = :paid, balance = :balance, status = :status WHERE id = :id";
        $stmt = $this->pdo()->prepare($sql);
        return $stmt->execute([
            'paid' => $newPaidAmount,
            'balance' => $balance,
            'status' => $status,
            'id' => $invoiceId
        ]);
    }
}
