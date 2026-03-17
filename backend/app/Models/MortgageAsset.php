<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class MortgageAsset extends Model
{
    use HasFactory;

    protected $fillable = [
        'mortgage_id',
        'asset_type',
        'description',
        'ownership_type',
        'address',
        'deed_number',
        'deed_date',
        'survey_plan_number',
        'registration_office',
        'land_size_or_area',
        'vehicle_reg_no',
        'engine_no',
        'chassis_no',
        'created_by',
    ];

    public function mortgage()
    {
        return $this->belongsTo(Mortgage::class);
    }
}
