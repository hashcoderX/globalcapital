<?php

namespace App\Http\Controllers\Reports;

use App\Http\Controllers\Controller;
use App\Models\MicrofinanceGroup;
use Carbon\Carbon;
use Illuminate\Http\Request;

class LoanRepaymentReportController extends Controller
{
    public function index(Request $request)
    {
        [$fromDate, $toDate] = $this->resolveDateRange($request);

        $dateColumns = collect();
        $cursor = $fromDate->copy();
        while ($cursor->lte($toDate)) {
            $dateColumns->push($cursor->toDateString());
            $cursor->addDay();
        }

        $groups = MicrofinanceGroup::query()
            ->select(['id', 'mf_center_id', 'name', 'code'])
            ->with(['center:id,name'])
            ->with([
                'loans' => function ($loanQuery) use ($fromDate, $toDate) {
                    $loanQuery
                        ->select([
                            'id',
                            'mf_group_id',
                            'customer_no',
                            'customer_name',
                            'contact_no',
                            'installment_amount',
                            'refundable_amount',
                            'loan_balance',
                            'due_date',
                        ])
                        ->with([
                            'collections' => function ($collectionQuery) use ($fromDate, $toDate) {
                                $collectionQuery
                                    ->select([
                                        'id',
                                        'mf_loan_request_id',
                                        'collection_date',
                                        'collected_amount',
                                        'correction_amount',
                                    ])
                                    ->whereBetween('collection_date', [
                                        $fromDate->toDateString(),
                                        $toDate->toDateString(),
                                    ])
                                    ->orderBy('collection_date');
                            },
                        ])
                        ->withSum('collections as total_collected_amount', 'collected_amount')
                        ->orderBy('customer_no');
                },
            ])
            ->orderBy('code')
            ->orderBy('name')
            ->get();

        $today = Carbon::today();

        $reportGroups = $groups->map(function ($group) use ($dateColumns, $today) {
            $groupDateTotals = [];
            foreach ($dateColumns as $date) {
                $groupDateTotals[$date] = [
                    'paid' => 0.0,
                    'correction' => 0.0,
                ];
            }

            $groupTotals = [
                'installment' => 0.0,
                'balance' => 0.0,
                'period_paid' => 0.0,
                'period_correction' => 0.0,
                'loan_count' => 0,
            ];

            $rows = $group->loans->map(function ($loan) use ($dateColumns, &$groupDateTotals, &$groupTotals, $today) {
                $daily = [];
                foreach ($dateColumns as $date) {
                    $daily[$date] = [
                        'paid' => 0.0,
                        'correction' => 0.0,
                    ];
                }

                foreach ($loan->collections as $collection) {
                    $dateKey = Carbon::parse($collection->collection_date)->toDateString();
                    if (!isset($daily[$dateKey])) {
                        continue;
                    }

                    $paid = (float) ($collection->collected_amount ?? 0);
                    $correction = (float) ($collection->correction_amount ?? 0);

                    $daily[$dateKey]['paid'] += $paid;
                    $daily[$dateKey]['correction'] += $correction;
                    $groupDateTotals[$dateKey]['paid'] += $paid;
                    $groupDateTotals[$dateKey]['correction'] += $correction;
                }

                $periodPaid = array_sum(array_column($daily, 'paid'));
                $periodCorrection = array_sum(array_column($daily, 'correction'));

                $calculatedBalance = max(
                    (float) ($loan->refundable_amount ?? 0) - (float) ($loan->total_collected_amount ?? 0),
                    0
                );
                $balance = $loan->loan_balance !== null
                    ? (float) $loan->loan_balance
                    : $calculatedBalance;

                $isOverdue = false;
                if ($loan->due_date) {
                    $isOverdue = Carbon::parse($loan->due_date)->lt($today) && $balance > 0;
                }

                $groupTotals['installment'] += (float) ($loan->installment_amount ?? 0);
                $groupTotals['balance'] += $balance;
                $groupTotals['period_paid'] += $periodPaid;
                $groupTotals['period_correction'] += $periodCorrection;
                $groupTotals['loan_count']++;

                return [
                    'loan_id' => $loan->id,
                    'customer_no' => $loan->customer_no,
                    'customer_name' => $loan->customer_name,
                    'contact_no' => $loan->contact_no,
                    'installment_amount' => (float) ($loan->installment_amount ?? 0),
                    'due_date' => $loan->due_date ? Carbon::parse($loan->due_date)->toDateString() : null,
                    'balance' => $balance,
                    'daily' => $daily,
                    'period_paid' => $periodPaid,
                    'period_correction' => $periodCorrection,
                    'is_overdue' => $isOverdue,
                ];
            })->values();

            return [
                'id' => $group->id,
                'title' => $group->code ?: $group->name,
                'name' => $group->name,
                'center_name' => optional($group->center)->name,
                'rows' => $rows,
                'date_totals' => $groupDateTotals,
                'totals' => $groupTotals,
            ];
        })->values();

        return view('reports.loan-repayment', [
            'fromDate' => $fromDate->toDateString(),
            'toDate' => $toDate->toDateString(),
            'dateColumns' => $dateColumns,
            'reportGroups' => $reportGroups,
        ]);
    }

    private function resolveDateRange(Request $request): array
    {
        $fromInput = $request->query('from');
        $toInput = $request->query('to');

        if (!$fromInput && !$toInput) {
            $to = Carbon::today();
            $from = $to->copy()->subDays(4);
            return [$from, $to];
        }

        $from = $fromInput ? Carbon::parse($fromInput) : Carbon::parse($toInput)->subDays(4);
        $to = $toInput ? Carbon::parse($toInput) : Carbon::parse($fromInput)->addDays(4);

        if ($from->gt($to)) {
            [$from, $to] = [$to, $from];
        }

        return [$from->startOfDay(), $to->startOfDay()];
    }
}
