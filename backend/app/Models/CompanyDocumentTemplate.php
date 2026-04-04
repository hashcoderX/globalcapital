<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CompanyDocumentTemplate extends Model
{
    use HasFactory;

    protected $fillable = [
        'company_id',
        'template_type',
        'file_path',
        'original_name',
        'uploaded_by',
        'is_active',
    ];

    protected $casts = [
        'company_id' => 'integer',
        'uploaded_by' => 'integer',
        'is_active' => 'boolean',
    ];

    public function company(): BelongsTo
    {
        return $this->belongsTo(Company::class);
    }
}
