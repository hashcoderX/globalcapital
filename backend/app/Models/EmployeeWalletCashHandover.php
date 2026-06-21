<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class EmployeeWalletCashHandover extends Model
{
    protected $fillable = [
        'employee_wallet_id',
        'employee_id',
        'branch_id',
        'cash_account_id',
        'manager_employee_id',
        'amount',
        'handover_date',
        'note',
        'received_by',
        'status',
        'approved_by',
        'approved_at',
        'approval_note',
        'branch_cash_transferred_at',
        'branch_cash_transferred_by',
        'created_by',
    ];

    protected $casts = [
        'amount' => 'decimal:2',
        'handover_date' => 'date',
        'approved_at' => 'datetime',
        'branch_cash_transferred_at' => 'datetime',
    ];

    public function wallet(): BelongsTo
    {
        return $this->belongsTo(EmployeeWallet::class, 'employee_wallet_id');
    }

    public function cashAccount(): BelongsTo
    {
        return $this->belongsTo(CompanyAccount::class, 'cash_account_id');
    }

    public function employee(): BelongsTo
    {
        return $this->belongsTo(Employee::class);
    }

    public function managerEmployee(): BelongsTo
    {
        return $this->belongsTo(Employee::class, 'manager_employee_id');
    }
}
