<?php

namespace App\Models;

class Payment extends BaseModel
{
    protected string $table = 'payments';
    protected array $fillable = [
        'invoice_id', 
        'company_id', 
        'customer_id', 
        'user_id', 
        'payment_method_id', 
        'reference_number', 
        'amount', 
        'currency_id', 
        'payment_date', 
        'status', 
        'notes'
    ];
}
