<?php

namespace App\Models;

class Company extends BaseModel
{
    protected string $table = 'companies';
    protected bool $softDelete = true;
    protected array $fillable = [
        'name', 
        'email', 
        'phone', 
        'address', 
        'city', 
        'country', 
        'logo', 
        'status'
    ];
}
