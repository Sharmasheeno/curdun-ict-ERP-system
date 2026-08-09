<?php

namespace App\Models;

class SalesReturnItem extends BaseModel
{
    protected string $table = 'sales_return_items';
    protected array $fillable = [
        'sales_return_id', 
        'order_item_id', 
        'product_id', 
        'quantity', 
        'unit_price', 
        'total'
    ];
}
