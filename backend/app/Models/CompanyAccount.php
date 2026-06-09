<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CompanyAccount extends Model
{
    public const TYPE_MAIN = 'main';
    public const TYPE_CASH = 'cash';
    public const TYPE_BANK = 'bank';

    protected $fillable = [
        'company_id',
        'account_type',
        'account_name',
        'account_code',
        'bank_name',
        'bank_branch',
        'account_number',
        'opening_balance',
        'current_balance',
        'is_active',
        'notes',
        'created_by',
    ];

    protected $casts = [
        'opening_balance' => 'decimal:2',
        'current_balance' => 'decimal:2',
        'is_active' => 'boolean',
    ];

    public function company(): BelongsTo
    {
        return $this->belongsTo(Company::class);
    }

    public static function defaultAccountCode(string $accountType): string
    {
        return match ($accountType) {
            self::TYPE_MAIN => '3000',
            self::TYPE_CASH => '1100',
            self::TYPE_BANK => '1200',
            default => '1000',
        };
    }

    public static function defaultAccountName(string $accountType, ?string $branchName = null): string
    {
        $suffix = $branchName ? " ({$branchName})" : '';

        return match ($accountType) {
            self::TYPE_MAIN => 'Branch Main Account' . $suffix,
            self::TYPE_CASH => 'Cash Account' . $suffix,
            self::TYPE_BANK => 'Bank Account' . $suffix,
            default => 'Account' . $suffix,
        };
    }

    /**
     * @param  array<string, mixed>  $options
     * @return array<int, self>
     */
    public static function provisionForCompany(Company $company, array $options = [], ?int $createdBy = null): array
    {
        $branchName = trim((string) ($company->name ?? ''));
        $mainOpening = round((float) ($options['main_opening_balance'] ?? $options['opening_asset'] ?? $company->opening_asset ?? 0), 2);
        $cashOpening = round((float) ($options['cash_opening_balance'] ?? 0), 2);
        $created = [];

        if (!self::query()->where('company_id', $company->id)->where('account_type', self::TYPE_MAIN)->exists()) {
            $created[] = self::create([
                'company_id' => $company->id,
                'account_type' => self::TYPE_MAIN,
                'account_name' => trim((string) ($options['main_account_name'] ?? '')) ?: self::defaultAccountName(self::TYPE_MAIN, $branchName ?: null),
                'account_code' => trim((string) ($options['main_account_code'] ?? '')) ?: self::defaultAccountCode(self::TYPE_MAIN),
                'opening_balance' => $mainOpening,
                'current_balance' => $mainOpening,
                'is_active' => true,
                'notes' => $options['main_notes'] ?? null,
                'created_by' => $createdBy,
            ]);
        }

        if (!self::query()->where('company_id', $company->id)->where('account_type', self::TYPE_CASH)->exists()) {
            $created[] = self::create([
                'company_id' => $company->id,
                'account_type' => self::TYPE_CASH,
                'account_name' => trim((string) ($options['cash_account_name'] ?? '')) ?: self::defaultAccountName(self::TYPE_CASH, $branchName ?: null),
                'account_code' => trim((string) ($options['cash_account_code'] ?? '')) ?: self::defaultAccountCode(self::TYPE_CASH),
                'opening_balance' => $cashOpening,
                'current_balance' => $cashOpening,
                'is_active' => true,
                'notes' => $options['cash_notes'] ?? null,
                'created_by' => $createdBy,
            ]);
        }

        $bankName = trim((string) ($options['bank_name'] ?? ''));
        $bankRows = $options['bank_accounts'] ?? [];

        if (!is_array($bankRows) || empty($bankRows)) {
            if ($bankName !== '') {
                $bankRows = [[
                    'bank_name' => $bankName,
                    'bank_branch' => $options['bank_branch'] ?? null,
                    'account_number' => $options['bank_account_number'] ?? $options['account_number'] ?? null,
                    'account_name' => $options['bank_account_name'] ?? null,
                    'account_code' => $options['bank_account_code'] ?? null,
                    'opening_balance' => $options['bank_opening_balance'] ?? 0,
                    'notes' => $options['bank_notes'] ?? null,
                ]];
            } else {
                $bankRows = [];
            }
        }

        foreach ($bankRows as $bankRow) {
            if (!is_array($bankRow)) {
                continue;
            }

            $createdAccount = self::createBankAccountIfNew($company, $bankRow, $branchName, $createdBy);
            if ($createdAccount) {
                $created[] = $createdAccount;
            }
        }

        return $created;
    }

    /**
     * @param  array<string, mixed>  $bankRow
     */
    private static function createBankAccountIfNew(
        Company $company,
        array $bankRow,
        string $branchName,
        ?int $createdBy
    ): ?self {
        $bankName = trim((string) ($bankRow['bank_name'] ?? ''));
        if ($bankName === '') {
            return null;
        }

        $accountNumber = trim((string) ($bankRow['account_number'] ?? $bankRow['bank_account_number'] ?? ''));
        $duplicateQuery = self::query()
            ->where('company_id', $company->id)
            ->where('account_type', self::TYPE_BANK);

        if ($accountNumber !== '') {
            $duplicateQuery->where('account_number', $accountNumber);
        } else {
            $duplicateQuery
                ->where('bank_name', $bankName)
                ->where('bank_branch', $bankRow['bank_branch'] ?? null);
        }

        if ($duplicateQuery->exists()) {
            return null;
        }

        $existingBankCount = self::query()
            ->where('company_id', $company->id)
            ->where('account_type', self::TYPE_BANK)
            ->count();

        $submittedCode = trim((string) ($bankRow['account_code'] ?? $bankRow['bank_account_code'] ?? ''));
        $accountCode = $submittedCode !== ''
            ? $submittedCode
            : (string) (1200 + $existingBankCount);

        $bankOpening = round((float) ($bankRow['opening_balance'] ?? $bankRow['bank_opening_balance'] ?? 0), 2);
        $displayName = trim((string) ($bankRow['account_name'] ?? $bankRow['bank_account_name'] ?? ''));

        return self::create([
            'company_id' => $company->id,
            'account_type' => self::TYPE_BANK,
            'account_name' => $displayName !== '' ? $displayName : ($bankName . ' Account'),
            'account_code' => $accountCode,
            'bank_name' => $bankName,
            'bank_branch' => $bankRow['bank_branch'] ?? null,
            'account_number' => $accountNumber !== '' ? $accountNumber : null,
            'opening_balance' => $bankOpening,
            'current_balance' => $bankOpening,
            'is_active' => true,
            'notes' => $bankRow['notes'] ?? $bankRow['bank_notes'] ?? null,
            'created_by' => $createdBy,
        ]);
    }
}
