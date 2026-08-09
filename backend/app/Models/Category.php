<?php

namespace App\Models;

class Category extends BaseModel
{
    protected string $table = 'categories';
    protected bool $softDelete = true;
    protected array $fillable = [
        'company_id', 
        'parent_id', 
        'name', 
        'description', 
        'status'
    ];
}
