<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class MicrofinanceHolidayLoanDateShift extends Model
{
    use HasFactory;

    protected $table = 'mf_holiday_loan_date_shifts';

    protected $fillable = [
        'mf_holiday_id',
        'loan_type',
        'loan_id',
        'field_name',
        'original_date',
        'shifted_date',
    ];

    protected $casts = [
        'original_date' => 'date',
        'shifted_date' => 'date',
    ];

    public function holiday(): BelongsTo
    {
        return $this->belongsTo(MicrofinanceHoliday::class, 'mf_holiday_id');
    }
}
