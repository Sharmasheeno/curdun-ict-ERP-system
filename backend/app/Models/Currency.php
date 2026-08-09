<?php

namespace App\Models;

class Currency extends BaseModel
{
    protected string $table = 'currencies';
    protected array $fillable = [
        'code', 
        'name', 
        'symbol', 
        'exchange_rate', 
        'is_default', 
        'status'
    ];
}
