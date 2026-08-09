<?php

namespace App\Models;

class Order extends BaseModel
{
    protected string $table = 'orders';
    protected array $fillable = [
        'company_id', 
        'customer_id', 
        'user_id', 
        'warehouse_id', 
        'invoice_id', 
        'reference_number', 
        'status', 
        'order_date', 
        'subtotal', 
        'tax_amount', 
        'discount_amount', 
        'total_amount', 
        'notes'
    ];
}
