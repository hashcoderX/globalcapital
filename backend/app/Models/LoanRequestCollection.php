<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class LoanRequestCollection extends Model
{
    protected $fillable = [
        'loan_request_id',
        'collection_date',
        'collected_amount',
        'payment_type',
        'payment_reference',
        'note',
        'created_by',
    ];

    protected $casts = [
        'collection_date' => 'date',
        'collected_amount' => 'decimal:2',
    ];

    public function loanRequest(): BelongsTo
    {
        return $this->belongsTo(LoanRequest::class);
    }
}
