<?php

namespace App\Http\Controllers\Api\Microfinance;

use App\Http\Controllers\Controller;
use App\Models\MicrofinanceLoanCollection;
use App\Models\MicrofinanceLoanRequest;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class LoanCollectionController extends Controller
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

    private function scopedBranchId(Request $request): ?int
    {
        $requestedBranchId = (int) ($request->get('branch_id', 0));

        if ($this->isAdminUser($request->user())) {
            return $requestedBranchId > 0 ? $requestedBranchId : null;
        }

        $branchId = (int) ($request->user()?->branch_id ?? 0);
        return $branchId > 0 ? $branchId : null;
    }

    private function shiftDateByRefundOption(\DateTimeImmutable $date, string $refundOption, int $steps = 1): \DateTimeImmutable
    {
        if ($steps === 0) {
            return $date;
        }

        $interval = '+1 month';
        if ($refundOption === 'day') {
            $interval = '+1 day';
        } elseif ($refundOption === 'week') {
            $interval = '+7 days';
        }

        $cursor = $date;
        $iterations = abs($steps);

        for ($i = 0; $i < $iterations; $i++) {
            if ($steps > 0) {
                $cursor = $cursor->modify($interval);
            } else {
                $cursor = $cursor->modify(str_replace('+', '-', $interval));
            }
        }

        return $cursor;
    }

    public function index(Request $request)
    {
        $query = MicrofinanceLoanCollection::query()
            ->with('loanRequest:id,customer_no,customer_name')
            ->orderByDesc('id');

        if ($request->filled('loan_request_id')) {
            $query->where('mf_loan_request_id', (int)$request->get('loan_request_id'));
        }

        $branchId = $this->scopedBranchId($request);
        if ($branchId !== null) {
            $query->whereHas('loanRequest', function ($loanQuery) use ($branchId) {
                $loanQuery->where('branch_id', $branchId);
            });
        }

        $collections = $query->get()->map(function (MicrofinanceLoanCollection $collection) {
            $payload = $collection->toArray();
            $payload['collection_date'] = $collection->collection_date?->format('Y-m-d');

            return $payload;
        })->values();

        return response()->json($collections);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'loan_request_id' => 'required|exists:mf_loan_requests,id',
            'collection_date' => 'required|date',
            'collected_amount' => 'required|numeric|min:0.01',
            'payment_type' => 'required|in:cash,check,bank_transfer',
            'payment_reference' => 'nullable|string|max:255|required_unless:payment_type,cash',
            'note' => 'nullable|string|max:1000',
        ]);

        $loanRequest = MicrofinanceLoanRequest::findOrFail((int)$validated['loan_request_id']);

        $branchId = $this->scopedBranchId($request);
        if ($branchId !== null && (int) ($loanRequest->branch_id ?? 0) !== $branchId) {
            return response()->json([
                'message' => 'You can collect payments only for loans in your branch.'
            ], 403);
        }

        if (!in_array($loanRequest->status, ['approved', 'released'], true)) {
            return response()->json([
                'message' => 'Collections can be added only for approved or released loans.'
            ], 422);
        }

        $loanAmount = (float)$loanRequest->loan_amount;
        $termCount = max((int)$loanRequest->terms_count, 1);
        $installmentAmount = (float)$loanRequest->installment_amount;

        $principalPerInstallment = $loanAmount / $termCount;
        $interestPerInstallment = max($installmentAmount - $principalPerInstallment, 0);

        $collectedAmount = (float)$validated['collected_amount'];

        $collectionDate = new \DateTimeImmutable((string)$validated['collection_date']);
        $dueCursor = !empty($loanRequest->due_date)
            ? new \DateTimeImmutable((string)$loanRequest->due_date)
            : $collectionDate;
        $refundOption = (string)($loanRequest->refund_option ?: 'month');

        $accrualCapDate = $collectionDate;
        if (!empty($loanRequest->loan_end_date)) {
            try {
                $loanEndDate = new \DateTimeImmutable((string) $loanRequest->loan_end_date);
                if ($loanEndDate < $accrualCapDate) {
                    $accrualCapDate = $loanEndDate;
                }
            } catch (\Throwable) {
                // Ignore invalid loan_end_date
            }
        }

        $arrearsBalanceBefore = (float)($loanRequest->arrears_balance ?? 0);
        $accruedInstallmentCount = 0;

        // Accrue expected installments for all due cycles reached by collection date.
        while ($dueCursor <= $accrualCapDate) {
            $arrearsBalanceBefore += $installmentAmount;
            $dueCursor = $this->shiftDateByRefundOption($dueCursor, $refundOption);
            $accruedInstallmentCount++;
        }

        $arrearsOutstandingBefore = max($arrearsBalanceBefore, 0);
        $arrearsDeducted = min($collectedAmount, $arrearsOutstandingBefore);
        $remainingAfterArrears = max($collectedAmount - $arrearsDeducted, 0);
        $arrearsBalanceAfterPayment = $arrearsBalanceBefore - $collectedAmount;
        $arrearsOutstandingAfter = max($arrearsBalanceAfterPayment, 0);
        $extraPaymentAfter = max(-$arrearsBalanceAfterPayment, 0);

        $penaltyRate = (float)($loanRequest->penalty_rate ?? 0);
        $graceDays = max((int)($loanRequest->penalty_grace_days ?? 2), 0);
        $lateDays = 0;
        $penaltyAmount = 0.0;

        if (!empty($loanRequest->due_date) && $penaltyRate > 0) {
            $dueDate = new \DateTimeImmutable((string)$loanRequest->due_date);
            $payDate = new \DateTimeImmutable((string)$validated['collection_date']);
            $dayDiff = (int)$dueDate->diff($payDate)->format('%r%a');

            if ($dayDiff > $graceDays) {
                $lateDays = $dayDiff - $graceDays;
                // Daily penalty based on installment amount and penalty rate.
                $penaltyAmount = ($installmentAmount * $penaltyRate * $lateDays) / 100;
            }
        }

        $totalCapitalCollected = (float)MicrofinanceLoanCollection::query()
            ->where('mf_loan_request_id', $loanRequest->id)
            ->sum('capital_amount');

        $outstandingPrincipal = max($loanAmount - $totalCapitalCollected, 0);

        $remainingAfterPenalty = max($remainingAfterArrears - $penaltyAmount, 0);
        $interestAmount = min($remainingAfterPenalty, $interestPerInstallment);
        $capitalAmount = max($remainingAfterPenalty - $interestAmount, 0);

        if ($capitalAmount > $outstandingPrincipal) {
            $overflow = $capitalAmount - $outstandingPrincipal;
            $capitalAmount = $outstandingPrincipal;
            $interestAmount += $overflow;
        }

        $collection = MicrofinanceLoanCollection::create([
            'mf_loan_request_id' => $loanRequest->id,
            'collection_date' => $validated['collection_date'],
            'collected_amount' => $collectedAmount,
            'capital_amount' => $capitalAmount,
            'interest_amount' => $interestAmount,
            'penalty_amount' => $penaltyAmount,
            'payment_type' => $validated['payment_type'],
            'payment_reference' => $validated['payment_reference'] ?? null,
            'note' => $validated['note'] ?? null,
            'created_by' => optional($request->user())->id,
        ]);

        $nextPaymentBaseDate = !empty($loanRequest->next_payment_date)
            ? new \DateTimeImmutable((string)$loanRequest->next_payment_date)
            : $collectionDate;

        if ($collectionDate > $nextPaymentBaseDate) {
            $nextPaymentBaseDate = $collectionDate;
        }

        $dueBaseDate = !empty($loanRequest->due_date)
            ? new \DateTimeImmutable((string)$loanRequest->due_date)
            : $collectionDate;

        if ($collectionDate > $dueBaseDate) {
            $dueBaseDate = $collectionDate;
        }

        $loanRequest->next_payment_date = $this->shiftDateByRefundOption(
            $nextPaymentBaseDate,
            (string)$loanRequest->refund_option
        )->format('Y-m-d');

        // Due date must represent the next unpaid schedule point after accrual.
        $loanRequest->due_date = $dueCursor->format('Y-m-d');
        $loanRequest->arrears_balance = round($arrearsBalanceAfterPayment, 2);

        if ((float)($outstandingPrincipal - $capitalAmount) <= 0.01) {
            $loanRequest->status = 'released';
        }

        $loanRequest->save();

        return response()->json([
            'message' => 'Collection saved successfully.',
            'data' => $collection,
            'loan_dates' => [
                'next_payment_date' => $loanRequest->next_payment_date,
                'due_date' => $loanRequest->due_date,
            ],
            'breakdown' => [
                'arrears_outstanding_before' => round($arrearsOutstandingBefore, 2),
                'arrears_deducted' => round($arrearsDeducted, 2),
                'arrears_outstanding_after' => round($arrearsOutstandingAfter, 2),
                'extra_payment_after' => round($extraPaymentAfter, 2),
                'accrued_installment_count' => $accruedInstallmentCount,
                'capital_amount' => round($capitalAmount, 2),
                'interest_amount' => round($interestAmount, 2),
                'penalty_amount' => round($penaltyAmount, 2),
                'penalty_rate' => round($penaltyRate, 4),
                'grace_days' => $graceDays,
                'late_days' => $lateDays,
                'profit_amount' => round($interestAmount + $penaltyAmount, 2),
                'business_fund_amount' => round($capitalAmount, 2),
                'outstanding_principal_after' => round(max($outstandingPrincipal - $capitalAmount, 0), 2),
            ],
        ], 201);
    }

    public function destroy(Request $request, MicrofinanceLoanCollection $collection)
    {
        if ($collection->trashed()) {
            return response()->json([
                'message' => 'Invoice is already deleted.'
            ], 422);
        }

        $validated = $request->validate([
            'deletion_reason' => 'nullable|string|max:500',
        ]);

        $loanRequest = MicrofinanceLoanRequest::find($collection->mf_loan_request_id);
        if (!$loanRequest) {
            return response()->json([
                'message' => 'Loan request not found for this invoice.'
            ], 404);
        }

        $branchId = $this->scopedBranchId($request);
        if ($branchId !== null && (int) ($loanRequest->branch_id ?? 0) !== $branchId) {
            return response()->json([
                'message' => 'You can delete invoices only for loans in your branch.'
            ], 403);
        }

        DB::transaction(function () use ($request, $collection, $validated, $loanRequest): void {
            $collection->deleted_by = optional($request->user())->id;
            $collection->deletion_reason = $validated['deletion_reason'] ?? null;
            $collection->save();
            $collection->delete();

            $this->rebuildLoanStateFromCollections($loanRequest);
        });

        return response()->json([
            'message' => 'Invoice deleted successfully. Loan balances and related totals were reversed.',
        ]);
    }

    private function rebuildLoanStateFromCollections(MicrofinanceLoanRequest $loanRequest): void
    {
        $loanAmount = (float) $loanRequest->loan_amount;
        $termCount = max((int) $loanRequest->terms_count, 1);
        $installmentAmount = (float) $loanRequest->installment_amount;
        $refundOption = (string) ($loanRequest->refund_option ?: 'month');

        $loanEndDate = null;
        if (!empty($loanRequest->loan_end_date)) {
            try {
                $loanEndDate = new \DateTimeImmutable((string) $loanRequest->loan_end_date);
            } catch (\Throwable) {
                $loanEndDate = null;
            }
        }

        $firstDueDate = $this->resolveFirstDueDate($loanRequest, $refundOption, $termCount);
        $dueCursor = $firstDueDate;
        $nextPaymentDate = $firstDueDate;

        $arrearsBalance = 0.0;
        $totalCapitalCollected = 0.0;

        $collections = MicrofinanceLoanCollection::query()
            ->where('mf_loan_request_id', $loanRequest->id)
            ->orderBy('collection_date')
            ->orderBy('id')
            ->get();

        foreach ($collections as $row) {
            $collectionDate = new \DateTimeImmutable((string) $row->collection_date);
            $accrualCapDate = $collectionDate;
            if ($loanEndDate instanceof \DateTimeImmutable && $loanEndDate < $accrualCapDate) {
                $accrualCapDate = $loanEndDate;
            }
            $collectedAmount = (float) $row->collected_amount;

            while ($dueCursor <= $accrualCapDate) {
                $arrearsBalance += $installmentAmount;
                $dueCursor = $this->shiftDateByRefundOption($dueCursor, $refundOption);
            }

            $arrearsBalance = round($arrearsBalance - $collectedAmount, 2);
            $totalCapitalCollected += (float) $row->capital_amount;

            if ($collectionDate > $nextPaymentDate) {
                $nextPaymentDate = $collectionDate;
            }

            $nextPaymentDate = $this->shiftDateByRefundOption($nextPaymentDate, $refundOption);
        }

        $graceDays = max((int) ($loanRequest->penalty_grace_days ?? 2), 0);
        $outstandingPrincipal = max($loanAmount - $totalCapitalCollected, 0);

        $loanRequest->setAttribute('loan_balance', number_format($outstandingPrincipal, 2, '.', ''));
        $loanRequest->arrears_balance = round($arrearsBalance, 2);
        $loanRequest->setAttribute('due_date', $dueCursor->format('Y-m-d'));
        $loanRequest->next_payment_date = $nextPaymentDate->format('Y-m-d');
        $loanRequest->penalty_starts_on = $dueCursor->modify('+' . ($graceDays + 1) . ' days')->format('Y-m-d');
        $loanRequest->status = $outstandingPrincipal <= 0.01 ? 'released' : 'approved';
        $loanRequest->save();
    }

    private function resolveFirstDueDate(MicrofinanceLoanRequest $loanRequest, string $refundOption, int $termCount): \DateTimeImmutable
    {
        if (!empty($loanRequest->loan_end_date)) {
            $loanEndDate = new \DateTimeImmutable((string) $loanRequest->loan_end_date);
            if ($termCount <= 1) {
                return $loanEndDate;
            }

            return $this->shiftDateByRefundOption($loanEndDate, $refundOption, 0 - ($termCount - 1));
        }

        if (!empty($loanRequest->next_payment_date)) {
            return new \DateTimeImmutable((string) $loanRequest->next_payment_date);
        }

        if (!empty($loanRequest->due_date)) {
            return new \DateTimeImmutable((string) $loanRequest->due_date);
        }

        return new \DateTimeImmutable(date('Y-m-d'));
    }
}
