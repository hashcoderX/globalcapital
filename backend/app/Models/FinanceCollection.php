<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class FinanceCollection extends Model
{
    use HasFactory;

    protected $fillable = [
        'finance_id',
        'branch_id',
        'collector_id',
        'payment_date',
        'payment_amount',
        'refund_amount',
        'pay_type',
        'reference_no',
        'cheque_no',
        'cheque_date',
        'cheque_bank',
        'interest_charged',
        'interest_paid',
        'principal_paid',
        'arrears',
        'remaining_capital',
        'meta',
        'created_by',
    ];

    protected $casts = [
        'branch_id' => 'integer',
        'collector_id' => 'integer',
        'payment_date' => 'date',
        'payment_amount' => 'decimal:2',
        'refund_amount' => 'decimal:2',
        'cheque_date' => 'date',
        'interest_charged' => 'decimal:2',
        'interest_paid' => 'decimal:2',
        'principal_paid' => 'decimal:2',
        'arrears' => 'decimal:2',
        'remaining_capital' => 'decimal:2',
        'meta' => 'array',
    ];

    public function finance()
    {
        return $this->belongsTo(Finance::class);
    }
}
