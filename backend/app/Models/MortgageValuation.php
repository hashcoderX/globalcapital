<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class MortgageValuation extends Model
{
    use HasFactory;

    protected $fillable = [
        'mortgage_id',
        'market_value',
        'forced_sale_value',
        'valuation_date',
        'valuer_name',
        'remarks',
    ];

    protected $casts = [
        'valuation_date' => 'date',
    ];

    public function mortgage()
    {
        return $this->belongsTo(Mortgage::class);
    }
}
