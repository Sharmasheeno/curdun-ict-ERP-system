<?php

namespace App\Models;

class Customer extends BaseModel
{
    protected string $table = 'customers';
    protected bool $softDelete = true;
    protected array $fillable = [
        'company_id', 
        'customer_code', 
        'name', 
        'phone', 
        'email', 
        'address', 
        'city', 
        'country', 
        'company_name', 
        'credit_limit', 
        'balance', 
        'status', 
        'notes'
    ];
}
