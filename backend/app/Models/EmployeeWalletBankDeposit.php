<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class EmployeeWalletBankDeposit extends Model
{
    protected $fillable = [
        'employee_wallet_id',
        'employee_id',
        'branch_id',
        'bank_account_id',
        'amount',
        'deposit_date',
        'note',
        'status',
        'approved_by',
        'approved_at',
        'approval_note',
        'created_by',
    ];

    protected $casts = [
        'amount' => 'decimal:2',
        'deposit_date' => 'date',
        'approved_at' => 'datetime',
    ];

    public function wallet(): BelongsTo
    {
        return $this->belongsTo(EmployeeWallet::class, 'employee_wallet_id');
    }

    public function bankAccount(): BelongsTo
    {
        return $this->belongsTo(CompanyAccount::class, 'bank_account_id');
    }

    public function employee(): BelongsTo
    {
        return $this->belongsTo(Employee::class);
    }
}
