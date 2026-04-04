<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class FinanceDocument extends Model
{
    use HasFactory;

    protected $fillable = [
        'finance_id',
        'document_type',
        'file_path',
        'original_name',
        'uploaded_by',
    ];

    public function finance()
    {
        return $this->belongsTo(Finance::class);
    }
}
