<?php

namespace App\Models;

class Branch extends BaseModel
{
    protected string $table = 'branches';
    protected bool $softDelete = true;
    protected array $fillable = [
        'company_id', 
        'name', 
        'address', 
        'phone', 
        'status'
    ];
}
