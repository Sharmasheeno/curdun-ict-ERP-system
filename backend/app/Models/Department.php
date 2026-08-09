<?php

namespace App\Models;

class Department extends BaseModel
{
    protected string $table = 'departments';
    protected bool $softDelete = true;
    protected array $fillable = [
        'company_id', 
        'branch_id', 
        'name', 
        'status'
    ];
}
