<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class MicrofinanceHoliday extends Model
{
    use HasFactory;

    protected $table = 'mf_holidays';

    protected $fillable = [
        'holiday_date',
        'name',
        'note',
        'is_active',
        'created_by',
    ];

    protected $casts = [
        'holiday_date' => 'date',
        'is_active' => 'boolean',
    ];
}
