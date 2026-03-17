<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class MortgagePayment extends Model
{
    protected $fillable = [
        'mortgage_id',
        'schedule_id',
        'paid_date',
        'amount',
        'payment_method',
        'remarks',
        'collected_by',
    ];

    protected $casts = [
        'paid_date' => 'date',
        'amount' => 'decimal:2',
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
