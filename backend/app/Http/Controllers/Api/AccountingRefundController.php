<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AccountingRefund;
use App\Models\Company;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class AccountingRefundController extends Controller
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
            'payment_method' => ['nullable', Rule::in(AccountingRefund::paymentMethods())],
            'search' => ['nullable', 'string', 'max:190'],
        ]);

        $query = AccountingRefund::query()
            ->where('company_id', $company->id)
            ->orderByDesc('refund_date')
            ->orderByDesc('id');

        if (!empty($validated['from_date'])) {
            $query->whereDate('refund_date', '>=', $validated['from_date']);
        }

        if (!empty($validated['to_date'])) {
            $query->whereDate('refund_date', '<=', $validated['to_date']);
        }

        if (!empty($validated['payment_method'])) {
            $query->where('payment_method', $validated['payment_method']);
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

        $refunds = $query->get();
        $totalAmount = round((float) $refunds->sum('amount'), 2);

        return response()->json([
            'company' => [
                'id' => $company->id,
                'name' => $company->name,
                'currency' => $company->currency,
            ],
            'refunds' => $refunds,
            'summary' => [
                'count' => $refunds->count(),
                'total_amount' => $totalAmount,
            ],
            'payment_methods' => AccountingRefund::paymentMethods(),
        ]);
    }

    public function store(Request $request, Company $company): JsonResponse
    {
        if ($denied = $this->ensureCompanyAccess($request, $company)) {
            return $denied;
        }

        $validated = $request->validate([
            'refund_date' => ['required', 'date'],
            'title' => ['required', 'string', 'max:190'],
            'amount' => ['required', 'numeric', 'min:0.01'],
            'payment_method' => ['required', Rule::in(AccountingRefund::paymentMethods())],
            'reference_no' => ['nullable', 'string', 'max:80'],
            'notes' => ['nullable', 'string', 'max:2000'],
        ]);

        $refund = AccountingRefund::create([
            'company_id' => $company->id,
            'refund_date' => $validated['refund_date'],
            'title' => trim((string) $validated['title']),
            'amount' => round((float) $validated['amount'], 2),
            'payment_method' => $validated['payment_method'],
            'reference_no' => isset($validated['reference_no']) ? trim((string) $validated['reference_no']) : null,
            'notes' => isset($validated['notes']) ? trim((string) $validated['notes']) : null,
            'created_by' => $request->user()?->id,
        ]);

        return response()->json([
            'message' => 'Refund recorded successfully.',
            'refund' => $refund,
        ], 201);
    }

    public function destroy(Request $request, Company $company, AccountingRefund $accountingRefund): JsonResponse
    {
        if ($denied = $this->ensureCompanyAccess($request, $company)) {
            return $denied;
        }

        if ((int) $accountingRefund->company_id !== (int) $company->id) {
            return response()->json(['message' => 'Refund not found for this branch.'], 404);
        }

        $accountingRefund->delete();

        return response()->json(['message' => 'Refund deleted successfully.']);
    }
}
