<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Model;
use App\Support\StoredFile;

class Company extends Model
{
    protected $fillable = [
        'name',
        'email',
        'address',
        'phone',
        'website',
        'country',
        'currency',
        'logo_path',
        'manager_user_id',
        'opening_asset',
    ];

    protected $appends = [
        'logo_url',
    ];

    protected $casts = [
        'opening_asset' => 'decimal:2',
    ];

    public function documentTemplates(): HasMany
    {
        return $this->hasMany(CompanyDocumentTemplate::class);
    }

    public function manager(): BelongsTo
    {
        return $this->belongsTo(User::class, 'manager_user_id');
    }

    public function accounts(): HasMany
    {
        return $this->hasMany(CompanyAccount::class);
    }

    public function accountingExpenses(): HasMany
    {
        return $this->hasMany(AccountingExpense::class);
    }

    public function getLogoUrlAttribute(): ?string
    {
        if (!$this->logo_path) {
            return null;
        }

        return StoredFile::publicPath($this->logo_path);
    }
}
