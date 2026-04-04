<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class MortgagePayment extends Model
{
    protected $fillable = [
        'mortgage_id',
        'branch_id',
        'user_id',
        'schedule_id',
        'paid_date',
        'amount',
        'interest_amount',
        'principal_amount',
        'profit_amount',
        'outstanding_principal_after',
        'payment_method',
        'remarks',
        'collected_by',
    ];

    protected $casts = [
        'paid_date' => 'date',
        'amount' => 'decimal:2',
        'interest_amount' => 'decimal:2',
        'principal_amount' => 'decimal:2',
        'profit_amount' => 'decimal:2',
        'outstanding_principal_after' => 'decimal:2',
    ];

    public function mortgage(): BelongsTo
    {
        return $this->belongsTo(Mortgage::class);
    }

    public function schedule(): BelongsTo
    {
        return $this->belongsTo(MortgageSchedule::class);
    }
}
