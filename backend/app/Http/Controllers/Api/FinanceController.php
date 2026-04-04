<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Customer;
use App\Models\DraftLoan;
use App\Models\Finance;
use App\Models\FinanceCollection;
use App\Models\FinanceDocument;
use App\Services\SpeedDraftCalculator;
use Carbon\Carbon;
use Illuminate\Support\Arr;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class FinanceController extends Controller
{
    public function __construct(private readonly SpeedDraftCalculator $speedDraftCalculator)
    {
    }

    public function index(Request $request): JsonResponse
    {
        $perPage = (int) ($request->get('per_page', 20));

        $query = Finance::with(['customer', 'documents'])
            ->orderBy('id', 'desc');

        if ($request->filled('customer_id')) {
            $query->where('customer_id', (int) $request->get('customer_id'));
        }

        if ($request->filled('status')) {
            $query->where('status', (string) $request->get('status'));
        }

        $data = $query->paginate($perPage);
        return response()->json($data);
    }

    public function show(int $id): JsonResponse
    {
        $finance = Finance::with(['customer', 'documents', 'collections' => function ($query) {
            $query->orderByDesc('payment_date')->orderByDesc('id');
        }])->findOrFail($id);
        return response()->json($finance);
    }

    public function incomeExpenseReport(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'from_date' => ['nullable', 'date'],
            'to_date' => ['nullable', 'date'],
            'product_type' => ['nullable', 'string', 'max:100'],
            'status' => ['nullable', 'string', 'max:50'],
            'group_by' => ['nullable', 'in:day,month'],
        ]);

        $groupBy = (string) ($validated['group_by'] ?? 'month');
        $groupExpression = $groupBy === 'day'
            ? "DATE(%s)"
            : "DATE_FORMAT(%s, '%Y-%m-01')";

        $collectionsBase = FinanceCollection::query()
            ->join('finances', 'finances.id', '=', 'finance_collections.finance_id');

        $disbursementsBase = Finance::query();

        if (!empty($validated['from_date'])) {
            $collectionsBase->whereDate('finance_collections.payment_date', '>=', $validated['from_date']);
            $disbursementsBase->whereDate('finances.start_date', '>=', $validated['from_date']);
        }

        if (!empty($validated['to_date'])) {
            $collectionsBase->whereDate('finance_collections.payment_date', '<=', $validated['to_date']);
            $disbursementsBase->whereDate('finances.start_date', '<=', $validated['to_date']);
        }

        if (!empty($validated['product_type'])) {
            $productType = strtolower(trim((string) $validated['product_type']));
            $collectionsBase->whereRaw('LOWER(finances.product_type) = ?', [$productType]);
            $disbursementsBase->whereRaw('LOWER(finances.product_type) = ?', [$productType]);
        }

        if (!empty($validated['status'])) {
            $status = strtolower(trim((string) $validated['status']));
            $collectionsBase->whereRaw('LOWER(finances.status) = ?', [$status]);
            $disbursementsBase->whereRaw('LOWER(finances.status) = ?', [$status]);
        }

        $incomeRows = (clone $collectionsBase)
            ->selectRaw(sprintf($groupExpression, 'finance_collections.payment_date') . ' as period')
            ->selectRaw('SUM(finance_collections.interest_paid) as interest_income')
            ->selectRaw('SUM(finance_collections.payment_amount) as total_collections')
            ->selectRaw('SUM(finance_collections.refund_amount) as refund_expense')
            ->groupBy('period')
            ->orderBy('period')
            ->get();

        $disbursementRows = (clone $disbursementsBase)
            ->selectRaw(sprintf($groupExpression, 'finances.start_date') . ' as period')
            ->selectRaw('SUM(finances.financed_amount) as disbursement_expense')
            ->selectRaw('COUNT(*) as disbursement_accounts')
            ->groupBy('period')
            ->orderBy('period')
            ->get();

        $periodMap = [];

        foreach ($incomeRows as $row) {
            $period = (string) $row->period;
            $periodMap[$period] = [
                'period' => $period,
                'interest_income' => round((float) ($row->interest_income ?? 0), 2),
                'collection_inflow' => round((float) ($row->total_collections ?? 0), 2),
                'refund_expense' => round((float) ($row->refund_expense ?? 0), 2),
                'disbursement_expense' => 0.0,
                'disbursement_accounts' => 0,
            ];
        }

        foreach ($disbursementRows as $row) {
            $period = (string) $row->period;

            if (!isset($periodMap[$period])) {
                $periodMap[$period] = [
                    'period' => $period,
                    'interest_income' => 0.0,
                    'collection_inflow' => 0.0,
                    'refund_expense' => 0.0,
                    'disbursement_expense' => 0.0,
                    'disbursement_accounts' => 0,
                ];
            }

            $periodMap[$period]['disbursement_expense'] = round((float) ($row->disbursement_expense ?? 0), 2);
            $periodMap[$period]['disbursement_accounts'] = (int) ($row->disbursement_accounts ?? 0);
        }

        ksort($periodMap);

        $periods = array_map(function (array $row) {
            $totalExpense = round((float) $row['disbursement_expense'] + (float) $row['refund_expense'], 2);
            $netProfit = round((float) $row['interest_income'] - $totalExpense, 2);

            return [
                ...$row,
                'total_expense' => $totalExpense,
                'net_profit' => $netProfit,
            ];
        }, array_values($periodMap));

        $summary = [
            'periods_count' => count($periods),
            'total_interest_income' => round((float) collect($periods)->sum('interest_income'), 2),
            'total_collection_inflow' => round((float) collect($periods)->sum('collection_inflow'), 2),
            'total_disbursement_expense' => round((float) collect($periods)->sum('disbursement_expense'), 2),
            'total_refund_expense' => round((float) collect($periods)->sum('refund_expense'), 2),
            'total_expense' => round((float) collect($periods)->sum('total_expense'), 2),
            'net_profit' => round((float) collect($periods)->sum('net_profit'), 2),
            'disbursement_accounts' => (int) collect($periods)->sum('disbursement_accounts'),
        ];

        return response()->json([
            'summary' => $summary,
            'periods' => $periods,
            'filters' => [
                'from_date' => $validated['from_date'] ?? null,
                'to_date' => $validated['to_date'] ?? null,
                'product_type' => $validated['product_type'] ?? null,
                'status' => $validated['status'] ?? null,
                'group_by' => $groupBy,
            ],
        ]);
    }

    public function cashFlowReport(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'from_date' => ['nullable', 'date'],
            'to_date' => ['nullable', 'date'],
            'product_type' => ['nullable', 'string', 'max:100'],
            'status' => ['nullable', 'string', 'max:50'],
            'group_by' => ['nullable', 'in:day,month'],
        ]);

        $groupBy = (string) ($validated['group_by'] ?? 'month');
        $groupExpression = $groupBy === 'day'
            ? "DATE(%s)"
            : "DATE_FORMAT(%s, '%Y-%m-01')";

        $collectionsBase = FinanceCollection::query()
            ->join('finances', 'finances.id', '=', 'finance_collections.finance_id');

        $disbursementsBase = Finance::query();

        if (!empty($validated['from_date'])) {
            $collectionsBase->whereDate('finance_collections.payment_date', '>=', $validated['from_date']);
            $disbursementsBase->whereDate('finances.start_date', '>=', $validated['from_date']);
        }

        if (!empty($validated['to_date'])) {
            $collectionsBase->whereDate('finance_collections.payment_date', '<=', $validated['to_date']);
            $disbursementsBase->whereDate('finances.start_date', '<=', $validated['to_date']);
        }

        if (!empty($validated['product_type'])) {
            $productType = strtolower(trim((string) $validated['product_type']));
            $collectionsBase->whereRaw('LOWER(finances.product_type) = ?', [$productType]);
            $disbursementsBase->whereRaw('LOWER(finances.product_type) = ?', [$productType]);
        }

        if (!empty($validated['status'])) {
            $status = strtolower(trim((string) $validated['status']));
            $collectionsBase->whereRaw('LOWER(finances.status) = ?', [$status]);
            $disbursementsBase->whereRaw('LOWER(finances.status) = ?', [$status]);
        }

        $inflowRows = (clone $collectionsBase)
            ->selectRaw(sprintf($groupExpression, 'finance_collections.payment_date') . ' as period')
            ->selectRaw('SUM(finance_collections.payment_amount) as cash_in')
            ->selectRaw('COUNT(*) as collection_count')
            ->groupBy('period')
            ->orderBy('period')
            ->get();

        $outflowRows = (clone $disbursementsBase)
            ->selectRaw(sprintf($groupExpression, 'finances.start_date') . ' as period')
            ->selectRaw('SUM(finances.financed_amount) as cash_out')
            ->selectRaw('COUNT(*) as disbursement_count')
            ->groupBy('period')
            ->orderBy('period')
            ->get();

        $refundRows = (clone $collectionsBase)
            ->selectRaw(sprintf($groupExpression, 'finance_collections.payment_date') . ' as period')
            ->selectRaw('SUM(finance_collections.refund_amount) as refund_out')
            ->groupBy('period')
            ->orderBy('period')
            ->get();

        $periodMap = [];

        foreach ($inflowRows as $row) {
            $period = (string) $row->period;
            $periodMap[$period] = [
                'period' => $period,
                'cash_in' => round((float) ($row->cash_in ?? 0), 2),
                'cash_out' => 0.0,
                'refund_out' => 0.0,
                'collection_count' => (int) ($row->collection_count ?? 0),
                'disbursement_count' => 0,
            ];
        }

        foreach ($outflowRows as $row) {
            $period = (string) $row->period;
            if (!isset($periodMap[$period])) {
                $periodMap[$period] = [
                    'period' => $period,
                    'cash_in' => 0.0,
                    'cash_out' => 0.0,
                    'refund_out' => 0.0,
                    'collection_count' => 0,
                    'disbursement_count' => 0,
                ];
            }
            $periodMap[$period]['cash_out'] = round((float) ($row->cash_out ?? 0), 2);
            $periodMap[$period]['disbursement_count'] = (int) ($row->disbursement_count ?? 0);
        }

        foreach ($refundRows as $row) {
            $period = (string) $row->period;
            if (!isset($periodMap[$period])) {
                $periodMap[$period] = [
                    'period' => $period,
                    'cash_in' => 0.0,
                    'cash_out' => 0.0,
                    'refund_out' => 0.0,
                    'collection_count' => 0,
                    'disbursement_count' => 0,
                ];
            }
            $periodMap[$period]['refund_out'] = round((float) ($row->refund_out ?? 0), 2);
        }

        ksort($periodMap);

        $runningBalance = 0.0;
        $periods = array_map(function (array $row) use (&$runningBalance) {
            $effectiveCashOut = round((float) $row['cash_out'] + (float) $row['refund_out'], 2);
            $netCashFlow = round((float) $row['cash_in'] - $effectiveCashOut, 2);
            $runningBalance = round($runningBalance + $netCashFlow, 2);

            return [
                ...$row,
                'effective_cash_out' => $effectiveCashOut,
                'net_cash_flow' => $netCashFlow,
                'running_cash_balance' => $runningBalance,
            ];
        }, array_values($periodMap));

        $summary = [
            'periods_count' => count($periods),
            'total_cash_in' => round((float) collect($periods)->sum('cash_in'), 2),
            'total_cash_out' => round((float) collect($periods)->sum('cash_out'), 2),
            'total_refund_out' => round((float) collect($periods)->sum('refund_out'), 2),
            'total_effective_cash_out' => round((float) collect($periods)->sum('effective_cash_out'), 2),
            'net_cash_flow' => round((float) collect($periods)->sum('net_cash_flow'), 2),
            'ending_cash_balance' => count($periods) > 0 ? (float) ($periods[count($periods) - 1]['running_cash_balance'] ?? 0) : 0.0,
            'total_collections' => (int) collect($periods)->sum('collection_count'),
            'total_disbursements' => (int) collect($periods)->sum('disbursement_count'),
        ];

        return response()->json([
            'summary' => $summary,
            'periods' => $periods,
            'filters' => [
                'from_date' => $validated['from_date'] ?? null,
                'to_date' => $validated['to_date'] ?? null,
                'product_type' => $validated['product_type'] ?? null,
                'status' => $validated['status'] ?? null,
                'group_by' => $groupBy,
            ],
        ]);
    }

    public function generalLedgerSnapshot(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'from_date' => ['nullable', 'date'],
            'to_date' => ['nullable', 'date'],
            'product_type' => ['nullable', 'string', 'max:100'],
            'status' => ['nullable', 'string', 'max:50'],
        ]);

        $fromDate = $validated['from_date'] ?? null;
        $toDate = $validated['to_date'] ?? null;

        $collectionsBase = FinanceCollection::query()
            ->join('finances', 'finances.id', '=', 'finance_collections.finance_id');

        $financesBase = Finance::query();

        if (!empty($validated['product_type'])) {
            $productType = strtolower(trim((string) $validated['product_type']));
            $collectionsBase->whereRaw('LOWER(finances.product_type) = ?', [$productType]);
            $financesBase->whereRaw('LOWER(finances.product_type) = ?', [$productType]);
        }

        if (!empty($validated['status'])) {
            $status = strtolower(trim((string) $validated['status']));
            $collectionsBase->whereRaw('LOWER(finances.status) = ?', [$status]);
            $financesBase->whereRaw('LOWER(finances.status) = ?', [$status]);
        }

        $applyDateWindow = function ($query, string $dateColumn, string $windowType) use ($fromDate, $toDate) {
            if ($windowType === 'opening') {
                if (!empty($fromDate)) {
                    $query->whereDate($dateColumn, '<', $fromDate);
                } else {
                    $query->whereRaw('1 = 0');
                }

                return;
            }

            if (!empty($fromDate)) {
                $query->whereDate($dateColumn, '>=', $fromDate);
            }

            if (!empty($toDate)) {
                $query->whereDate($dateColumn, '<=', $toDate);
            }
        };

        $disbursementOpening = (float) ((clone $financesBase)->tap(fn ($q) => $applyDateWindow($q, 'finances.start_date', 'opening'))->sum('finances.financed_amount') ?: 0);
        $disbursementPeriod = (float) ((clone $financesBase)->tap(fn ($q) => $applyDateWindow($q, 'finances.start_date', 'period'))->sum('finances.financed_amount') ?: 0);

        $principalOpening = (float) ((clone $collectionsBase)->tap(fn ($q) => $applyDateWindow($q, 'finance_collections.payment_date', 'opening'))->sum('finance_collections.principal_paid') ?: 0);
        $principalPeriod = (float) ((clone $collectionsBase)->tap(fn ($q) => $applyDateWindow($q, 'finance_collections.payment_date', 'period'))->sum('finance_collections.principal_paid') ?: 0);

        $interestOpening = (float) ((clone $collectionsBase)->tap(fn ($q) => $applyDateWindow($q, 'finance_collections.payment_date', 'opening'))->sum('finance_collections.interest_paid') ?: 0);
        $interestPeriod = (float) ((clone $collectionsBase)->tap(fn ($q) => $applyDateWindow($q, 'finance_collections.payment_date', 'period'))->sum('finance_collections.interest_paid') ?: 0);

        $cashInOpening = (float) ((clone $collectionsBase)->tap(fn ($q) => $applyDateWindow($q, 'finance_collections.payment_date', 'opening'))->sum('finance_collections.payment_amount') ?: 0);
        $cashInPeriod = (float) ((clone $collectionsBase)->tap(fn ($q) => $applyDateWindow($q, 'finance_collections.payment_date', 'period'))->sum('finance_collections.payment_amount') ?: 0);

        $refundOpening = (float) ((clone $collectionsBase)->tap(fn ($q) => $applyDateWindow($q, 'finance_collections.payment_date', 'opening'))->sum('finance_collections.refund_amount') ?: 0);
        $refundPeriod = (float) ((clone $collectionsBase)->tap(fn ($q) => $applyDateWindow($q, 'finance_collections.payment_date', 'period'))->sum('finance_collections.refund_amount') ?: 0);

        $makeLine = static function (
            string $accountCode,
            string $accountName,
            float $openingDebit,
            float $openingCredit,
            float $periodDebit,
            float $periodCredit
        ): array {
            $openingDebit = round($openingDebit, 2);
            $openingCredit = round($openingCredit, 2);
            $periodDebit = round($periodDebit, 2);
            $periodCredit = round($periodCredit, 2);

            $openingBalance = round($openingDebit - $openingCredit, 2);
            $periodMovement = round($periodDebit - $periodCredit, 2);
            $closingBalance = round($openingBalance + $periodMovement, 2);

            return [
                'account_code' => $accountCode,
                'account_name' => $accountName,
                'opening_debit' => $openingDebit,
                'opening_credit' => $openingCredit,
                'period_debit' => $periodDebit,
                'period_credit' => $periodCredit,
                'opening_balance' => $openingBalance,
                'period_movement' => $periodMovement,
                'closing_balance' => $closingBalance,
                'closing_side' => $closingBalance >= 0 ? 'debit' : 'credit',
                'closing_debit' => $closingBalance >= 0 ? abs($closingBalance) : 0.0,
                'closing_credit' => $closingBalance < 0 ? abs($closingBalance) : 0.0,
            ];
        };

        $lines = [
            $makeLine('1100', 'Cash Account', $cashInOpening, $disbursementOpening + $refundOpening, $cashInPeriod, $disbursementPeriod + $refundPeriod),
            $makeLine('1200', 'Loan Receivable', $disbursementOpening, $principalOpening, $disbursementPeriod, $principalPeriod),
            $makeLine('4100', 'Interest Income', 0.0, $interestOpening, 0.0, $interestPeriod),
            $makeLine('5100', 'Refund Expense', $refundOpening, 0.0, $refundPeriod, 0.0),
        ];

        $summary = [
            'opening_debits' => round((float) collect($lines)->sum('opening_debit'), 2),
            'opening_credits' => round((float) collect($lines)->sum('opening_credit'), 2),
            'period_debits' => round((float) collect($lines)->sum('period_debit'), 2),
            'period_credits' => round((float) collect($lines)->sum('period_credit'), 2),
            'closing_debits' => round((float) collect($lines)->sum('closing_debit'), 2),
            'closing_credits' => round((float) collect($lines)->sum('closing_credit'), 2),
            'net_period_movement' => round((float) collect($lines)->sum('period_movement'), 2),
            'accounts_count' => count($lines),
        ];

        return response()->json([
            'summary' => $summary,
            'lines' => $lines,
            'filters' => [
                'from_date' => $fromDate,
                'to_date' => $toDate,
                'product_type' => $validated['product_type'] ?? null,
                'status' => $validated['status'] ?? null,
            ],
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $user = $request->user();

        $validated = $request->validate([
            'customer_id' => ['nullable', 'integer', 'exists:customers,id'],
            'customer_no' => ['nullable', 'string', 'max:60'],
            'finance_type' => ['required', 'string', 'max:100'],
            'product_type' => ['required', 'string', 'max:100'],
            'asset_reference' => ['nullable', 'string', 'max:190'],
            'amount' => ['required', 'numeric', 'min:0.01'],
            'down_payment' => ['nullable', 'numeric', 'min:0'],
            'interest_rate' => ['required', 'numeric', 'min:0'],
            'interest_type' => ['nullable', 'in:fixed,reducing'],
            'tenure_months' => ['required', 'integer', 'min:1'],
            'installment_frequency' => ['nullable', 'in:daily,weekly,monthly,quarterly,yearly'],
            'manual_installment_amount' => ['nullable', 'numeric', 'min:0.01'],
            'start_date' => ['nullable', 'date'],
            'status' => ['nullable', 'in:pending_approval,active'],
            'vehicle_details' => ['nullable', 'array'],
            'valuation_details' => ['nullable', 'array'],
            'guarantor_details' => ['nullable', 'array'],
            'repayment_plan' => ['nullable', 'array'],
            'repayment_plan.installments' => ['nullable', 'array'],
            'repayment_plan.installments.*.installment_no' => ['nullable', 'integer', 'min:1'],
            'repayment_plan.installments.*.payment_date' => ['required_with:repayment_plan.installments', 'date'],
            'repayment_plan.installments.*.amount' => ['required_with:repayment_plan.installments', 'numeric', 'min:0.01'],
        ]);

        $customer = null;
        if (!empty($validated['customer_id'])) {
            $customer = Customer::findOrFail((int) $validated['customer_id']);
        } elseif (!empty($validated['customer_no'])) {
            $customerNo = strtoupper(trim((string) $validated['customer_no']));
            if (ctype_digit($customerNo) && strlen($customerNo) <= 5) {
                $serial = str_pad($customerNo, 5, '0', STR_PAD_LEFT);
                $customer = Customer::where('customer_code', 'like', '%-' . $serial)
                    ->orderByDesc('id')
                    ->first();
            } else {
                $customer = Customer::whereRaw('UPPER(customer_code) = ?', [$customerNo])->first();
            }
            if (!$customer) {
                return response()->json([
                    'message' => 'Customer not found for provided Customer No.',
                ], 422);
            }
        }

        if (!$customer) {
            return response()->json([
                'message' => 'customer_id or customer_no is required.',
            ], 422);
        }

        $downPayment = (float) ($validated['down_payment'] ?? 0);
        $assetAmount = (float) $validated['amount'];
        $financedAmount = max($assetAmount - $downPayment, 0);

        $annualRate = (float) $validated['interest_rate'] / 100;
        $tenureMonths = (int) $validated['tenure_months'];
        $frequency = (string) ($validated['installment_frequency'] ?? 'monthly');
        $interestType = (string) ($validated['interest_type'] ?? 'fixed');
        $repaymentPlan = is_array($validated['repayment_plan'] ?? null) ? $validated['repayment_plan'] : null;

        $installmentsPerYear = match (strtolower($frequency)) {
            'daily' => 365,
            'weekly' => 52,
            'quarterly' => 4,
            'yearly' => 1,
            default => 12,
        };

        $years = $tenureMonths / 12;
        $installmentCount = max(1, (int) round($years * $installmentsPerYear));

        if ($financedAmount <= 0 || $installmentCount <= 0) {
            return response()->json([
                'message' => 'Financed amount or tenure invalid for calculating installment.',
            ], 422);
        }

        // Simple vehicle finance model: fixed-rate by default, reducing if asked.
        $effectiveAnnualRate = $annualRate;
        $periodRate = $effectiveAnnualRate / $installmentsPerYear;

        if ($interestType === 'reducing' && $periodRate > 0) {
            $pow = pow(1 + $periodRate, $installmentCount);
            $installment = $financedAmount * $periodRate * $pow / ($pow - 1);
        } else {
            $totalInterest = $financedAmount * $annualRate * $years;
            $installment = ($financedAmount + $totalInterest) / $installmentCount;
        }

        $installmentAmount = round($installment, 2);
        if (isset($validated['manual_installment_amount']) && (float) $validated['manual_installment_amount'] > 0) {
            $installmentAmount = round((float) $validated['manual_installment_amount'], 2);
        }

        $planInstallments = $this->extractInstallmentPlanRows($repaymentPlan);
        if (!empty($planInstallments)) {
            $installmentAmount = round((float) ($planInstallments[0]['amount'] ?? $installmentAmount), 2);
            $repaymentPlan = [
                ...$repaymentPlan,
                'installments' => $planInstallments,
                'next_installment_index' => 0,
                'total_planned_amount' => round(array_sum(array_map(static fn ($row) => (float) $row['amount'], $planInstallments)), 2),
            ];
        }

        $isDraftLoan = self::isDraftLoanProductType((string) ($validated['product_type'] ?? ''));
        if ($isDraftLoan) {
            // Speed Draft uses monthly interest based on draft/financed amount.
            $installmentAmount = round($financedAmount * ($annualRate / 12), 2);
        }

        $effectiveFrequency = $isDraftLoan ? 'monthly' : ($validated['installment_frequency'] ?? 'monthly');

        $result = DB::transaction(function () use ($validated, $user, $customer, $financedAmount, $installmentAmount, $repaymentPlan, $isDraftLoan, $effectiveFrequency) {
            $initialStatus = (string) ($validated['status'] ?? 'pending_approval');

            $finance = Finance::create([
                'tenant_id' => 1,
                'branch_id' => $customer->branch_id ?? null,
                'customer_id' => $customer->id,
                'finance_type' => $validated['finance_type'],
                'product_type' => $validated['product_type'] ?? null,
                'asset_reference' => $validated['asset_reference'] ?? null,
                'vehicle_details' => $validated['vehicle_details'] ?? null,
                'valuation_details' => $validated['valuation_details'] ?? null,
                'guarantor_details' => $validated['guarantor_details'] ?? null,
                'repayment_plan' => $repaymentPlan,
                'amount' => $validated['amount'],
                'down_payment' => $validated['down_payment'] ?? 0,
                'financed_amount' => $financedAmount,
                'interest_rate' => $validated['interest_rate'],
                'interest_type' => $validated['interest_type'] ?? 'fixed',
                'tenure_months' => $validated['tenure_months'],
                'installment_frequency' => $effectiveFrequency,
                'installment_amount' => $installmentAmount,
                'status' => $initialStatus,
                'start_date' => $validated['start_date'] ?? now()->toDateString(),
                'created_by' => $user?->id,
            ]);

            $draftLoanId = null;
            if ($isDraftLoan) {
                $monthlyInterestAmount = round(
                    ((float) $finance->financed_amount) * ((((float) $finance->interest_rate) / 12) / 100),
                    2,
                );

                $draftLoan = DraftLoan::create([
                    'finance_id' => $finance->id,
                    'tenant_id' => (int) $finance->tenant_id,
                    'branch_id' => $finance->branch_id,
                    'customer_id' => $finance->customer_id,
                    'customer_no' => $customer->customer_code,
                    'finance_type' => $finance->finance_type,
                    'product_type' => $finance->product_type,
                    'asset_reference' => $finance->asset_reference,
                    'vehicle_details' => $finance->vehicle_details,
                    'valuation_details' => $finance->valuation_details,
                    'guarantor_details' => $finance->guarantor_details,
                    'amount' => $finance->amount,
                    'interest_rate' => $finance->interest_rate,
                    'tenure_months' => $finance->tenure_months,
                    'installment_frequency' => $finance->installment_frequency,
                    'interest_amount' => max($monthlyInterestAmount, 0),
                    'status' => $finance->status,
                    'start_date' => $finance->start_date,
                    'due_date' => $finance->due_date,
                    'due_amount' => round((float) ($finance->due_amount ?? 0), 2),
                    'total_paid_amount' => round((float) ($finance->total_paid_amount ?? 0), 2),
                    'balance_amount' => round((float) ($finance->balance_amount ?? 0), 2),
                    'next_collection_date' => $finance->next_collection_date,
                    'created_by' => $finance->created_by,
                ]);

                $draftLoanId = $draftLoan->id;
            }

            return [
                'finance' => $finance,
                'draft_loan_id' => $draftLoanId,
            ];
        });

        /** @var \App\Models\Finance $finance */
        $finance = $result['finance'];
        $draftLoanId = $result['draft_loan_id'];

        return response()->json([
            'id' => $finance->id,
            'status' => $finance->status,
            'installment_amount' => $finance->installment_amount,
            'draft_loan_id' => $draftLoanId,
            'saved_table' => $draftLoanId ? 'draft_loans' : 'finances',
        ], 201);
    }

    private static function isDraftLoanProductType(string $productType): bool
    {
        $normalized = strtolower(trim(str_replace(['_', '-'], ' ', $productType)));
        $normalized = preg_replace('/\s+/', ' ', $normalized) ?? $normalized;

        return str_contains($normalized, 'draft');
    }

    public function updateStatus(Request $request, int $id): JsonResponse
    {
        $validated = $request->validate([
            'action' => ['required', 'in:approve,reject,activate'],
            'note' => ['nullable', 'string'],
            'deduction_order' => ['nullable', 'array'],
            'deduction_order.mode' => ['required_with:deduction_order', 'in:flat,front_loaded,installment_wise'],
            'deduction_order.profit_percentage' => ['required_with:deduction_order', 'numeric', 'min:0', 'max:100'],
            'deduction_order.capital_percentage' => ['nullable', 'numeric', 'min:0', 'max:100'],
            'deduction_order.initial_installments' => ['nullable', 'integer', 'min:0', 'max:600'],
            'deduction_order.initial_profit_percentage' => ['nullable', 'numeric', 'min:0', 'max:100'],
            'deduction_order.remaining_profit_percentage' => ['nullable', 'numeric', 'min:0', 'max:100'],
            'deduction_order.installment_rules' => ['nullable', 'array'],
            'deduction_order.installment_rules.*.installment_no' => ['required_with:deduction_order.installment_rules', 'integer', 'min:1'],
            'deduction_order.installment_rules.*.profit_percentage' => ['required_with:deduction_order.installment_rules', 'numeric', 'min:0', 'max:100'],
            'deduction_order.installment_rules.*.installment_amount' => ['nullable', 'numeric', 'min:0'],
        ]);

        $finance = Finance::findOrFail($id);
        $action = (string) $validated['action'];
        $wasActive = $finance->status === 'active';

        if ($action === 'approve' || $action === 'activate') {
            $finance->status = 'active';

            if (!empty($validated['deduction_order']) && is_array($validated['deduction_order'])) {
                $deductionOrder = $validated['deduction_order'];
                $mode = (string) ($deductionOrder['mode'] ?? 'flat');
                $profitPercentage = round((float) ($deductionOrder['profit_percentage'] ?? 0), 2);
                $capitalPercentage = round(max(0, 100 - $profitPercentage), 2);

                $normalizedDeductionOrder = [
                    'mode' => $mode,
                    'profit_percentage' => $profitPercentage,
                    'capital_percentage' => $capitalPercentage,
                ];

                if ($mode === 'front_loaded') {
                    $initialProfit = round((float) ($deductionOrder['initial_profit_percentage'] ?? $profitPercentage), 2);
                    $remainingProfit = round((float) ($deductionOrder['remaining_profit_percentage'] ?? $profitPercentage), 2);

                    $normalizedDeductionOrder['initial_installments'] = (int) ($deductionOrder['initial_installments'] ?? 0);
                    $normalizedDeductionOrder['initial_profit_percentage'] = $initialProfit;
                    $normalizedDeductionOrder['initial_capital_percentage'] = round(max(0, 100 - $initialProfit), 2);
                    $normalizedDeductionOrder['remaining_profit_percentage'] = $remainingProfit;
                    $normalizedDeductionOrder['remaining_capital_percentage'] = round(max(0, 100 - $remainingProfit), 2);
                } elseif ($mode === 'installment_wise') {
                    $rules = is_array($deductionOrder['installment_rules'] ?? null)
                        ? $deductionOrder['installment_rules']
                        : [];

                    $normalizedRules = [];
                    foreach ($rules as $rule) {
                        if (!is_array($rule)) {
                            continue;
                        }

                        $ruleInstallmentNo = (int) ($rule['installment_no'] ?? 0);
                        $ruleProfit = round((float) ($rule['profit_percentage'] ?? $profitPercentage), 2);
                        $ruleCapital = round(max(0, 100 - $ruleProfit), 2);

                        if ($ruleInstallmentNo <= 0) {
                            continue;
                        }

                        $normalizedRule = [
                            'installment_no' => $ruleInstallmentNo,
                            'profit_percentage' => $ruleProfit,
                            'capital_percentage' => $ruleCapital,
                        ];

                        if (isset($rule['installment_amount']) && is_numeric($rule['installment_amount'])) {
                            $normalizedRule['installment_amount'] = round((float) $rule['installment_amount'], 2);
                            $normalizedRule['profit_amount'] = round(((float) $normalizedRule['installment_amount']) * ($ruleProfit / 100), 2);
                            $normalizedRule['capital_amount'] = round(((float) $normalizedRule['installment_amount']) * ($ruleCapital / 100), 2);
                        }

                        $normalizedRules[] = $normalizedRule;
                    }

                    usort($normalizedRules, static fn ($a, $b) => $a['installment_no'] <=> $b['installment_no']);
                    $normalizedDeductionOrder['installment_rules'] = $normalizedRules;
                }

                $repaymentPlan = is_array($finance->repayment_plan) ? $finance->repayment_plan : [];
                $repaymentPlan['deduction_order'] = $normalizedDeductionOrder;
                $finance->repayment_plan = $repaymentPlan;
            }

            if (!$wasActive) {
                $this->initializeApprovalTrackingFields($finance);
            }
        } elseif ($action === 'reject') {
            $finance->status = 'rejected';
        }

        $finance->save();

        return response()->json([
            'id' => $finance->id,
            'status' => $finance->status,
        ]);
    }

    private function initializeApprovalTrackingFields(Finance $finance): void
    {
        $isSpeedDraft = self::isDraftLoanProductType((string) ($finance->product_type ?? ''));
        $planRows = $this->extractInstallmentPlanRows($finance->repayment_plan);
        $planFirst = $planRows[0] ?? null;

        $startDate = $finance->start_date
            ? Carbon::parse($finance->start_date)
            : Carbon::today();

        $dueDate = $planFirst && !empty($planFirst['payment_date'])
            ? Carbon::parse((string) $planFirst['payment_date'])
            : $this->computeNextDueDate($startDate, $isSpeedDraft ? 'monthly' : (string) $finance->installment_frequency);
        $financeEndDate = (clone $startDate)->addMonthsNoOverflow((int) $finance->tenure_months);

        $annualRate = ((float) $finance->interest_rate) / 100;
        $installmentsPerYear = $isSpeedDraft
            ? 12
            : match (strtolower((string) $finance->installment_frequency)) {
                'daily' => 365,
                'weekly' => 52,
                'quarterly' => 4,
                'yearly' => 1,
                default => 12,
            };

        $periodRate = $installmentsPerYear > 0 ? $annualRate / $installmentsPerYear : 0.0;
        $dueInterestAmount = round(((float) $finance->financed_amount) * $periodRate, 2);
        $dueCapitalAmount = $isSpeedDraft ? 0.0 : $this->computeDueCapitalAmount($finance);

        $totalPayable = $this->computeTotalPayableAmount($finance);
        $isLease = strtolower((string) ($finance->product_type ?? '')) === 'lease';
        $openingOutstanding = $isLease ? $totalPayable : round((float) $finance->financed_amount, 2);

        $dueInstallmentAmount = $isSpeedDraft
            ? $dueInterestAmount
            : ($planFirst
                ? round((float) ($planFirst['amount'] ?? $finance->installment_amount), 2)
                : round((float) $finance->installment_amount, 2));

        $repaymentPlan = is_array($finance->repayment_plan) ? $finance->repayment_plan : [];
        if (!empty($planRows)) {
            $repaymentPlan['next_installment_index'] = 0;
            $repaymentPlan['total_planned_amount'] = round(array_sum(array_map(static fn ($row) => (float) $row['amount'], $planRows)), 2);
        }

        $finance->forceFill([
            'refund_amount' => $openingOutstanding,
            'total_paid_amount' => 0.00,
            'balance_amount' => $openingOutstanding,
            'due_date' => $dueDate->toDateString(),
            'due_amount' => $dueInstallmentAmount,
            'due_capital_amount' => $dueCapitalAmount,
            'due_interest_amount' => $dueInterestAmount,
            'arrears' => 0.00,
            'penalty' => 0.00,
            'next_collection_date' => $dueDate->toDateString(),
            'finance_end_date' => $financeEndDate->toDateString(),
            'repayment_plan' => !empty($repaymentPlan) ? $repaymentPlan : null,
        ]);
    }

    private function computeNextDueDate(Carbon $baseDate, string $frequency): Carbon
    {
        return match (strtolower($frequency)) {
            'daily' => (clone $baseDate)->addDay(),
            'weekly' => (clone $baseDate)->addWeek(),
            'quarterly' => (clone $baseDate)->addMonthsNoOverflow(3),
            'yearly' => (clone $baseDate)->addYear(),
            default => (clone $baseDate)->addMonthNoOverflow(),
        };
    }

    private function computeInstallmentCount(Finance $finance): int
    {
        $installmentsPerYear = match (strtolower((string) $finance->installment_frequency)) {
            'daily' => 365,
            'weekly' => 52,
            'quarterly' => 4,
            'yearly' => 1,
            default => 12,
        };

        $years = ((int) $finance->tenure_months) / 12;
        return max(1, (int) round($years * $installmentsPerYear));
    }

    private function computeTotalPayableAmount(Finance $finance): float
    {
        $planRows = $this->extractInstallmentPlanRows($finance->repayment_plan);
        if (!empty($planRows)) {
            return round(array_sum(array_map(static fn ($row) => (float) $row['amount'], $planRows)), 2);
        }

        $count = $this->computeInstallmentCount($finance);
        return round((float) $finance->installment_amount * $count, 2);
    }

    /**
     * @param mixed $repaymentPlan
     * @return array<int, array{installment_no:int,payment_date:string,amount:float}>
     */
    private function extractInstallmentPlanRows(mixed $repaymentPlan): array
    {
        if (!is_array($repaymentPlan)) {
            return [];
        }

        $rows = Arr::get($repaymentPlan, 'installments', []);
        if (!is_array($rows)) {
            return [];
        }

        $normalized = [];
        foreach ($rows as $index => $row) {
            if (!is_array($row)) {
                continue;
            }

            $amount = (float) ($row['amount'] ?? 0);
            $paymentDate = (string) ($row['payment_date'] ?? '');
            if ($amount <= 0 || $paymentDate === '') {
                continue;
            }

            $normalized[] = [
                'installment_no' => (int) ($row['installment_no'] ?? ($index + 1)),
                'payment_date' => Carbon::parse($paymentDate)->toDateString(),
                'amount' => round($amount, 2),
            ];
        }

        usort($normalized, static fn ($a, $b) => ($a['installment_no'] <=> $b['installment_no']));
        return $normalized;
    }

    private function computeDueCapitalAmount(Finance $finance): float
    {
        $tenureMonths = (int) $finance->tenure_months;
        if ($tenureMonths <= 0) {
            return 0.0;
        }

        return round(((float) $finance->financed_amount) / $tenureMonths, 2);
    }

    public function collections(int $id): JsonResponse
    {
        $finance = Finance::findOrFail($id);

        $collections = FinanceCollection::where('finance_id', $finance->id)
            ->orderByDesc('payment_date')
            ->orderByDesc('id')
            ->get();

        return response()->json([
            'data' => $collections,
        ]);
    }

    public function storeCollection(Request $request, int $id): JsonResponse
    {
        $validated = $request->validate([
            'payment_date' => ['required', 'date'],
            'payment_amount' => ['required', 'numeric', 'min:0'],
            'pay_type' => ['nullable', 'in:cash,bank_transfer,cheque,card,online'],
            'reference_no' => ['nullable', 'string', 'max:100'],
            'cheque_no' => ['nullable', 'required_if:pay_type,cheque', 'string', 'max:100'],
            'cheque_date' => ['nullable', 'required_if:pay_type,cheque', 'date'],
            'cheque_bank' => ['nullable', 'required_if:pay_type,cheque', 'string', 'max:120'],
        ]);

        $finance = Finance::findOrFail($id);
        $user = $request->user();

        $latest = FinanceCollection::where('finance_id', $finance->id)
            ->orderByDesc('payment_date')
            ->orderByDesc('id')
            ->first();

        $isSpeedDraft = self::isDraftLoanProductType((string) ($finance->product_type ?? ''));
        $currentCapital = $latest ? (float) $latest->remaining_capital : (float) $finance->financed_amount;
        $currentArrears = $latest ? (float) $latest->arrears : 0.0;
        $paymentAmount = (float) $validated['payment_amount'];
        $paymentDate = Carbon::parse((string) $validated['payment_date']);
        $installmentsPerYear = $isSpeedDraft
            ? 12
            : match (strtolower((string) $finance->installment_frequency)) {
                'daily' => 365,
                'weekly' => 52,
                'quarterly' => 4,
                'yearly' => 1,
                default => 12,
            };
        $periodRatePercent = $installmentsPerYear > 0
            ? ((float) $finance->interest_rate) / $installmentsPerYear
            : (float) $finance->interest_rate;

        $paidInterestInPeriod = 0.0;
        if ($isSpeedDraft) {
            $periodStart = (clone $paymentDate)->startOfMonth()->toDateString();
            $periodEnd = (clone $paymentDate)->endOfMonth()->toDateString();

            $paidInterestInPeriod = round((float) FinanceCollection::query()
                ->where('finance_id', $finance->id)
                ->whereBetween('payment_date', [$periodStart, $periodEnd])
                ->sum('interest_paid'), 2);
        }

        $calculation = $isSpeedDraft
            ? $this->speedDraftCalculator->calculateSpeedDraftMonthlyPaymentWithHistory(
                $currentCapital,
                $periodRatePercent,
                $paymentAmount,
                $paidInterestInPeriod,
            )
            : $this->speedDraftCalculator->calculateMonthlyPayment(
                $currentCapital,
                $periodRatePercent,
                $paymentAmount,
                $currentArrears,
            );

        $isLease = strtolower((string) ($finance->product_type ?? '')) === 'lease';
        $openingOutstanding = (float) $finance->balance_amount;
        if ($openingOutstanding <= 0) {
            $openingOutstanding = $isLease
                ? $this->computeTotalPayableAmount($finance)
                : round((float) $finance->financed_amount, 2);
        }

        $paidTowardOutstanding = round(min($paymentAmount, $openingOutstanding), 2);
        $txnOverPayment = round(max($paymentAmount - $paidTowardOutstanding, 0), 2);
        $newTotalPaid = round((float) $finance->total_paid_amount + $paidTowardOutstanding, 2);
        $newBalance = $isSpeedDraft
            ? round((float) $calculation['new_capital'], 2)
            : round(max($openingOutstanding - $paidTowardOutstanding, 0), 2);
        $newRefundTotal = $newBalance;

        $nextDueDate = $isSpeedDraft
            ? $this->computeNextDueDate($paymentDate, 'monthly')
            : $this->computeNextDueDate($paymentDate, (string) $finance->installment_frequency);
        $periodRateDecimal = $periodRatePercent / 100;
        $nextDueInterest = round(((float) $calculation['new_capital']) * $periodRateDecimal, 2);
        $dueCapitalAmount = $isSpeedDraft ? 0.0 : $this->computeDueCapitalAmount($finance);

        $planRows = $this->extractInstallmentPlanRows($finance->repayment_plan);
        $planState = is_array($finance->repayment_plan) ? $finance->repayment_plan : [];
        $currentInstallmentIndex = max(0, (int) ($planState['next_installment_index'] ?? 0));
        $currentPlanRow = $planRows[$currentInstallmentIndex] ?? null;
        $currentDueAmount = $currentPlanRow
            ? round((float) ($currentPlanRow['amount'] ?? $finance->installment_amount), 2)
            : round((float) $finance->due_amount > 0 ? (float) $finance->due_amount : (float) $finance->installment_amount, 2);
        $graceDays = max(0, (int) ($planState['grace_period_days'] ?? 0));
        $currentDueDate = $currentPlanRow && !empty($currentPlanRow['payment_date'])
            ? Carbon::parse((string) $currentPlanRow['payment_date'])
            : ($finance->due_date ? Carbon::parse((string) $finance->due_date) : $paymentDate);
        $graceEndDate = (clone $currentDueDate)->addDays($graceDays);
        $isPastGrace = $paymentDate->gt($graceEndDate);
        $uncoveredDue = round(max($currentDueAmount - $paymentAmount, 0), 2);
        $scheduleArrears = ($isSpeedDraft || !$isPastGrace) ? 0.0 : $uncoveredDue;
        $finalArrears = $isSpeedDraft
            ? round((float) $calculation['new_arrears'], 2)
            : round(max((float) $calculation['new_arrears'], $scheduleArrears), 2);

        $advanceInstallment = $paymentAmount + 0.0001 >= $currentDueAmount;
        $updatedInstallmentIndex = $currentInstallmentIndex;
        $nextPlanRow = null;
        if (!$isSpeedDraft && !empty($planRows)) {
            $updatedInstallmentIndex = $currentInstallmentIndex + ($advanceInstallment ? 1 : 0);
            $nextPlanRow = $planRows[$updatedInstallmentIndex] ?? null;
        }

        $collection = DB::transaction(function () use ($finance, $validated, $paymentAmount, $txnOverPayment, $calculation, $currentCapital, $currentArrears, $user, $newTotalPaid, $newBalance, $newRefundTotal, $nextDueDate, $nextDueInterest, $dueCapitalAmount, $periodRatePercent, $planState, $planRows, $updatedInstallmentIndex, $nextPlanRow, $currentPlanRow, $currentDueAmount, $finalArrears, $isSpeedDraft, $paidInterestInPeriod) {
            /** @var \App\Models\FinanceCollection $created */
            $created = FinanceCollection::create([
                'finance_id' => $finance->id,
                'branch_id' => $finance->branch_id ?? $user?->branch_id,
                'collector_id' => $user?->id,
                'payment_date' => $validated['payment_date'],
                'payment_amount' => round($paymentAmount, 2),
                'refund_amount' => $txnOverPayment,
                'pay_type' => (string) ($validated['pay_type'] ?? 'cash'),
                'reference_no' => $validated['reference_no'] ?? null,
                'cheque_no' => $validated['cheque_no'] ?? null,
                'cheque_date' => $validated['cheque_date'] ?? null,
                'cheque_bank' => $validated['cheque_bank'] ?? null,
                'interest_charged' => $calculation['interest'],
                'interest_paid' => $calculation['interest_paid'],
                'principal_paid' => $calculation['principal_paid'],
                'arrears' => $finalArrears,
                'remaining_capital' => $calculation['new_capital'],
                'meta' => [
                    'model' => $isSpeedDraft ? 'speed_draft_interest_first' : 'standard_interest_first',
                    'opening_capital' => round($currentCapital, 2),
                    'opening_arrears' => round($currentArrears, 2),
                    'interest_rate_period' => round($periodRatePercent, 4),
                    'interest_paid_in_period_before' => round($paidInterestInPeriod, 2),
                    'due_amount' => $currentDueAmount,
                ],
                'created_by' => $user?->id,
            ]);

            $plan = $planState;
            if (!$isSpeedDraft && !empty($planRows)) {
                $plan['next_installment_index'] = $updatedInstallmentIndex;
            }

            if ($calculation['new_capital'] <= 0.0 && $calculation['new_arrears'] <= 0.0) {
                $finance->forceFill([
                    'status' => 'settled',
                    'refund_amount' => $newRefundTotal,
                    'total_paid_amount' => $newTotalPaid,
                    'balance_amount' => 0.00,
                    'installment_amount' => $isSpeedDraft ? 0.00 : $finance->installment_amount,
                    'due_amount' => 0.00,
                    'due_capital_amount' => 0.00,
                    'due_interest_amount' => 0.00,
                    'arrears' => 0.00,
                    'due_date' => null,
                    'next_collection_date' => null,
                    'repayment_plan' => !empty($plan) ? $plan : null,
                ]);
            } else {
                $finance->forceFill([
                    'refund_amount' => $newRefundTotal,
                    'total_paid_amount' => $newTotalPaid,
                    'balance_amount' => $newBalance,
                    'installment_amount' => $isSpeedDraft ? $nextDueInterest : $finance->installment_amount,
                    'due_amount' => $isSpeedDraft
                        ? $nextDueInterest
                        : ($nextPlanRow
                            ? round((float) ($nextPlanRow['amount'] ?? $finance->installment_amount), 2)
                            : ($currentPlanRow
                                ? round((float) ($currentPlanRow['amount'] ?? $finance->installment_amount), 2)
                                : round((float) $finance->installment_amount, 2))),
                    'due_capital_amount' => $dueCapitalAmount,
                    'due_interest_amount' => $nextDueInterest,
                    'arrears' => $finalArrears,
                    'due_date' => $isSpeedDraft
                        ? $nextDueDate->toDateString()
                        : ($nextPlanRow
                            ? Carbon::parse((string) $nextPlanRow['payment_date'])->toDateString()
                            : ($currentPlanRow
                                ? Carbon::parse((string) $currentPlanRow['payment_date'])->toDateString()
                                : $nextDueDate->toDateString())),
                    'next_collection_date' => $isSpeedDraft
                        ? $nextDueDate->toDateString()
                        : ($nextPlanRow
                            ? Carbon::parse((string) $nextPlanRow['payment_date'])->toDateString()
                            : ($currentPlanRow
                                ? Carbon::parse((string) $currentPlanRow['payment_date'])->toDateString()
                                : $nextDueDate->toDateString())),
                    'repayment_plan' => !empty($plan) ? $plan : null,
                ]);
            }

            $finance->save();

            if ($isSpeedDraft) {
                $draftLoan = DraftLoan::where('finance_id', $finance->id)->first();
                if ($draftLoan) {
                    $draftLoan->forceFill([
                        'status' => $finance->status,
                        'interest_amount' => round((float) ($finance->due_interest_amount ?? 0), 2),
                        'due_amount' => round((float) ($finance->due_amount ?? 0), 2),
                        'total_paid_amount' => round((float) ($finance->total_paid_amount ?? 0), 2),
                        'balance_amount' => round((float) ($finance->balance_amount ?? 0), 2),
                        'due_date' => $finance->due_date,
                        'next_collection_date' => $finance->next_collection_date,
                    ]);
                    $draftLoan->save();
                }
            }

            return $created;
        });

        return response()->json([
            'message' => 'Collection posted successfully',
            'collection' => $collection,
            'calculation' => [
                'interest' => $calculation['interest'],
                'interest_paid' => $calculation['interest_paid'],
                'principal_paid' => $calculation['principal_paid'],
                'profit_collected' => $calculation['interest_paid'],
                'capital_collected' => $calculation['principal_paid'],
                'new_capital' => $calculation['new_capital'],
                'new_arrears' => $finalArrears,
                'refund_amount' => $txnOverPayment,
                'total_paid_amount' => $newTotalPaid,
                'balance_amount' => $newBalance,
            ],
        ], 201);
    }

    public function documents(int $id): JsonResponse
    {
        $documents = FinanceDocument::where('finance_id', $id)->get();
        return response()->json([
            'data' => $documents,
        ]);
    }

    public function storeDocument(Request $request, int $id): JsonResponse
    {
        $request->validate([
            'document_type' => ['required', 'string', 'max:100'],
            'file' => ['required', 'file', 'mimes:pdf,doc,docx,jpg,jpeg,png', 'max:10240'],
        ]);

        $finance = Finance::findOrFail($id);
        $user = $request->user();

        if (!$request->hasFile('file')) {
            return response()->json([
                'message' => 'No file uploaded',
            ], 400);
        }

        $file = $request->file('file');
        $originalName = $file->getClientOriginalName();
        $fileName = time() . '_' . $originalName;
        $filePath = $file->storeAs('finance_documents', $fileName, 'public');

        $document = FinanceDocument::create([
            'finance_id' => $finance->id,
            'document_type' => $request->document_type,
            'file_path' => $filePath,
            'original_name' => $originalName,
            'uploaded_by' => $user?->id,
        ]);

        return response()->json([
            'message' => 'Document uploaded successfully',
            'document' => $document,
        ], 201);
    }
}
