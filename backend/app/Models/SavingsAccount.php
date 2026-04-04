<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class SavingsAccount extends Model
{
    use HasFactory;

    protected $fillable = [
        'tenant_id',
        'branch_id',
        'customer_id',
        'account_number',
        'account_type',
        'opening_deposit',
        'balance',
        'interest_rate',
        'opened_at',
        'status',
        'created_by',
    ];

    protected $casts = [
        'opening_deposit' => 'decimal:2',
        'balance' => 'decimal:2',
        'interest_rate' => 'decimal:4',
        'opened_at' => 'date',
    ];

    public function customer(): BelongsTo
    {
        return $this->belongsTo(Customer::class);
    }

    public function transactions(): HasMany
    {
        return $this->hasMany(SavingsAccountTransaction::class);
    }
}
