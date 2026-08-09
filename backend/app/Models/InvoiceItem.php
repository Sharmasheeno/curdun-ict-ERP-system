<?php

namespace App\Models;

class InvoiceItem extends BaseModel
{
    protected string $table = 'invoice_items';
    protected array $fillable = [
        'invoice_id', 
        'product_id', 
        'description', 
        'quantity', 
        'unit_price', 
        'discount', 
        'tax_amount', 
        'total'
    ];
}
