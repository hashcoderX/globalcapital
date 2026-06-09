<?php

namespace App\Http\Controllers\Reports;

use App\Http\Controllers\Controller;
use App\Models\Company;
use App\Models\Employee;
use App\Models\Finance;
use App\Models\FinanceCollection;
use App\Models\LoanRequest;
use App\Models\LoanRequestCollection;
use App\Models\MicrofinanceLoanCollection;
use App\Models\MicrofinanceLoanRequest;
use App\Models\Mortgage;
use App\Models\MortgagePayment;
use App\Models\SavingsAccount;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class BranchPerformanceReportController extends Controller
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
        if ($this->isAdminUser($request->user())) {
            $requested = (int) $request->get('branch_id', 0);
            return $requested > 0 ? $requested : null;
        }

        $branchId = (int) ($request->user()?->branch_id ?? 0);
        return $branchId > 0 ? $branchId : null;
    }

    public function index(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'from_date' => ['nullable', 'date'],
            'to_date' => ['nullable', 'date'],
            'branch_id' => ['nullable', 'integer', 'min:1'],
        ]);

        $fromDate = !empty($validated['from_date'])
            ? Carbon::parse((string) $validated['from_date'])->toDateString()
            : now()->startOfMonth()->toDateString();
        $toDate = !empty($validated['to_date'])
            ? Carbon::parse((string) $validated['to_date'])->toDateString()
            : now()->toDateString();

        $scopedBranchId = $this->scopedBranchId($request);

        $branchesQuery = Company::query()->with('manager:id,name,email')->orderBy('name');
        if ($scopedBranchId !== null) {
            $branchesQuery->where('id', $scopedBranchId);
        }

        $branches = $branchesQuery->get();
        $branchIds = $branches->pluck('id')->map(fn ($id) => (int) $id)->all();

        if (empty($branchIds)) {
            return response()->json([
                'from_date' => $fromDate,
                'to_date' => $toDate,
                'data' => [],
                'summary' => $this->emptySummary(),
            ]);
        }

        $mfCollections = $this->mfCollectionsByBranch($branchIds, $fromDate, $toDate);
        $financeCollections = $this->financeCollectionsByBranch($branchIds, $fromDate, $toDate);
        $mortgageCollections = $this->mortgageCollectionsByBranch($branchIds, $fromDate, $toDate);
        $instantCollections = $this->instantLoanCollectionsByBranch($branchIds, $fromDate, $toDate);

        $mfPortfolio = $this->mfPortfolioByBranch($branchIds);
        $financePortfolio = $this->financePortfolioByBranch($branchIds);
        $mortgagePortfolio = $this->mortgagePortfolioByBranch($branchIds);
        $instantPortfolio = $this->instantLoanPortfolioByBranch($branchIds);
        $savingsCounts = $this->savingsCountByBranch($branchIds);
        $employeeCounts = $this->employeeCountByBranch($branchIds);

        $rows = [];
        foreach ($branches as $branch) {
            $id = (int) $branch->id;
            $mfCol = $mfCollections[$id] ?? [];
            $finCol = $financeCollections[$id] ?? [];
            $mortCol = $mortgageCollections[$id] ?? [];
            $instCol = $instantCollections[$id] ?? [];
            $mfPort = $mfPortfolio[$id] ?? [];
            $finPort = $financePortfolio[$id] ?? [];
            $mortPort = $mortgagePortfolio[$id] ?? [];
            $instPort = $instantPortfolio[$id] ?? [];

            $periodCollected = round(
                (float) ($mfCol['collected'] ?? 0)
                + (float) ($finCol['collected'] ?? 0)
                + (float) ($mortCol['collected'] ?? 0)
                + (float) ($instCol['collected'] ?? 0),
                2
            );

            $periodProfit = round(
                (float) ($mfCol['interest'] ?? 0)
                + (float) ($mfCol['penalty'] ?? 0)
                + (float) ($finCol['interest_paid'] ?? 0)
                + (float) ($mortCol['profit'] ?? 0),
                2
            );

            $rows[] = [
                'branch_id' => $id,
                'branch_name' => $branch->name,
                'manager_name' => optional($branch->manager)->name,
                'opening_asset' => (float) ($branch->opening_asset ?? 0),
                'employee_count' => (int) ($employeeCounts[$id] ?? 0),
                'savings_accounts' => (int) ($savingsCounts[$id] ?? 0),
                'mf_active_loans' => (int) ($mfPort['active_loans'] ?? 0),
                'mf_arrears' => (float) ($mfPort['arrears'] ?? 0),
                'mf_outstanding' => (float) ($mfPort['outstanding'] ?? 0),
                'mf_collected' => (float) ($mfCol['collected'] ?? 0),
                'mf_capital' => (float) ($mfCol['capital'] ?? 0),
                'mf_interest' => (float) ($mfCol['interest'] ?? 0),
                'mf_penalty' => (float) ($mfCol['penalty'] ?? 0),
                'mf_transactions' => (int) ($mfCol['transactions'] ?? 0),
                'finance_active' => (int) ($finPort['active_accounts'] ?? 0),
                'finance_arrears' => (float) ($finPort['arrears'] ?? 0),
                'finance_outstanding' => (float) ($finPort['outstanding'] ?? 0),
                'finance_collected' => (float) ($finCol['collected'] ?? 0),
                'finance_interest' => (float) ($finCol['interest_paid'] ?? 0),
                'finance_transactions' => (int) ($finCol['transactions'] ?? 0),
                'mortgage_active' => (int) ($mortPort['active_accounts'] ?? 0),
                'mortgage_arrears' => (float) ($mortPort['arrears'] ?? 0),
                'mortgage_collected' => (float) ($mortCol['collected'] ?? 0),
                'mortgage_profit' => (float) ($mortCol['profit'] ?? 0),
                'mortgage_transactions' => (int) ($mortCol['transactions'] ?? 0),
                'instant_active' => (int) ($instPort['active_loans'] ?? 0),
                'instant_outstanding' => (float) ($instPort['outstanding'] ?? 0),
                'instant_collected' => (float) ($instCol['collected'] ?? 0),
                'instant_transactions' => (int) ($instCol['transactions'] ?? 0),
                'period_collected' => $periodCollected,
                'period_profit' => $periodProfit,
                'total_arrears' => round(
                    (float) ($mfPort['arrears'] ?? 0)
                    + (float) ($finPort['arrears'] ?? 0)
                    + (float) ($mortPort['arrears'] ?? 0),
                    2
                ),
                'total_outstanding' => round(
                    (float) ($mfPort['outstanding'] ?? 0)
                    + (float) ($finPort['outstanding'] ?? 0)
                    + (float) ($instPort['outstanding'] ?? 0),
                    2
                ),
            ];
        }

        usort($rows, static fn (array $a, array $b) => ($b['period_collected'] <=> $a['period_collected']));

        $summary = $this->buildSummary($rows);

        return response()->json([
            'from_date' => $fromDate,
            'to_date' => $toDate,
            'data' => $rows,
            'summary' => $summary,
        ]);
    }

    /**
     * @param  array<int, int>  $branchIds
     * @return array<int, array<string, float|int>>
     */
    private function mfCollectionsByBranch(array $branchIds, string $fromDate, string $toDate): array
    {
        $rows = MicrofinanceLoanCollection::query()
            ->join('mf_loan_requests', 'mf_loan_requests.id', '=', 'mf_loan_collections.mf_loan_request_id')
            ->whereNull('mf_loan_collections.deleted_at')
            ->whereIn('mf_loan_requests.branch_id', $branchIds)
            ->whereDate('mf_loan_collections.collection_date', '>=', $fromDate)
            ->whereDate('mf_loan_collections.collection_date', '<=', $toDate)
            ->groupBy('mf_loan_requests.branch_id')
            ->selectRaw('mf_loan_requests.branch_id as branch_id')
            ->selectRaw('COALESCE(SUM(mf_loan_collections.collected_amount), 0) as collected')
            ->selectRaw('COALESCE(SUM(mf_loan_collections.capital_amount), 0) as capital')
            ->selectRaw('COALESCE(SUM(mf_loan_collections.interest_amount), 0) as interest')
            ->selectRaw('COALESCE(SUM(mf_loan_collections.penalty_amount), 0) as penalty')
            ->selectRaw('COUNT(*) as transactions')
            ->get();

        return $this->mapByBranchId($rows);
    }

    /**
     * @param  array<int, int>  $branchIds
     * @return array<int, array<string, float|int>>
     */
    private function financeCollectionsByBranch(array $branchIds, string $fromDate, string $toDate): array
    {
        $rows = FinanceCollection::query()
            ->whereIn('branch_id', $branchIds)
            ->whereDate('payment_date', '>=', $fromDate)
            ->whereDate('payment_date', '<=', $toDate)
            ->groupBy('branch_id')
            ->selectRaw('branch_id')
            ->selectRaw('COALESCE(SUM(payment_amount), 0) as collected')
            ->selectRaw('COALESCE(SUM(interest_paid), 0) as interest_paid')
            ->selectRaw('COUNT(*) as transactions')
            ->get();

        return $this->mapByBranchId($rows);
    }

    /**
     * @param  array<int, int>  $branchIds
     * @return array<int, array<string, float|int>>
     */
    private function mortgageCollectionsByBranch(array $branchIds, string $fromDate, string $toDate): array
    {
        $rows = MortgagePayment::query()
            ->whereIn('branch_id', $branchIds)
            ->whereDate('paid_date', '>=', $fromDate)
            ->whereDate('paid_date', '<=', $toDate)
            ->groupBy('branch_id')
            ->selectRaw('branch_id')
            ->selectRaw('COALESCE(SUM(amount), 0) as collected')
            ->selectRaw('COALESCE(SUM(profit_amount), 0) as profit')
            ->selectRaw('COUNT(*) as transactions')
            ->get();

        return $this->mapByBranchId($rows);
    }

    /**
     * @param  array<int, int>  $branchIds
     * @return array<int, array<string, float|int>>
     */
    private function instantLoanCollectionsByBranch(array $branchIds, string $fromDate, string $toDate): array
    {
        $rows = LoanRequestCollection::query()
            ->join('loan_requests', 'loan_requests.id', '=', 'loan_request_collections.loan_request_id')
            ->whereIn('loan_requests.branch_id', $branchIds)
            ->whereDate('loan_request_collections.collection_date', '>=', $fromDate)
            ->whereDate('loan_request_collections.collection_date', '<=', $toDate)
            ->groupBy('loan_requests.branch_id')
            ->selectRaw('loan_requests.branch_id as branch_id')
            ->selectRaw('COALESCE(SUM(loan_request_collections.collected_amount), 0) as collected')
            ->selectRaw('COUNT(*) as transactions')
            ->get();

        return $this->mapByBranchId($rows);
    }

    /**
     * @param  array<int, int>  $branchIds
     * @return array<int, array<string, float|int>>
     */
    private function mfPortfolioByBranch(array $branchIds): array
    {
        $stats = MicrofinanceLoanRequest::query()
            ->whereIn('branch_id', $branchIds)
            ->whereIn('status', ['approved', 'released'])
            ->groupBy('branch_id')
            ->selectRaw('branch_id')
            ->selectRaw('COUNT(*) as active_loans')
            ->selectRaw('COALESCE(SUM(arrears_balance), 0) as arrears')
            ->selectRaw('COALESCE(SUM(refundable_amount), 0) as refundable_total')
            ->get()
            ->keyBy('branch_id');

        $collectedTotals = MicrofinanceLoanCollection::query()
            ->join('mf_loan_requests', 'mf_loan_requests.id', '=', 'mf_loan_collections.mf_loan_request_id')
            ->whereNull('mf_loan_collections.deleted_at')
            ->whereIn('mf_loan_requests.branch_id', $branchIds)
            ->whereIn('mf_loan_requests.status', ['approved', 'released'])
            ->groupBy('mf_loan_requests.branch_id')
            ->selectRaw('mf_loan_requests.branch_id as branch_id')
            ->selectRaw('COALESCE(SUM(mf_loan_collections.collected_amount), 0) as collected_total')
            ->get()
            ->keyBy('branch_id');

        $mapped = [];
        foreach ($branchIds as $branchId) {
            $stat = $stats->get($branchId);
            $collected = $collectedTotals->get($branchId);
            $refundable = (float) ($stat->refundable_total ?? 0);
            $paid = (float) ($collected->collected_total ?? 0);

            $mapped[$branchId] = [
                'branch_id' => $branchId,
                'active_loans' => (int) ($stat->active_loans ?? 0),
                'arrears' => (float) ($stat->arrears ?? 0),
                'outstanding' => max($refundable - $paid, 0),
            ];
        }

        return $mapped;
    }

    /**
     * @param  array<int, int>  $branchIds
     * @return array<int, array<string, float|int>>
     */
    private function financePortfolioByBranch(array $branchIds): array
    {
        $rows = Finance::query()
            ->whereIn('branch_id', $branchIds)
            ->where('status', 'active')
            ->groupBy('branch_id')
            ->selectRaw('branch_id')
            ->selectRaw('COUNT(*) as active_accounts')
            ->selectRaw('COALESCE(SUM(arrears), 0) as arrears')
            ->selectRaw('COALESCE(SUM(balance_amount), 0) as outstanding')
            ->get();

        return $this->mapByBranchId($rows);
    }

    /**
     * @param  array<int, int>  $branchIds
     * @return array<int, array<string, float|int>>
     */
    private function mortgagePortfolioByBranch(array $branchIds): array
    {
        $rows = Mortgage::query()
            ->whereIn('branch_id', $branchIds)
            ->whereIn('status', ['approved', 'active', 'arrears', 'released'])
            ->groupBy('branch_id')
            ->selectRaw('branch_id')
            ->selectRaw('COUNT(*) as active_accounts')
            ->selectRaw('COALESCE(SUM(arrears_amount), 0) as arrears')
            ->get();

        return $this->mapByBranchId($rows);
    }

    /**
     * @param  array<int, int>  $branchIds
     * @return array<int, array<string, float|int>>
     */
    private function instantLoanPortfolioByBranch(array $branchIds): array
    {
        $rows = LoanRequest::query()
            ->whereIn('branch_id', $branchIds)
            ->where('status', 'approved')
            ->groupBy('branch_id')
            ->selectRaw('branch_id')
            ->selectRaw('COUNT(*) as active_loans')
            ->selectRaw('COALESCE(SUM(GREATEST(total_payable - total_collected, 0)), 0) as outstanding')
            ->get();

        return $this->mapByBranchId($rows);
    }

    /**
     * @param  array<int, int>  $branchIds
     * @return array<int, int>
     */
    private function savingsCountByBranch(array $branchIds): array
    {
        if (!DB::getSchemaBuilder()->hasTable('savings_accounts')) {
            return [];
        }

        return SavingsAccount::query()
            ->whereIn('branch_id', $branchIds)
            ->groupBy('branch_id')
            ->selectRaw('branch_id, COUNT(*) as total')
            ->pluck('total', 'branch_id')
            ->map(fn ($v) => (int) $v)
            ->all();
    }

    /**
     * @param  array<int, int>  $branchIds
     * @return array<int, int>
     */
    private function employeeCountByBranch(array $branchIds): array
    {
        return Employee::query()
            ->whereIn('branch_id', $branchIds)
            ->groupBy('branch_id')
            ->selectRaw('branch_id, COUNT(*) as total')
            ->pluck('total', 'branch_id')
            ->map(fn ($v) => (int) $v)
            ->all();
    }

    /**
     * @param  \Illuminate\Support\Collection<int, object>|\Illuminate\Database\Eloquent\Collection<int, object>  $rows
     * @return array<int, array<string, mixed>>
     */
    private function mapByBranchId($rows): array
    {
        $mapped = [];
        foreach ($rows as $row) {
            $branchId = (int) ($row->branch_id ?? 0);
            if ($branchId <= 0) {
                continue;
            }
            $mapped[$branchId] = (array) $row;
        }

        return $mapped;
    }

    /**
     * @param  array<int, array<string, mixed>>  $rows
     * @return array<string, float|int>
     */
    private function buildSummary(array $rows): array
    {
        $summary = $this->emptySummary();
        foreach ($rows as $row) {
            $summary['branch_count']++;
            $summary['period_collected'] += (float) ($row['period_collected'] ?? 0);
            $summary['period_profit'] += (float) ($row['period_profit'] ?? 0);
            $summary['total_arrears'] += (float) ($row['total_arrears'] ?? 0);
            $summary['total_outstanding'] += (float) ($row['total_outstanding'] ?? 0);
            $summary['mf_collected'] += (float) ($row['mf_collected'] ?? 0);
            $summary['finance_collected'] += (float) ($row['finance_collected'] ?? 0);
            $summary['mortgage_collected'] += (float) ($row['mortgage_collected'] ?? 0);
            $summary['instant_collected'] += (float) ($row['instant_collected'] ?? 0);
            $summary['mf_active_loans'] += (int) ($row['mf_active_loans'] ?? 0);
            $summary['finance_active'] += (int) ($row['finance_active'] ?? 0);
            $summary['mortgage_active'] += (int) ($row['mortgage_active'] ?? 0);
            $summary['instant_active'] += (int) ($row['instant_active'] ?? 0);
        }

        foreach (['period_collected', 'period_profit', 'total_arrears', 'total_outstanding', 'mf_collected', 'finance_collected', 'mortgage_collected', 'instant_collected'] as $key) {
            $summary[$key] = round((float) $summary[$key], 2);
        }

        return $summary;
    }

    /**
     * @return array<string, float|int>
     */
    private function emptySummary(): array
    {
        return [
            'branch_count' => 0,
            'period_collected' => 0.0,
            'period_profit' => 0.0,
            'total_arrears' => 0.0,
            'total_outstanding' => 0.0,
            'mf_collected' => 0.0,
            'finance_collected' => 0.0,
            'mortgage_collected' => 0.0,
            'instant_collected' => 0.0,
            'mf_active_loans' => 0,
            'finance_active' => 0,
            'mortgage_active' => 0,
            'instant_active' => 0,
        ];
    }
}
