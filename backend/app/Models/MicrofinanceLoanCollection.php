<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use App\Models\User;

class MicrofinanceLoanCollection extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'mf_loan_collections';

    protected $fillable = [
        'mf_loan_request_id',
        'collection_date',
        'collected_amount',
        'capital_amount',
        'interest_amount',
        'penalty_amount',
        'correction_amount',
        'payment_type',
        'payment_reference',
        'note',
        'client_reference',
        'created_by',
        'deleted_by',
        'deletion_reason',
    ];

    protected $casts = [
        'collection_date' => 'date',
        'collected_amount' => 'decimal:2',
        'capital_amount' => 'decimal:2',
        'interest_amount' => 'decimal:2',
        'penalty_amount' => 'decimal:2',
        'correction_amount' => 'decimal:2',
        'payment_type' => 'string',
        'payment_reference' => 'string',
        'deleted_at' => 'datetime',
    ];

    public function loanRequest()
    {
        return $this->belongsTo(MicrofinanceLoanRequest::class, 'mf_loan_request_id');
    }

    public function deletedByUser()
    {
        return $this->belongsTo(User::class, 'deleted_by');
    }
}
