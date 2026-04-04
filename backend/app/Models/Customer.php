<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Customer extends Model
{
    use HasFactory;

    protected $fillable = [
        'tenant_id', 'branch_id', 'customer_code',
        'first_name', 'last_name', 'email', 'phone', 'nic_passport',
        'date_of_birth', 'gender', 'marital_status', 'nationality',
        'permanent_address', 'current_address',
        'employment_type', 'employer_name', 'job_title', 'monthly_income', 'other_income_sources',
        'existing_loans', 'monthly_loan_obligations', 'credit_score',
        'created_by', 'status',
    ];

    protected $casts = [
        'date_of_birth' => 'date',
        'existing_loans' => 'boolean',
        'monthly_income' => 'decimal:2',
        'monthly_loan_obligations' => 'decimal:2',
        'credit_score' => 'integer',
    ];

    public function documents(): HasMany
    {
        return $this->hasMany(CustomerDocument::class);
    }

    public function savingsAccounts(): HasMany
    {
        return $this->hasMany(SavingsAccount::class);
    }
}
