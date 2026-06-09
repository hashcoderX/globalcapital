<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AccountingExpense extends Model
{
    public const CATEGORY_RENT = 'rent';
    public const CATEGORY_UTILITIES = 'utilities';
    public const CATEGORY_SALARIES = 'salaries';
    public const CATEGORY_TRANSPORT = 'transport';
    public const CATEGORY_OFFICE_SUPPLIES = 'office_supplies';
    public const CATEGORY_MAINTENANCE = 'maintenance';
    public const CATEGORY_MARKETING = 'marketing';
    public const CATEGORY_OTHER = 'other';

    public const PAYMENT_CASH = 'cash';
    public const PAYMENT_BANK = 'bank';
    public const PAYMENT_MAIN = 'main';

    protected $fillable = [
        'company_id',
        'expense_date',
        'category',
        'title',
        'amount',
        'payment_method',
        'reference_no',
        'notes',
        'created_by',
    ];

    protected $casts = [
        'expense_date' => 'date',
        'amount' => 'decimal:2',
    ];

    public static function categories(): array
    {
        return [
            self::CATEGORY_RENT,
            self::CATEGORY_UTILITIES,
            self::CATEGORY_SALARIES,
            self::CATEGORY_TRANSPORT,
            self::CATEGORY_OFFICE_SUPPLIES,
            self::CATEGORY_MAINTENANCE,
            self::CATEGORY_MARKETING,
            self::CATEGORY_OTHER,
        ];
    }

    public static function paymentMethods(): array
    {
        return [
            self::PAYMENT_CASH,
            self::PAYMENT_BANK,
            self::PAYMENT_MAIN,
        ];
    }

    public function company(): BelongsTo
    {
        return $this->belongsTo(Company::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
