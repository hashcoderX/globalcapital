<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class MicrofinanceLoanRequestDocument extends Model
{
    use HasFactory;

    protected $table = 'mf_loan_request_documents';

    protected $fillable = [
        'mf_loan_request_id',
        'document_type',
        'file_path',
        'original_name',
        'uploaded_by',
    ];

    protected $appends = [
        'file_url',
    ];

    public function getFileUrlAttribute(): ?string
    {
        if (!$this->file_path) {
            return null;
        }

        return '/media/loan-documents/' . $this->id;
    }

    public function loanRequest()
    {
        return $this->belongsTo(MicrofinanceLoanRequest::class, 'mf_loan_request_id');
    }
}
