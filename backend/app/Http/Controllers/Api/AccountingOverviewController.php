<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AccountingExpense;
use App\Models\Company;
use App\Models\CompanyAccount;
use App\Models\EmployeeWalletBankDeposit;
use App\Models\EmployeeWalletCashHandover;
use App\Models\Finance;
use App\Models\FinanceCollection;
use App\Models\LoanRequest;
use App\Models\LoanRequestCollection;
use App\Models\MicrofinanceLoanRequest;
use App\Models\Mortgage;
use App\Models\MortgagePayment;
use App\Models\SavingsAccount;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class AccountingOverviewController extends Controller
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

    private function roundMoney(float $value): float
    {
        return round($value, 2);
    }

    private function sumIncomeForRange(int $branchId, ?string $fromDate, ?string $toDate): array
    {
        $financeCollections = FinanceCollection::query()
            ->join('finances', 'finances.id', '=', 'finance_collections.finance_id')
            ->where('finances.branch_id', $branchId);

        if ($fromDate) {
            $financeCollections->whereDate('finance_collections.payment_date', '>=', $fromDate);
        }
        if ($toDate) {
            $financeCollections->whereDate('finance_collections.payment_date', '<=', $toDate);
        }

        $financeInterest = (float) (clone $financeCollections)->sum('finance_collections.interest_paid');
        $financeRefund = (float) (clone $financeCollections)->sum('finance_collections.refund_amount');
        $financeOther = (float) (clone $financeCollections)->selectRaw(
            'COALESCE(SUM(GREATEST(finance_collections.payment_amount - finance_collections.interest_paid - finance_collections.principal_paid, 0)), 0) as total'
        )->value('total');

        $mfCollections = DB::table('mf_loan_collections')
            ->join('mf_loan_requests', 'mf_loan_requests.id', '=', 'mf_loan_collections.mf_loan_request_id')
            ->where('mf_loan_requests.branch_id', $branchId);

        if ($fromDate) {
            $mfCollections->whereDate('mf_loan_collections.collection_date', '>=', $fromDate);
        }
        if ($toDate) {
            $mfCollections->whereDate('mf_loan_collections.collection_date', '<=', $toDate);
        }

        $mfInterest = (float) (clone $mfCollections)->sum('mf_loan_collections.interest_amount');
        $mfPenalty = (float) (clone $mfCollections)->sum('mf_loan_collections.penalty_amount');

        $mortgagePayments = MortgagePayment::query()
            ->where('branch_id', $branchId);

        if ($fromDate) {
            $mortgagePayments->whereDate('paid_date', '>=', $fromDate);
        }
        if ($toDate) {
            $mortgagePayments->whereDate('paid_date', '<=', $toDate);
        }

        $mortgageInterest = (float) (clone $mortgagePayments)->sum('interest_amount');
        $mortgageProfit = (float) (clone $mortgagePayments)->sum('profit_amount');

        $instantCollections = LoanRequestCollection::query()
            ->join('loan_requests', 'loan_requests.id', '=', 'loan_request_collections.loan_request_id')
            ->where('loan_requests.branch_id', $branchId);

        if ($fromDate) {
            $instantCollections->whereDate('loan_request_collections.collection_date', '>=', $fromDate);
        }
        if ($toDate) {
            $instantCollections->whereDate('loan_request_collections.collection_date', '<=', $toDate);
        }

        $instantInterest = (float) (clone $instantCollections)->selectRaw(
            'COALESCE(SUM(loan_request_collections.collected_amount * CASE WHEN loan_requests.total_payable > 0 '
            . 'THEN GREATEST(loan_requests.total_payable - loan_requests.principal, 0) / loan_requests.total_payable '
            . 'ELSE 0 END), 0) as total'
        )->value('total');

        $mfProcessing = MicrofinanceLoanRequest::query()
            ->where('branch_id', $branchId)
            ->where('status', 'released');

        if ($fromDate) {
            $mfProcessing->whereDate('loan_request_date', '>=', $fromDate);
        }
        if ($toDate) {
            $mfProcessing->whereDate('loan_request_date', '<=', $toDate);
        }

        $mfProcessingTotal = (float) (clone $mfProcessing)->selectRaw(
            'COALESCE(SUM(COALESCE(document_charges, 0) + COALESCE(stamp_charges, 0) + COALESCE(insurance_charges, 0)), 0) as total'
        )->value('total');

        $mortgageProcessing = Mortgage::query()
            ->where('branch_id', $branchId)
            ->whereIn('status', ['approved', 'active', 'released']);

        if ($fromDate) {
            $mortgageProcessing->whereDate('approved_at', '>=', $fromDate);
        }
        if ($toDate) {
            $mortgageProcessing->whereDate('approved_at', '<=', $toDate);
        }

        $mortgageProcessingTotal = (float) (clone $mortgageProcessing)->selectRaw(
            'COALESCE(SUM(COALESCE(processing_fee, 0) + COALESCE(insurance_fee, 0)), 0) as total'
        )->value('total');

        $interestIncome = $financeInterest + $mfInterest + $mortgageInterest + $instantInterest + $mortgageProfit;
        $processingFees = $mfProcessingTotal + $mortgageProcessingTotal;
        $penaltyIncome = $mfPenalty;
        $otherIncome = max(0, $financeOther);

        return [
            'interest_income' => $this->roundMoney($interestIncome),
            'processing_fees' => $this->roundMoney($processingFees),
            'penalty_income' => $this->roundMoney($penaltyIncome),
            'other_income' => $this->roundMoney($otherIncome),
            'total_income' => $this->roundMoney($interestIncome + $processingFees + $penaltyIncome + $otherIncome),
            'refund_expenses' => $this->roundMoney($financeRefund),
        ];
    }

    private function sumManualExpensesForRange(int $branchId, ?string $fromDate, ?string $toDate): array
    {
        $query = AccountingExpense::query()->where('company_id', $branchId);

        if ($fromDate) {
            $query->whereDate('expense_date', '>=', $fromDate);
        }
        if ($toDate) {
            $query->whereDate('expense_date', '<=', $toDate);
        }

        $salaries = (float) (clone $query)->where('category', AccountingExpense::CATEGORY_SALARIES)->sum('amount');
        $office = (float) (clone $query)->whereIn('category', [
            AccountingExpense::CATEGORY_RENT,
            AccountingExpense::CATEGORY_UTILITIES,
            AccountingExpense::CATEGORY_OFFICE_SUPPLIES,
            AccountingExpense::CATEGORY_MAINTENANCE,
            AccountingExpense::CATEGORY_OTHER,
        ])->sum('amount');
        $fuel = (float) (clone $query)->where('category', AccountingExpense::CATEGORY_TRANSPORT)->sum('amount');
        $marketing = (float) (clone $query)->where('category', AccountingExpense::CATEGORY_MARKETING)->sum('amount');

        return [
            'salaries' => $this->roundMoney($salaries),
            'office_expenses' => $this->roundMoney($office),
            'fuel_expenses' => $this->roundMoney($fuel),
            'marketing_expenses' => $this->roundMoney($marketing),
            'manual_total' => $this->roundMoney($salaries + $office + $fuel + $marketing),
        ];
    }

    private function sumWalletIncomePreviewForRange(int $branchId, ?string $fromDate, ?string $toDate): array
    {
        $deposits = EmployeeWalletBankDeposit::query()
            ->where('branch_id', $branchId)
            ->where('status', 'approved');

        if ($fromDate) {
            $deposits->whereDate('deposit_date', '>=', $fromDate);
        }
        if ($toDate) {
            $deposits->whereDate('deposit_date', '<=', $toDate);
        }

        $handovers = EmployeeWalletCashHandover::query()
            ->where('branch_id', $branchId)
            ->where('status', 'approved');

        if ($fromDate) {
            $handovers->whereDate('handover_date', '>=', $fromDate);
        }
        if ($toDate) {
            $handovers->whereDate('handover_date', '<=', $toDate);
        }

        $transfersToBranchCash = EmployeeWalletCashHandover::query()
            ->where('branch_id', $branchId)
            ->where('status', 'approved')
            ->whereNotNull('branch_cash_transferred_at');

        if ($fromDate) {
            $transfersToBranchCash->whereDate('branch_cash_transferred_at', '>=', $fromDate);
        }
        if ($toDate) {
            $transfersToBranchCash->whereDate('branch_cash_transferred_at', '<=', $toDate);
        }

        $depositsAmount = (float) (clone $deposits)->sum('amount');
        $depositsCount = (int) (clone $deposits)->count();

        $handoversAmount = (float) (clone $handovers)->sum('amount');
        $handoversCount = (int) (clone $handovers)->count();

        $transfersAmount = (float) (clone $transfersToBranchCash)->sum('amount');
        $transfersCount = (int) (clone $transfersToBranchCash)->count();

        return [
            'collector_bank_deposits_preview' => $this->roundMoney($depositsAmount),
            'cash_handovers_preview' => $this->roundMoney($handoversAmount),
            'branch_cash_transfers_preview' => $this->roundMoney($transfersAmount),
            'wallet_income_preview_total' => $this->roundMoney($depositsAmount + $handoversAmount + $transfersAmount),
            'collector_bank_deposits_count' => $depositsCount,
            'cash_handovers_count' => $handoversCount,
            'branch_cash_transfers_count' => $transfersCount,
        ];
    }

    public function show(Request $request, Company $company): JsonResponse
    {
        if ($denied = $this->ensureCompanyAccess($request, $company)) {
            return $denied;
        }

        $validated = $request->validate([
            'from_date' => ['nullable', 'date'],
            'to_date' => ['nullable', 'date'],
        ]);

        $branchId = (int) $company->id;
        $today = Carbon::today();
        $fromDate = $validated['from_date'] ?? $today->copy()->startOfMonth()->toDateString();
        $toDate = $validated['to_date'] ?? $today->toDateString();

        $monthStart = $today->copy()->startOfMonth()->toDateString();
        $monthEnd = $today->copy()->endOfMonth()->toDateString();
        $yearStart = $today->copy()->startOfYear()->toDateString();
        $yearEnd = $today->copy()->endOfYear()->toDateString();

        $cashAccount = CompanyAccount::query()
            ->where('company_id', $branchId)
            ->where('account_type', CompanyAccount::TYPE_CASH)
            ->where('is_active', true)
            ->first();

        $bankBalance = (float) CompanyAccount::query()
            ->where('company_id', $branchId)
            ->where('account_type', CompanyAccount::TYPE_BANK)
            ->where('is_active', true)
            ->sum('current_balance');

        $mainAccount = CompanyAccount::query()
            ->where('company_id', $branchId)
            ->where('account_type', CompanyAccount::TYPE_MAIN)
            ->where('is_active', true)
            ->first();

        $cashInHand = (float) ($cashAccount?->current_balance ?? 0);

        $financeReceivable = (float) Finance::query()
            ->where('branch_id', $branchId)
            ->where('status', 'active')
            ->sum('balance_amount');

        $mfReceivable = (float) MicrofinanceLoanRequest::query()
            ->where('branch_id', $branchId)
            ->whereIn('status', ['released', 'approved'])
            ->sum('loan_balance');

        $instantReceivable = (float) LoanRequest::query()
            ->where('branch_id', $branchId)
            ->whereIn('status', ['approved', 'closed'])
            ->selectRaw('COALESCE(SUM(GREATEST(principal - COALESCE(total_collected, 0), 0)), 0) as total')
            ->value('total');

        $mortgageReceivable = (float) DB::table('mortgages as m')
            ->leftJoin(
                DB::raw('(SELECT mortgage_id, COALESCE(SUM(principal_amount), 0) as paid FROM mortgage_payments GROUP BY mortgage_id) mp'),
                'mp.mortgage_id',
                '=',
                'm.id'
            )
            ->where('m.branch_id', $branchId)
            ->whereIn('m.status', ['approved', 'active', 'released'])
            ->selectRaw('COALESCE(SUM(GREATEST(COALESCE(m.approved_amount, 0) - COALESCE(mp.paid, 0), 0)), 0) as total')
            ->value('total');

        $loanReceivable = $financeReceivable + $mfReceivable + $instantReceivable + $mortgageReceivable;
        $totalAssets = $cashInHand + $bankBalance + $loanReceivable;

        $investorDeposits = (float) SavingsAccount::query()
            ->where('branch_id', $branchId)
            ->where('status', 'active')
            ->sum('balance');

        $borrowedFunds = (float) ($mainAccount?->current_balance ?? 0);
        $totalLiabilities = $investorDeposits + $borrowedFunds;

        $periodIncome = $this->sumIncomeForRange($branchId, $fromDate, $toDate);
        $periodManualExpenses = $this->sumManualExpensesForRange($branchId, $fromDate, $toDate);
        $walletIncomePreview = $this->sumWalletIncomePreviewForRange($branchId, $fromDate, $toDate);

        $periodIncome = array_merge($periodIncome, [
            'collector_bank_deposits_preview' => $walletIncomePreview['collector_bank_deposits_preview'],
            'cash_handovers_preview' => $walletIncomePreview['cash_handovers_preview'],
            'branch_cash_transfers_preview' => $walletIncomePreview['branch_cash_transfers_preview'],
            'wallet_income_preview_total' => $walletIncomePreview['wallet_income_preview_total'],
        ]);

        $refundExpenses = $periodIncome['refund_expenses'];
        unset($periodIncome['refund_expenses']);

        $expenses = [
            'salaries' => $periodManualExpenses['salaries'],
            'office_expenses' => $periodManualExpenses['office_expenses'],
            'fuel_expenses' => $periodManualExpenses['fuel_expenses'],
            'marketing_expenses' => $periodManualExpenses['marketing_expenses'],
            'refund_expenses' => $refundExpenses,
            'total_expenses' => $this->roundMoney(
                $periodManualExpenses['manual_total'] + $refundExpenses
            ),
        ];

        $periodProfit = $this->roundMoney($periodIncome['total_income'] - $expenses['total_expenses']);

        $monthIncome = $this->sumIncomeForRange($branchId, $monthStart, $monthEnd);
        $monthManualExpenses = $this->sumManualExpensesForRange($branchId, $monthStart, $monthEnd);
        $monthRefund = $monthIncome['refund_expenses'];
        $monthlyProfit = $this->roundMoney(
            $monthIncome['total_income'] - ($monthManualExpenses['manual_total'] + $monthRefund)
        );

        $yearIncome = $this->sumIncomeForRange($branchId, $yearStart, $yearEnd);
        $yearManualExpenses = $this->sumManualExpensesForRange($branchId, $yearStart, $yearEnd);
        $yearRefund = $yearIncome['refund_expenses'];
        $yearlyProfit = $this->roundMoney(
            $yearIncome['total_income'] - ($yearManualExpenses['manual_total'] + $yearRefund)
        );

        return response()->json([
            'company' => [
                'id' => $company->id,
                'name' => $company->name,
                'currency' => $company->currency ?: 'LKR',
            ],
            'filters' => [
                'from_date' => $fromDate,
                'to_date' => $toDate,
            ],
            'assets' => [
                'cash_in_hand' => $this->roundMoney($cashInHand),
                'bank_balance' => $this->roundMoney($bankBalance),
                'loan_receivable' => $this->roundMoney($loanReceivable),
                'total_assets' => $this->roundMoney($totalAssets),
            ],
            'liabilities' => [
                'investor_deposits' => $this->roundMoney($investorDeposits),
                'borrowed_funds' => $this->roundMoney($borrowedFunds),
                'total_liabilities' => $this->roundMoney($totalLiabilities),
            ],
            'income' => $periodIncome,
            'expenses' => $expenses,
            'profit' => [
                'period_profit' => $periodProfit,
                'monthly_profit' => $monthlyProfit,
                'yearly_profit' => $yearlyProfit,
            ],
            'breakdown' => [
                'loan_receivable' => [
                    'finance' => $this->roundMoney($financeReceivable),
                    'microfinance' => $this->roundMoney($mfReceivable),
                    'instant_loans' => $this->roundMoney($instantReceivable),
                    'mortgages' => $this->roundMoney($mortgageReceivable),
                ],
                'wallet_income_preview' => [
                    'collector_bank_deposits' => $walletIncomePreview['collector_bank_deposits_preview'],
                    'cash_handovers' => $walletIncomePreview['cash_handovers_preview'],
                    'branch_cash_transfers' => $walletIncomePreview['branch_cash_transfers_preview'],
                    'total' => $walletIncomePreview['wallet_income_preview_total'],
                    'collector_bank_deposits_count' => $walletIncomePreview['collector_bank_deposits_count'],
                    'cash_handovers_count' => $walletIncomePreview['cash_handovers_count'],
                    'branch_cash_transfers_count' => $walletIncomePreview['branch_cash_transfers_count'],
                ],
            ],
        ]);
    }
}
