<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Mortgage extends Model
{
    use HasFactory;

    protected $fillable = [
        'tenant_id',
        'branch_id',
        'customer_id',
        'mortgage_type',
        'requested_amount',
        'approved_amount',
        'interest_rate',
        'interest_type',
        'tenure_months',
        'installment_frequency',
        'interest_calculation_frequency',
        'installment_amount',
        'penalty_rate',
        'processing_fee',
        'insurance_fee',
        'status',
        'approved_by',
        'approved_at',
        'created_by',
    ];

    public function asset()
    {
        return $this->hasOne(MortgageAsset::class);
    }

    public function valuation()
    {
        return $this->hasOne(MortgageValuation::class);
    }

    public function guarantors()
    {
        return $this->hasMany(MortgageGuarantor::class);
    }

    public function customer()
    {
        return $this->belongsTo(Customer::class);
    }
}
