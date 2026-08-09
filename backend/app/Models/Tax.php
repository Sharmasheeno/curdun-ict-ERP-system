<?php

namespace App\Models;

class Tax extends BaseModel
{
    protected string $table = 'taxes';
    protected array $fillable = [
        'name', 
        'rate', 
        'type', 
        'status'
    ];
}
