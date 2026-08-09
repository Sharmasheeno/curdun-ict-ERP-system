<?php

namespace App\Models;

class PaymentMethod extends BaseModel
{
    protected string $table = 'payment_methods';
    protected array $fillable = [
        'name', 
        'type', 
        'status'
    ];
}
