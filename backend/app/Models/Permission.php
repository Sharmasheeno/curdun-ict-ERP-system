<?php

namespace App\Models;

class Permission extends BaseModel
{
    protected string $table = 'permissions';
    protected array $fillable = ['name', 'display_name', 'module', 'description'];
}
