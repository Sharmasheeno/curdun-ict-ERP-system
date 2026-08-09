<?php

namespace App\Models;

class Warehouse extends BaseModel
{
    protected string $table = 'warehouses';
    protected bool $softDelete = true;
    protected array $fillable = [
        'company_id', 
        'branch_id', 
        'name', 
        'address', 
        'status'
    ];
}
