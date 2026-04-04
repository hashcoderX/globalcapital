<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class MicrofinanceLoanGuarantor extends Model
{
    use HasFactory;

    protected $table = 'mf_loan_guarantors';

    protected $fillable = [
        'mf_loan_request_id',
        'name',
        'nic',
        'address',
        'contact_no',
        'relationship',
    ];

    public function loanRequest()
    {
        return $this->belongsTo(MicrofinanceLoanRequest::class, 'mf_loan_request_id');
    }
}
