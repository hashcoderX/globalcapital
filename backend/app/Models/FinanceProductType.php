<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class FinanceProductType extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'code',
        'description',
        'interest_rate',
        'interest_type',
        'tenure_months',
        'installment_frequency',
        'is_active',
        'created_by',
    ];

    protected $casts = [
        'interest_rate' => 'decimal:2',
        'tenure_months' => 'integer',
        'is_active' => 'boolean',
    ];
}
