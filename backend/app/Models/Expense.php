<?php

namespace App\Models;

class Expense extends BaseModel
{
    protected string $table = 'expenses';
    protected array $fillable = [
        'company_id', 
        'branch_id', 
        'category_id', 
        'user_id', 
        'payment_method_id', 
        'reference', 
        'title', 
        'description', 
        'amount', 
        'expense_date', 
        'status', 
        'receipt'
    ];
}
