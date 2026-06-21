<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class EmployeeWallet extends Model
{
    protected $fillable = [
        'tenant_id',
        'branch_id',
        'employee_id',
        'wallet_no',
        'opening_balance',
        'current_balance',
        'status',
    ];

    protected $casts = [
        'opening_balance' => 'decimal:2',
        'current_balance' => 'decimal:2',
    ];

    public function employee(): BelongsTo
    {
        return $this->belongsTo(Employee::class);
    }

    public function bankDeposits(): HasMany
    {
        return $this->hasMany(EmployeeWalletBankDeposit::class, 'employee_wallet_id');
    }

    public function cashHandovers(): HasMany
    {
        return $this->hasMany(EmployeeWalletCashHandover::class, 'employee_wallet_id');
    }
}
