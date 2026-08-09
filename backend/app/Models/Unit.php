<?php

namespace App\Models;

class Unit extends BaseModel
{
    protected string $table = 'units';
    protected bool $softDelete = true;
    protected array $fillable = [
        'company_id', 
        'name', 
        'abbreviation', 
        'status'
    ];
}
