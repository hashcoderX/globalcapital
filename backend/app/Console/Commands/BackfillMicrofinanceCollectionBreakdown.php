<?php

namespace App\Console\Commands;

use App\Models\MicrofinanceLoanRequest;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class BackfillMicrofinanceCollectionBreakdown extends Command
{
    /**
     * The name and signature of the console command.
     */
    protected $signature = 'microfinance:backfill-collection-breakdown
                            {--loan_id= : Only process one loan id.}
                            {--branch_id= : Only process one branch id.}
                            {--chunk=200 : Chunk size for loan processing.}
                            {--fix-mismatch : Also fix rows where principal+interest+penalty does not match collected amount.}
                            {--dry-run : Show planned changes without persisting.}';

    /**
     * The console command description.
     */
    protected $description = 'Backfills microfinance collection principal/interest split where amounts were not separated, then updates loan_balance.';

    public function handle(): int
    {
        $loanId = (int) ($this->option('loan_id') ?? 0);
        $branchId = (int) ($this->option('branch_id') ?? 0);
        $chunkSize = max(50, (int) ($this->option('chunk') ?? 200));
        $fixMismatch = (bool) $this->option('fix-mismatch');
        $dryRun = (bool) $this->option('dry-run');

        $query = MicrofinanceLoanRequest::query()
            ->orderBy('id')
            ->whereHas('collections', function ($collectionQuery): void {
                $collectionQuery
                    ->where('collected_amount', '>', 0)
                    ->where(function ($invalidSplitQuery): void {
                        $invalidSplitQuery
                            ->whereNull('capital_amount')
                            ->orWhereNull('interest_amount')
                            ->orWhere(function ($zeroSplitQuery): void {
                                $zeroSplitQuery
                                    ->whereRaw('COALESCE(capital_amount, 0) <= 0')
                                    ->whereRaw('COALESCE(interest_amount, 0) <= 0');
                            });
                    });
            });

        if ($loanId > 0) {
            $query->where('id', $loanId);
        }

        if ($branchId > 0) {
            $query->where('branch_id', $branchId);
        }

        $processedLoans = 0;
        $updatedLoans = 0;
        $scannedRows = 0;
        $updatedRows = 0;
        $updatedLoanBalances = 0;

        $query->chunkById($chunkSize, function ($loans) use (
            $dryRun,
            $fixMismatch,
            &$processedLoans,
            &$updatedLoans,
            &$scannedRows,
            &$updatedRows,
            &$updatedLoanBalances
        ): void {
            foreach ($loans as $loan) {
                $processedLoans++;

                $loanAmount = (float) ($loan->loan_amount ?? 0);
                $termCount = max((int) ($loan->terms_count ?? 1), 1);
                $installmentAmount = (float) ($loan->installment_amount ?? 0);

                if ($loanAmount <= 0 || $installmentAmount <= 0) {
                    continue;
                }

                $principalPerInstallment = $loanAmount / $termCount;
                $interestPerInstallment = max($installmentAmount - $principalPerInstallment, 0);

                $collections = $loan->collections()
                    ->orderBy('collection_date')
                    ->orderBy('id')
                    ->get();

                if ($collections->isEmpty()) {
                    continue;
                }

                $loanChanged = false;
                $totalCapitalCollected = 0.0;

                DB::transaction(function () use (
                    $collections,
                    $loan,
                    $dryRun,
                    $fixMismatch,
                    $interestPerInstallment,
                    $loanAmount,
                    &$scannedRows,
                    &$updatedRows,
                    &$updatedLoanBalances,
                    &$loanChanged,
                    &$totalCapitalCollected
                ): void {
                    foreach ($collections as $collection) {
                        $scannedRows++;

                        $collectedAmount = max((float) ($collection->collected_amount ?? 0), 0);
                        $penaltyAmount = max((float) ($collection->penalty_amount ?? 0), 0);
                        $currentCapital = (float) ($collection->capital_amount ?? 0);
                        $currentInterest = (float) ($collection->interest_amount ?? 0);

                        $outstandingPrincipal = max($loanAmount - $totalCapitalCollected, 0);
                        $remainingAfterPenalty = max($collectedAmount - $penaltyAmount, 0);

                        $newInterest = min($remainingAfterPenalty, $interestPerInstallment);
                        $newCapital = max($remainingAfterPenalty - $newInterest, 0);

                        if ($newCapital > $outstandingPrincipal) {
                            $overflow = $newCapital - $outstandingPrincipal;
                            $newCapital = $outstandingPrincipal;
                            $newInterest += $overflow;
                        }

                        $newCapital = round($newCapital, 2);
                        $newInterest = round($newInterest, 2);

                        $isUnseparated = $collectedAmount > 0
                            && (
                                $collection->capital_amount === null
                                || $collection->interest_amount === null
                                || (abs($currentCapital) < 0.005 && abs($currentInterest) < 0.005)
                            );

                        $hasMismatch = abs(($currentCapital + $currentInterest + $penaltyAmount) - $collectedAmount) > 0.02;
                        $shouldUpdateRow = $isUnseparated || ($fixMismatch && $hasMismatch);

                        if ($shouldUpdateRow) {
                            if (!$dryRun) {
                                $collection->capital_amount = $newCapital;
                                $collection->interest_amount = $newInterest;
                                $collection->save();
                            }

                            $updatedRows++;
                            $loanChanged = true;
                        }

                        $totalCapitalCollected += $newCapital;
                    }

                    $newLoanBalance = round(max($loanAmount - $totalCapitalCollected, 0), 2);
                    $currentLoanBalance = round((float) ($loan->loan_balance ?? 0), 2);

                    if (abs($newLoanBalance - $currentLoanBalance) > 0.01) {
                        if (!$dryRun) {
                            $loan->loan_balance = $newLoanBalance;
                            $loan->save();
                        }

                        $updatedLoanBalances++;
                        $loanChanged = true;
                    }
                });

                if ($loanChanged) {
                    $updatedLoans++;
                }
            }
        });

        $this->info(sprintf(
            'Collection breakdown backfill complete. processed_loans=%d updated_loans=%d scanned_rows=%d updated_rows=%d updated_loan_balances=%d%s',
            $processedLoans,
            $updatedLoans,
            $scannedRows,
            $updatedRows,
            $updatedLoanBalances,
            $dryRun ? ' (dry-run)' : ''
        ));

        return self::SUCCESS;
    }
}
