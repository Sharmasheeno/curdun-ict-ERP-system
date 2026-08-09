<?php

namespace App\Models;

class OrderItem extends BaseModel
{
    protected string $table = 'order_items';
    protected array $fillable = [
        'order_id', 
        'product_id', 
        'quantity', 
        'unit_price', 
        'discount', 
        'tax_amount', 
        'total'
    ];
}
