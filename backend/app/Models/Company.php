<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Model;

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
        'manager_user_id',
        'opening_asset',
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
}
