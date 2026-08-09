<?php

namespace App\Models;

class PurchaseOrder extends BaseModel
{
    protected string $table = 'purchase_orders';
    protected array $fillable = [
        'company_id', 
        'supplier_id', 
        'warehouse_id', 
        'user_id', 
        'reference_number', 
        'status', 
        'order_date', 
        'expected_date', 
        'received_date', 
        'subtotal', 
        'tax_amount', 
        'discount_amount', 
        'total_amount', 
        'paid_amount', 
        'notes'
    ];
}
