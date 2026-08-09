<?php

namespace App\Models;

class Supplier extends BaseModel
{
    protected string $table = 'suppliers';
    protected bool $softDelete = true;
    protected array $fillable = [
        'company_id', 
        'supplier_code', 
        'name', 
        'phone', 
        'email', 
        'address', 
        'city', 
        'country', 
        'company_name', 
        'balance', 
        'status', 
        'notes'
    ];
}
