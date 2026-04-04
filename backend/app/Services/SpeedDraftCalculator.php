<?php

namespace App\Services;

class SpeedDraftCalculator
{
    /**
    * Interest-first payment allocation with arrears support.
     *
     * @return array{
     *   interest: float,
     *   interest_paid: float,
     *   principal_paid: float,
     *   new_capital: float,
     *   new_arrears: float
     * }
     */
    public function calculateMonthlyPayment(float $capital, float $interestRate, float $payment, float $arrears = 0.0): array
    {
        $capital = max(0.0, round($capital, 2));
        $interestRate = max(0.0, $interestRate);
        $payment = max(0.0, round($payment, 2));
        $arrears = max(0.0, round($arrears, 2));

        // Period interest is charged on capital; prior arrears are added separately.
        $interest = round($capital * ($interestRate / 100), 2);

        $totalInterestDue = round($arrears + $interest, 2);
        $interestPaid = min($payment, $totalInterestDue);
        $remainingAfterInterest = round($payment - $interestPaid, 2);

        $principalPaid = 0.0;
        $newCapital = $capital;
        $newArrears = 0.0;

        if ($payment > $totalInterestDue) {
            $principalPaid = min($remainingAfterInterest, $capital);
            $newCapital = round($capital - $principalPaid, 2);
            $newArrears = 0.0;
        } elseif ($payment < $totalInterestDue) {
            $newArrears = round($totalInterestDue - $payment, 2);
        }

        if ($newCapital < 0) {
            $newCapital = 0.0;
        }

        return [
            'interest' => $interest,
            'interest_paid' => round($interestPaid, 2),
            'principal_paid' => round($principalPaid, 2),
            'new_capital' => round($newCapital, 2),
            'new_arrears' => round($newArrears, 2),
        ];
    }

    /**
     * Speed draft monthly rule:
     * 1) Payment == interest: capital unchanged.
     * 2) Payment > interest: extra amount reduces capital.
     * 3) Payment < interest: shortfall is capitalized into asset value.
     *
     * @return array{
     *   interest: float,
     *   interest_paid: float,
     *   principal_paid: float,
     *   new_capital: float,
     *   new_arrears: float
     * }
     */
    public function calculateSpeedDraftMonthlyPayment(float $capital, float $interestRate, float $payment): array
    {
        $capital = max(0.0, round($capital, 2));
        $interestRate = max(0.0, $interestRate);
        $payment = max(0.0, round($payment, 2));

        $interest = round($capital * ($interestRate / 100), 2);
        $interestPaid = min($payment, $interest);

        $principalPaid = 0.0;
        $newCapital = $capital;

        if ($payment > $interest) {
            $principalPaid = min(round($payment - $interest, 2), $capital);
            $newCapital = round($capital - $principalPaid, 2);
        } elseif ($payment < $interest) {
            $shortfall = round($interest - $payment, 2);
            $newCapital = round($capital + $shortfall, 2);
        }

        if ($newCapital < 0) {
            $newCapital = 0.0;
        }

        return [
            'interest' => $interest,
            'interest_paid' => round($interestPaid, 2),
            'principal_paid' => round($principalPaid, 2),
            'new_capital' => round($newCapital, 2),
            'new_arrears' => 0.0,
        ];
    }

    /**
     * Speed draft monthly rule with period payment history.
     *
     * @return array{
     *   interest: float,
     *   interest_paid: float,
     *   principal_paid: float,
     *   new_capital: float,
     *   new_arrears: float
     * }
     */
    public function calculateSpeedDraftMonthlyPaymentWithHistory(
        float $capital,
        float $interestRate,
        float $payment,
        float $alreadyPaidInterestInPeriod = 0.0,
    ): array {
        $capital = max(0.0, round($capital, 2));
        $interestRate = max(0.0, $interestRate);
        $payment = max(0.0, round($payment, 2));
        $alreadyPaidInterestInPeriod = max(0.0, round($alreadyPaidInterestInPeriod, 2));

        $periodInterest = round($capital * ($interestRate / 100), 2);
        $remainingInterestDue = round(max($periodInterest - $alreadyPaidInterestInPeriod, 0.0), 2);

        $interestPaid = min($payment, $remainingInterestDue);
        $principalPaid = 0.0;
        $newCapital = $capital;

        if ($payment > $remainingInterestDue) {
            $principalPaid = min(round($payment - $remainingInterestDue, 2), $capital);
            $newCapital = round($capital - $principalPaid, 2);
        } elseif ($payment < $remainingInterestDue) {
            $shortfall = round($remainingInterestDue - $payment, 2);
            $newCapital = round($capital + $shortfall, 2);
        }

        if ($newCapital < 0) {
            $newCapital = 0.0;
        }

        return [
            'interest' => $remainingInterestDue,
            'interest_paid' => round($interestPaid, 2),
            'principal_paid' => round($principalPaid, 2),
            'new_capital' => round($newCapital, 2),
            'new_arrears' => 0.0,
        ];
    }
}
