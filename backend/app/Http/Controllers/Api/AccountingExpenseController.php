<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AccountingExpense;
use App\Models\Company;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class AccountingExpenseController extends Controller
{
    private function isAdminUser(?object $user): bool
    {
        if (!$user) {
            return false;
        }

        if (method_exists($user, 'isSystemAdmin') && $user->isSystemAdmin()) {
            return true;
        }

        $designationName = strtolower(trim((string) optional($user->designation)->name));
        if ($designationName !== '' && str_contains($designationName, 'admin')) {
            return true;
        }

        if (!method_exists($user, 'roles')) {
            return false;
        }

        foreach ($user->roles()->pluck('name') as $roleName) {
            $normalized = strtolower(trim((string) $roleName));
            if ($normalized !== '' && str_contains($normalized, 'admin')) {
                return true;
            }
        }

        return false;
    }

    private function ensureCompanyAccess(Request $request, Company $company): ?JsonResponse
    {
        if ($this->isAdminUser($request->user())) {
            return null;
        }

        $branchId = (int) ($request->user()?->branch_id ?? 0);
        if ($branchId <= 0 || $branchId !== (int) $company->id) {
            return response()->json(['message' => 'You do not have access to this branch.'], 403);
        }

        return null;
    }

    public function index(Request $request, Company $company): JsonResponse
    {
        if ($denied = $this->ensureCompanyAccess($request, $company)) {
            return $denied;
        }

        $validated = $request->validate([
            'from_date' => ['nullable', 'date'],
            'to_date' => ['nullable', 'date'],
            'category' => ['nullable', Rule::in(AccountingExpense::categories())],
            'search' => ['nullable', 'string', 'max:190'],
        ]);

        $query = AccountingExpense::query()
            ->where('company_id', $company->id)
            ->orderByDesc('expense_date')
            ->orderByDesc('id');

        if (!empty($validated['from_date'])) {
            $query->whereDate('expense_date', '>=', $validated['from_date']);
        }

        if (!empty($validated['to_date'])) {
            $query->whereDate('expense_date', '<=', $validated['to_date']);
        }

        if (!empty($validated['category'])) {
            $query->where('category', $validated['category']);
        }

        if (!empty($validated['search'])) {
            $term = trim((string) $validated['search']);
            $query->where(function ($builder) use ($term) {
                $builder
                    ->where('title', 'like', "%{$term}%")
                    ->orWhere('reference_no', 'like', "%{$term}%")
                    ->orWhere('notes', 'like', "%{$term}%");
            });
        }

        $expenses = $query->get();
        $totalAmount = round((float) $expenses->sum('amount'), 2);

        return response()->json([
            'company' => [
                'id' => $company->id,
                'name' => $company->name,
                'currency' => $company->currency,
            ],
            'expenses' => $expenses,
            'summary' => [
                'count' => $expenses->count(),
                'total_amount' => $totalAmount,
            ],
            'categories' => AccountingExpense::categories(),
            'payment_methods' => AccountingExpense::paymentMethods(),
        ]);
    }

    public function store(Request $request, Company $company): JsonResponse
    {
        if ($denied = $this->ensureCompanyAccess($request, $company)) {
            return $denied;
        }

        $validated = $request->validate([
            'expense_date' => ['required', 'date'],
            'category' => ['required', Rule::in(AccountingExpense::categories())],
            'title' => ['required', 'string', 'max:190'],
            'amount' => ['required', 'numeric', 'min:0.01'],
            'payment_method' => ['required', Rule::in(AccountingExpense::paymentMethods())],
            'reference_no' => ['nullable', 'string', 'max:80'],
            'notes' => ['nullable', 'string', 'max:2000'],
        ]);

        $expense = AccountingExpense::create([
            'company_id' => $company->id,
            'expense_date' => $validated['expense_date'],
            'category' => $validated['category'],
            'title' => trim((string) $validated['title']),
            'amount' => round((float) $validated['amount'], 2),
            'payment_method' => $validated['payment_method'],
            'reference_no' => isset($validated['reference_no']) ? trim((string) $validated['reference_no']) : null,
            'notes' => isset($validated['notes']) ? trim((string) $validated['notes']) : null,
            'created_by' => $request->user()?->id,
        ]);

        return response()->json([
            'message' => 'Expense recorded successfully.',
            'expense' => $expense,
        ], 201);
    }

    public function destroy(Request $request, Company $company, AccountingExpense $accountingExpense): JsonResponse
    {
        if ($denied = $this->ensureCompanyAccess($request, $company)) {
            return $denied;
        }

        if ((int) $accountingExpense->company_id !== (int) $company->id) {
            return response()->json(['message' => 'Expense not found for this branch.'], 404);
        }

        $accountingExpense->delete();

        return response()->json(['message' => 'Expense deleted successfully.']);
    }
}
