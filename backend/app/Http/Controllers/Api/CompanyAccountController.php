<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Company;
use App\Models\CompanyAccount;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class CompanyAccountController extends Controller
{
    public function index(Company $company): JsonResponse
    {
        $accounts = CompanyAccount::query()
            ->where('company_id', $company->id)
            ->orderByRaw("FIELD(account_type, 'main', 'cash', 'bank')")
            ->orderBy('id')
            ->get();

        $main = $accounts->firstWhere('account_type', CompanyAccount::TYPE_MAIN);
        $cash = $accounts->firstWhere('account_type', CompanyAccount::TYPE_CASH);
        $banks = $accounts->where('account_type', CompanyAccount::TYPE_BANK)->values();

        $totalOpening = round(
            (float) ($main?->opening_balance ?? 0)
            + (float) ($cash?->opening_balance ?? 0)
            + (float) $banks->sum('opening_balance'),
            2
        );

        $totalCurrent = round(
            (float) ($main?->current_balance ?? 0)
            + (float) ($cash?->current_balance ?? 0)
            + (float) $banks->sum('current_balance'),
            2
        );

        return response()->json([
            'accounts' => $accounts,
            'summary' => [
                'main' => $main,
                'cash' => $cash,
                'banks' => $banks,
                'bank_count' => $banks->count(),
                'total_opening_balance' => $totalOpening,
                'total_current_balance' => $totalCurrent,
            ],
        ]);
    }

    public function store(Request $request, Company $company): JsonResponse
    {
        $validated = $request->validate([
            'account_type' => ['required', Rule::in([
                CompanyAccount::TYPE_MAIN,
                CompanyAccount::TYPE_CASH,
                CompanyAccount::TYPE_BANK,
            ])],
            'account_name' => ['nullable', 'string', 'max:190'],
            'account_code' => ['nullable', 'string', 'max:30'],
            'bank_name' => ['nullable', 'string', 'max:190'],
            'bank_branch' => ['nullable', 'string', 'max:190'],
            'account_number' => ['nullable', 'string', 'max:80'],
            'opening_balance' => ['nullable', 'numeric', 'min:0'],
            'notes' => ['nullable', 'string', 'max:2000'],
            'is_active' => ['nullable', 'boolean'],
        ]);

        $accountType = (string) $validated['account_type'];

        if (in_array($accountType, [CompanyAccount::TYPE_MAIN, CompanyAccount::TYPE_CASH], true)) {
            $exists = CompanyAccount::query()
                ->where('company_id', $company->id)
                ->where('account_type', $accountType)
                ->exists();

            if ($exists) {
                return response()->json([
                    'message' => ucfirst($accountType) . ' account already exists for this company. Update the existing record instead.',
                ], 422);
            }
        }

        if ($accountType === CompanyAccount::TYPE_BANK) {
            $bankName = trim((string) ($validated['bank_name'] ?? ''));
            $accountNumber = trim((string) ($validated['account_number'] ?? ''));

            if ($bankName === '') {
                return response()->json(['message' => 'Bank name is required for bank accounts.'], 422);
            }

            if ($accountNumber !== '') {
                $duplicate = CompanyAccount::query()
                    ->where('company_id', $company->id)
                    ->where('account_type', CompanyAccount::TYPE_BANK)
                    ->where('account_number', $accountNumber)
                    ->exists();

                if ($duplicate) {
                    return response()->json(['message' => 'A bank account with this account number already exists.'], 422);
                }
            }
        }

        $openingBalance = round((float) ($validated['opening_balance'] ?? 0), 2);
        $accountName = trim((string) ($validated['account_name'] ?? ''));
        if ($accountName === '') {
            $accountName = CompanyAccount::defaultAccountName($accountType);
            if ($accountType === CompanyAccount::TYPE_BANK && !empty($validated['bank_name'])) {
                $accountName = trim((string) $validated['bank_name']) . ' Account';
            }
        }

        $account = CompanyAccount::create([
            'company_id' => $company->id,
            'account_type' => $accountType,
            'account_name' => $accountName,
            'account_code' => trim((string) ($validated['account_code'] ?? '')) ?: CompanyAccount::defaultAccountCode($accountType),
            'bank_name' => $validated['bank_name'] ?? null,
            'bank_branch' => $validated['bank_branch'] ?? null,
            'account_number' => $validated['account_number'] ?? null,
            'opening_balance' => $openingBalance,
            'current_balance' => $openingBalance,
            'is_active' => array_key_exists('is_active', $validated) ? (bool) $validated['is_active'] : true,
            'notes' => $validated['notes'] ?? null,
            'created_by' => $request->user()?->id,
        ]);

        return response()->json([
            'message' => 'Company account created successfully.',
            'account' => $account,
        ], 201);
    }

    public function update(Request $request, Company $company, CompanyAccount $account): JsonResponse
    {
        if ((int) $account->company_id !== (int) $company->id) {
            return response()->json(['message' => 'Account does not belong to this company.'], 404);
        }

        $validated = $request->validate([
            'account_name' => ['sometimes', 'required', 'string', 'max:190'],
            'account_code' => ['nullable', 'string', 'max:30'],
            'bank_name' => ['nullable', 'string', 'max:190'],
            'bank_branch' => ['nullable', 'string', 'max:190'],
            'account_number' => ['nullable', 'string', 'max:80'],
            'opening_balance' => ['nullable', 'numeric', 'min:0'],
            'current_balance' => ['nullable', 'numeric', 'min:0'],
            'notes' => ['nullable', 'string', 'max:2000'],
            'is_active' => ['nullable', 'boolean'],
        ]);

        if ($account->account_type === CompanyAccount::TYPE_BANK) {
            $bankName = array_key_exists('bank_name', $validated)
                ? trim((string) ($validated['bank_name'] ?? ''))
                : trim((string) ($account->bank_name ?? ''));

            if ($bankName === '') {
                return response()->json(['message' => 'Bank name is required for bank accounts.'], 422);
            }

            $accountNumber = array_key_exists('account_number', $validated)
                ? trim((string) ($validated['account_number'] ?? ''))
                : trim((string) ($account->account_number ?? ''));

            if ($accountNumber !== '') {
                $duplicate = CompanyAccount::query()
                    ->where('company_id', $company->id)
                    ->where('account_type', CompanyAccount::TYPE_BANK)
                    ->where('account_number', $accountNumber)
                    ->where('id', '!=', $account->id)
                    ->exists();

                if ($duplicate) {
                    return response()->json(['message' => 'A bank account with this account number already exists.'], 422);
                }
            }
        }

        $payload = $validated;

        if (array_key_exists('opening_balance', $payload)) {
            $newOpening = round((float) $payload['opening_balance'], 2);
            $oldOpening = round((float) $account->opening_balance, 2);
            $oldCurrent = round((float) $account->current_balance, 2);

            $payload['opening_balance'] = $newOpening;

            if (!array_key_exists('current_balance', $payload) && abs($oldCurrent - $oldOpening) < 0.0001) {
                $payload['current_balance'] = $newOpening;
            }
        }

        if (array_key_exists('current_balance', $payload)) {
            $payload['current_balance'] = round((float) $payload['current_balance'], 2);
        }

        $account->update($payload);

        return response()->json([
            'message' => 'Company account updated successfully.',
            'account' => $account->fresh(),
        ]);
    }

    public function destroy(Company $company, CompanyAccount $account): JsonResponse
    {
        if ((int) $account->company_id !== (int) $company->id) {
            return response()->json(['message' => 'Account does not belong to this company.'], 404);
        }

        if ($account->account_type !== CompanyAccount::TYPE_BANK) {
            return response()->json([
                'message' => 'Main and cash accounts cannot be deleted. Update their opening balances instead.',
            ], 422);
        }

        $account->delete();

        return response()->json(['message' => 'Bank account removed successfully.']);
    }
}
