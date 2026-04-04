<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class MicrofinancePenaltySetting extends Model
{
    use HasFactory;

    protected $table = 'mf_penalty_settings';

    protected $fillable = [
        'penalty_rate',
        'is_active',
    ];
}
