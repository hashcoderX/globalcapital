<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class DraftLoan extends Model
{
    use HasFactory;

    protected $fillable = [
        'finance_id',
        'tenant_id',
        'branch_id',
        'customer_id',
        'customer_no',
        'finance_type',
        'product_type',
        'asset_reference',
        'vehicle_details',
        'valuation_details',
        'guarantor_details',
        'amount',
        'interest_rate',
        'tenure_months',
        'installment_frequency',
        'interest_amount',
        'status',
        'start_date',
        'due_date',
        'due_amount',
        'total_paid_amount',
        'balance_amount',
        'next_collection_date',
        'created_by',
    ];

    protected $casts = [
        'amount' => 'decimal:2',
        'interest_rate' => 'decimal:4',
        'interest_amount' => 'decimal:2',
        'due_amount' => 'decimal:2',
        'total_paid_amount' => 'decimal:2',
        'balance_amount' => 'decimal:2',
        'tenure_months' => 'integer',
        'start_date' => 'date',
        'due_date' => 'date',
        'next_collection_date' => 'date',
        'vehicle_details' => 'array',
        'valuation_details' => 'array',
        'guarantor_details' => 'array',
    ];

    public function finance()
    {
        return $this->belongsTo(Finance::class);
    }

    public function customer()
    {
        return $this->belongsTo(Customer::class);
    }
}
