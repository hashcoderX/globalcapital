<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\HasMany;
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
    ];

    public function documentTemplates(): HasMany
    {
        return $this->hasMany(CompanyDocumentTemplate::class);
    }
}
