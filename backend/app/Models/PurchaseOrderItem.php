<?php

namespace App\Models;

class PurchaseOrderItem extends BaseModel
{
    protected string $table = 'purchase_order_items';
    protected array $fillable = [
        'purchase_order_id', 
        'product_id', 
        'quantity', 
        'unit_price', 
        'discount', 
        'tax_amount', 
        'total', 
        'received_quantity'
    ];
}
