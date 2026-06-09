<?php

namespace App\Http\Controllers\Reports;

use App\Http\Controllers\Controller;
use App\Models\Company;
use App\Models\Finance;
use App\Models\FinanceCollection;
use App\Models\LoanRequest;
use App\Models\LoanRequestCollection;
use App\Models\MicrofinanceLoanCollection;
use App\Models\MicrofinanceLoanRequest;
use App\Models\Mortgage;
use App\Models\MortgagePayment;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class BranchRepaymentReportController extends Controller
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

        $mfPeriod = $this->mfPeriodRepaidByBranch($branchIds, $fromDate, $toDate);
        $financePeriod = $this->financePeriodRepaidByBranch($branchIds, $fromDate, $toDate);
        $mortgagePeriod = $this->mortgagePeriodRepaidByBranch($branchIds, $fromDate, $toDate);
        $instantPeriod = $this->instantPeriodRepaidByBranch($branchIds, $fromDate, $toDate);

        $mfPortfolio = $this->mfRepaymentByBranch($branchIds);
        $financePortfolio = $this->financeRepaymentByBranch($branchIds);
        $mortgagePortfolio = $this->mortgageRepaymentByBranch($branchIds);
        $instantPortfolio = $this->instantRepaymentByBranch($branchIds);

        $rows = [];
        foreach ($branches as $branch) {
            $id = (int) $branch->id;
            $mf = $mfPortfolio[$id] ?? [];
            $fin = $financePortfolio[$id] ?? [];
            $mort = $mortgagePortfolio[$id] ?? [];
            $inst = $instantPortfolio[$id] ?? [];

            $mfDue = (float) ($mf['total_due'] ?? 0);
            $mfRepaid = (float) ($mf['total_repaid'] ?? 0);
            $finDue = (float) ($fin['total_due'] ?? 0);
            $finRepaid = (float) ($fin['total_repaid'] ?? 0);
            $mortDue = (float) ($mort['total_due'] ?? 0);
            $mortRepaid = (float) ($mort['total_repaid'] ?? 0);
            $instDue = (float) ($inst['total_due'] ?? 0);
            $instRepaid = (float) ($inst['total_repaid'] ?? 0);

            $totalDue = round($mfDue + $finDue + $mortDue + $instDue, 2);
            $totalRepaid = round($mfRepaid + $finRepaid + $mortRepaid + $instRepaid, 2);
            $totalPending = round(
                max($mfDue - $mfRepaid, 0)
                + max($finDue - $finRepaid, 0)
                + max($mortDue - $mortRepaid, 0)
                + max($instDue - $instRepaid, 0),
                2
            );

            $periodRepaid = round(
                (float) ($mfPeriod[$id]['repaid'] ?? 0)
                + (float) ($financePeriod[$id]['repaid'] ?? 0)
                + (float) ($mortgagePeriod[$id]['repaid'] ?? 0)
                + (float) ($instantPeriod[$id]['repaid'] ?? 0),
                2
            );

            $repaymentRate = $this->repaymentRate($totalDue, $totalRepaid);

            $rows[] = [
                'branch_id' => $id,
                'branch_name' => $branch->name,
                'manager_name' => optional($branch->manager)->name,
                'total_due' => $totalDue,
                'total_repaid' => $totalRepaid,
                'total_pending' => $totalPending,
                'repayment_rate' => $repaymentRate,
                'repayment_status' => $this->repaymentStatus($repaymentRate),
                'period_repaid' => $periodRepaid,
                'mf_due' => $mfDue,
                'mf_repaid' => $mfRepaid,
                'mf_pending' => round(max($mfDue - $mfRepaid, 0), 2),
                'mf_rate' => $this->repaymentRate($mfDue, $mfRepaid),
                'mf_period_repaid' => (float) ($mfPeriod[$id]['repaid'] ?? 0),
                'mf_active_loans' => (int) ($mf['active_loans'] ?? 0),
                'finance_due' => $finDue,
                'finance_repaid' => $finRepaid,
                'finance_pending' => round(max($finDue - $finRepaid, 0), 2),
                'finance_rate' => $this->repaymentRate($finDue, $finRepaid),
                'finance_period_repaid' => (float) ($financePeriod[$id]['repaid'] ?? 0),
                'finance_active' => (int) ($fin['active_accounts'] ?? 0),
                'mortgage_due' => $mortDue,
                'mortgage_repaid' => $mortRepaid,
                'mortgage_pending' => round(max($mortDue - $mortRepaid, 0), 2),
                'mortgage_rate' => $this->repaymentRate($mortDue, $mortRepaid),
                'mortgage_period_repaid' => (float) ($mortgagePeriod[$id]['repaid'] ?? 0),
                'mortgage_active' => (int) ($mort['active_accounts'] ?? 0),
                'instant_due' => $instDue,
                'instant_repaid' => $instRepaid,
                'instant_pending' => round(max($instDue - $instRepaid, 0), 2),
                'instant_rate' => $this->repaymentRate($instDue, $instRepaid),
                'instant_period_repaid' => (float) ($instantPeriod[$id]['repaid'] ?? 0),
                'instant_active' => (int) ($inst['active_loans'] ?? 0),
            ];
        }

        usort($rows, static fn (array $a, array $b) => ($b['repayment_rate'] <=> $a['repayment_rate']));

        return response()->json([
            'from_date' => $fromDate,
            'to_date' => $toDate,
            'data' => $rows,
            'summary' => $this->buildSummary($rows),
        ]);
    }

    private function repaymentRate(float $due, float $repaid): float
    {
        if ($due <= 0) {
            return $repaid > 0 ? 100.0 : 0.0;
        }

        return round(min(100, ($repaid / $due) * 100), 2);
    }

    private function repaymentStatus(float $rate): string
    {
        if ($rate >= 90) {
            return 'excellent';
        }
        if ($rate >= 70) {
            return 'good';
        }
        if ($rate >= 40) {
            return 'watch';
        }

        return 'critical';
    }

    /**
     * @param  array<int, int>  $branchIds
     * @return array<int, array<string, float|int>>
     */
    private function mfRepaymentByBranch(array $branchIds): array
    {
        $stats = MicrofinanceLoanRequest::query()
            ->whereIn('branch_id', $branchIds)
            ->whereIn('status', ['approved', 'released'])
            ->groupBy('branch_id')
            ->selectRaw('branch_id')
            ->selectRaw('COUNT(*) as active_loans')
            ->selectRaw('COALESCE(SUM(refundable_amount), 0) as total_due')
            ->get()
            ->keyBy('branch_id');

        $repaidTotals = MicrofinanceLoanCollection::query()
            ->join('mf_loan_requests', 'mf_loan_requests.id', '=', 'mf_loan_collections.mf_loan_request_id')
            ->whereNull('mf_loan_collections.deleted_at')
            ->whereIn('mf_loan_requests.branch_id', $branchIds)
            ->whereIn('mf_loan_requests.status', ['approved', 'released'])
            ->groupBy('mf_loan_requests.branch_id')
            ->selectRaw('mf_loan_requests.branch_id as branch_id')
            ->selectRaw('COALESCE(SUM(mf_loan_collections.collected_amount), 0) as total_repaid')
            ->get()
            ->keyBy('branch_id');

        $mapped = [];
        foreach ($branchIds as $branchId) {
            $stat = $stats->get($branchId);
            $repaid = $repaidTotals->get($branchId);
            $mapped[$branchId] = [
                'active_loans' => (int) ($stat->active_loans ?? 0),
                'total_due' => (float) ($stat->total_due ?? 0),
                'total_repaid' => (float) ($repaid->total_repaid ?? 0),
            ];
        }

        return $mapped;
    }

    /**
     * @param  array<int, int>  $branchIds
     * @return array<int, array<string, float|int>>
     */
    private function financeRepaymentByBranch(array $branchIds): array
    {
        $rows = Finance::query()
            ->whereIn('branch_id', $branchIds)
            ->where('status', 'active')
            ->groupBy('branch_id')
            ->selectRaw('branch_id')
            ->selectRaw('COUNT(*) as active_accounts')
            ->selectRaw('COALESCE(SUM(refund_amount), 0) as total_due')
            ->selectRaw('COALESCE(SUM(total_paid_amount), 0) as total_repaid')
            ->get();

        return $this->mapByBranchId($rows);
    }

    /**
     * @param  array<int, int>  $branchIds
     * @return array<int, array<string, float|int>>
     */
    private function mortgageRepaymentByBranch(array $branchIds): array
    {
        $activeStatuses = ['approved', 'active', 'arrears', 'released'];

        $repaidRows = MortgagePayment::query()
            ->whereIn('branch_id', $branchIds)
            ->groupBy('branch_id')
            ->selectRaw('branch_id')
            ->selectRaw('COALESCE(SUM(amount), 0) as total_repaid')
            ->get()
            ->keyBy('branch_id');

        $dueRows = Mortgage::query()
            ->whereIn('branch_id', $branchIds)
            ->whereIn('status', $activeStatuses)
            ->groupBy('branch_id')
            ->selectRaw('branch_id')
            ->selectRaw('COUNT(*) as active_accounts')
            ->selectRaw('COALESCE(SUM(due_amount), 0) as due_remaining')
            ->get()
            ->keyBy('branch_id');

        $mapped = [];
        foreach ($branchIds as $branchId) {
            $repaid = (float) ($repaidRows->get($branchId)->total_repaid ?? 0);
            $dueRemaining = (float) ($dueRows->get($branchId)->due_remaining ?? 0);

            $mapped[$branchId] = [
                'active_accounts' => (int) ($dueRows->get($branchId)->active_accounts ?? 0),
                'total_repaid' => $repaid,
                'total_due' => round($repaid + $dueRemaining, 2),
            ];
        }

        return $mapped;
    }

    /**
     * @param  array<int, int>  $branchIds
     * @return array<int, array<string, float|int>>
     */
    private function instantRepaymentByBranch(array $branchIds): array
    {
        $rows = LoanRequest::query()
            ->whereIn('branch_id', $branchIds)
            ->where('status', 'approved')
            ->groupBy('branch_id')
            ->selectRaw('branch_id')
            ->selectRaw('COUNT(*) as active_loans')
            ->selectRaw('COALESCE(SUM(total_payable), 0) as total_due')
            ->selectRaw('COALESCE(SUM(total_collected), 0) as total_repaid')
            ->get();

        return $this->mapByBranchId($rows);
    }

    /**
     * @param  array<int, int>  $branchIds
     * @return array<int, array<string, float>>
     */
    private function mfPeriodRepaidByBranch(array $branchIds, string $fromDate, string $toDate): array
    {
        $rows = MicrofinanceLoanCollection::query()
            ->join('mf_loan_requests', 'mf_loan_requests.id', '=', 'mf_loan_collections.mf_loan_request_id')
            ->whereNull('mf_loan_collections.deleted_at')
            ->whereIn('mf_loan_requests.branch_id', $branchIds)
            ->whereDate('mf_loan_collections.collection_date', '>=', $fromDate)
            ->whereDate('mf_loan_collections.collection_date', '<=', $toDate)
            ->groupBy('mf_loan_requests.branch_id')
            ->selectRaw('mf_loan_requests.branch_id as branch_id')
            ->selectRaw('COALESCE(SUM(mf_loan_collections.collected_amount), 0) as repaid')
            ->get();

        return $this->mapRepaidByBranchId($rows);
    }

    /**
     * @param  array<int, int>  $branchIds
     * @return array<int, array<string, float>>
     */
    private function financePeriodRepaidByBranch(array $branchIds, string $fromDate, string $toDate): array
    {
        $rows = FinanceCollection::query()
            ->whereIn('branch_id', $branchIds)
            ->whereDate('payment_date', '>=', $fromDate)
            ->whereDate('payment_date', '<=', $toDate)
            ->groupBy('branch_id')
            ->selectRaw('branch_id')
            ->selectRaw('COALESCE(SUM(payment_amount), 0) as repaid')
            ->get();

        return $this->mapRepaidByBranchId($rows);
    }

    /**
     * @param  array<int, int>  $branchIds
     * @return array<int, array<string, float>>
     */
    private function mortgagePeriodRepaidByBranch(array $branchIds, string $fromDate, string $toDate): array
    {
        $rows = MortgagePayment::query()
            ->whereIn('branch_id', $branchIds)
            ->whereDate('paid_date', '>=', $fromDate)
            ->whereDate('paid_date', '<=', $toDate)
            ->groupBy('branch_id')
            ->selectRaw('branch_id')
            ->selectRaw('COALESCE(SUM(amount), 0) as repaid')
            ->get();

        return $this->mapRepaidByBranchId($rows);
    }

    /**
     * @param  array<int, int>  $branchIds
     * @return array<int, array<string, float>>
     */
    private function instantPeriodRepaidByBranch(array $branchIds, string $fromDate, string $toDate): array
    {
        $rows = LoanRequestCollection::query()
            ->join('loan_requests', 'loan_requests.id', '=', 'loan_request_collections.loan_request_id')
            ->whereIn('loan_requests.branch_id', $branchIds)
            ->whereDate('loan_request_collections.collection_date', '>=', $fromDate)
            ->whereDate('loan_request_collections.collection_date', '<=', $toDate)
            ->groupBy('loan_requests.branch_id')
            ->selectRaw('loan_requests.branch_id as branch_id')
            ->selectRaw('COALESCE(SUM(loan_request_collections.collected_amount), 0) as repaid')
            ->get();

        return $this->mapRepaidByBranchId($rows);
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
     * @param  \Illuminate\Support\Collection<int, object>|\Illuminate\Database\Eloquent\Collection<int, object>  $rows
     * @return array<int, array<string, float>>
     */
    private function mapRepaidByBranchId($rows): array
    {
        $mapped = [];
        foreach ($rows as $row) {
            $branchId = (int) ($row->branch_id ?? 0);
            if ($branchId <= 0) {
                continue;
            }
            $mapped[$branchId] = ['repaid' => (float) ($row->repaid ?? 0)];
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
            $summary['total_due'] += (float) ($row['total_due'] ?? 0);
            $summary['total_repaid'] += (float) ($row['total_repaid'] ?? 0);
            $summary['total_pending'] += (float) ($row['total_pending'] ?? 0);
            $summary['period_repaid'] += (float) ($row['period_repaid'] ?? 0);
            $summary['mf_due'] += (float) ($row['mf_due'] ?? 0);
            $summary['mf_repaid'] += (float) ($row['mf_repaid'] ?? 0);
            $summary['mf_period_repaid'] += (float) ($row['mf_period_repaid'] ?? 0);
            $summary['finance_due'] += (float) ($row['finance_due'] ?? 0);
            $summary['finance_repaid'] += (float) ($row['finance_repaid'] ?? 0);
            $summary['finance_period_repaid'] += (float) ($row['finance_period_repaid'] ?? 0);
            $summary['mortgage_due'] += (float) ($row['mortgage_due'] ?? 0);
            $summary['mortgage_repaid'] += (float) ($row['mortgage_repaid'] ?? 0);
            $summary['mortgage_period_repaid'] += (float) ($row['mortgage_period_repaid'] ?? 0);
            $summary['instant_due'] += (float) ($row['instant_due'] ?? 0);
            $summary['instant_repaid'] += (float) ($row['instant_repaid'] ?? 0);
            $summary['instant_period_repaid'] += (float) ($row['instant_period_repaid'] ?? 0);

            $status = (string) ($row['repayment_status'] ?? '');
            if (isset($summary["status_{$status}"])) {
                $summary["status_{$status}"]++;
            }
        }

        $summary['repayment_rate'] = $this->repaymentRate(
            (float) $summary['total_due'],
            (float) $summary['total_repaid']
        );

        foreach ([
            'total_due',
            'total_repaid',
            'total_pending',
            'period_repaid',
            'mf_due',
            'mf_repaid',
            'mf_period_repaid',
            'finance_due',
            'finance_repaid',
            'finance_period_repaid',
            'mortgage_due',
            'mortgage_repaid',
            'mortgage_period_repaid',
            'instant_due',
            'instant_repaid',
            'instant_period_repaid',
        ] as $key) {
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
            'total_due' => 0.0,
            'total_repaid' => 0.0,
            'total_pending' => 0.0,
            'repayment_rate' => 0.0,
            'period_repaid' => 0.0,
            'mf_due' => 0.0,
            'mf_repaid' => 0.0,
            'mf_period_repaid' => 0.0,
            'finance_due' => 0.0,
            'finance_repaid' => 0.0,
            'finance_period_repaid' => 0.0,
            'mortgage_due' => 0.0,
            'mortgage_repaid' => 0.0,
            'mortgage_period_repaid' => 0.0,
            'instant_due' => 0.0,
            'instant_repaid' => 0.0,
            'instant_period_repaid' => 0.0,
            'status_excellent' => 0,
            'status_good' => 0,
            'status_watch' => 0,
            'status_critical' => 0,
        ];
    }
}
