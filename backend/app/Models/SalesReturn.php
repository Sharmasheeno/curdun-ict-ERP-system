<?php

namespace App\Models;

class SalesReturn extends BaseModel
{
    protected string $table = 'sales_returns';
    protected array $fillable = [
        'order_id', 
        'user_id', 
        'reference_number', 
        'return_date', 
        'reason', 
        'status', 
        'total_amount'
    ];
}
