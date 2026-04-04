<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class LoanRequestDocument extends Model
{
    use HasFactory;

    protected $fillable = [
        'loan_request_id',
        'document_type',
        'file_path',
        'original_name',
        'uploaded_by',
    ];

    public function loanRequest(): BelongsTo
    {
        return $this->belongsTo(LoanRequest::class);
    }
}
