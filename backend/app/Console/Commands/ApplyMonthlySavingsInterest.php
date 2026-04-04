<?php

namespace App\Console\Commands;

use App\Models\SavingsAccount;
use App\Models\SavingsAccountTransaction;
use Carbon\Carbon;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class ApplyMonthlySavingsInterest extends Command
{
    protected $signature = 'savings:apply-monthly-interest {--date=} {--force : Run even if date is not month-end}';

    protected $description = 'Apply monthly interest to savings/fixed deposit accounts on month end';

    public function handle(): int
    {
        $asOfDate = $this->option('date')
            ? Carbon::parse((string) $this->option('date'))->endOfDay()
            : Carbon::now()->endOfDay();

        $isMonthEnd = $asOfDate->isSameDay($asOfDate->copy()->endOfMonth());
        if (!$isMonthEnd && !$this->option('force')) {
            $this->info('Skipped: today is not month-end. Use --force to run manually.');
            return self::SUCCESS;
        }

        $periodKey = $asOfDate->format('Ym');
        $transactionDate = $asOfDate->toDateString();

        $eligibleAccounts = SavingsAccount::query()
            ->where('status', 'active')
            ->whereIn('account_type', ['savings', 'fixed_deposit'])
            ->where('interest_rate', '>', 0)
            ->where('balance', '>', 0)
            ->orderBy('id')
            ->get();

        $credited = 0;
        $skipped = 0;

        foreach ($eligibleAccounts as $account) {
            /** @var \App\Models\SavingsAccount $account */
            $alreadyCredited = SavingsAccountTransaction::query()
                ->where('savings_account_id', $account->id)
                ->where('transaction_type', 'interest_credit')
                ->where('reference_no', 'INT-' . $periodKey)
                ->exists();

            if ($alreadyCredited) {
                $skipped++;
                continue;
            }

            $balanceBefore = round((float) $account->balance, 2);
            $monthlyRate = (((float) $account->interest_rate) / 100) / 12;
            $interestAmount = round($balanceBefore * $monthlyRate, 2);

            if ($interestAmount <= 0) {
                $skipped++;
                continue;
            }

            DB::transaction(function () use ($account, $balanceBefore, $interestAmount, $transactionDate, $periodKey) {
                $balanceAfter = round($balanceBefore + $interestAmount, 2);

                SavingsAccountTransaction::create([
                    'savings_account_id' => $account->id,
                    'transaction_type' => 'interest_credit',
                    'amount' => $interestAmount,
                    'balance_before' => $balanceBefore,
                    'balance_after' => $balanceAfter,
                    'transaction_date' => $transactionDate,
                    'reference_no' => 'INT-' . $periodKey,
                    'note' => 'Auto monthly interest credit',
                    'created_by' => null,
                ]);

                $account->balance = $balanceAfter;
                $account->save();
            });

            $credited++;
        }

        $this->info("Monthly interest process completed. Credited: {$credited}, Skipped: {$skipped}");

        return self::SUCCESS;
    }
}
