<?php

namespace App\Models;

class ExpenseCategory extends BaseModel
{
    protected string $table = 'expense_categories';
    protected array $fillable = [
        'company_id', 
        'name', 
        'description', 
        'status'
    ];
}
