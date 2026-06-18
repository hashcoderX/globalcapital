<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class MicrofinanceLoanProduct extends Model
{
    use HasFactory;

    protected $table = 'mf_loan_products';

    protected $fillable = [
        'name',
        'interest_rate',
        'interest_type',
        'terms_count',
        'refund_option',
        'is_active',
    ];

    protected $casts = [
        'interest_rate' => 'decimal:7',
        'terms_count' => 'integer',
        'is_active' => 'boolean',
    ];
}
