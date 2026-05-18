<?php

namespace App\Http\Controllers\Api\Microfinance;

use App\Http\Controllers\Controller;
use App\Models\Finance;
use App\Models\MicrofinanceHoliday;
use App\Models\MicrofinanceLoanRequest;
use App\Models\Mortgage;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class HolidayController extends Controller
{
    public function index()
    {
        return response()->json(MicrofinanceHoliday::query()->orderByDesc('holiday_date')->get());
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'holiday_date' => 'required|date|unique:mf_holidays,holiday_date',
            'name' => 'required|string|max:120',
            'note' => 'nullable|string|max:500',
            'is_active' => 'nullable|boolean',
        ]);

        $holiday = MicrofinanceHoliday::create([
            'holiday_date' => $validated['holiday_date'],
            'name' => $validated['name'],
            'note' => $validated['note'] ?? null,
            'is_active' => $validated['is_active'] ?? true,
            'created_by' => optional($request->user())->id,
        ]);

        $shiftedCount = 0;
        if ((bool) $holiday->is_active) {
            $shiftedCount = $this->forwardCollectionDatesForHoliday(
                Carbon::parse((string) $holiday->holiday_date)->toDateString()
            );
        }

        return response()->json([
            'message' => "Holiday marked successfully. Forwarded {$shiftedCount} collection date(s).",
            'data' => $holiday,
            'shifted_count' => $shiftedCount,
        ], 201);
    }

    public function show(MicrofinanceHoliday $holiday)
    {
        return response()->json($holiday);
    }

    public function update(Request $request, MicrofinanceHoliday $holiday)
    {
        $validated = $request->validate([
            'holiday_date' => 'required|date|unique:mf_holidays,holiday_date,' . $holiday->id,
            'name' => 'required|string|max:120',
            'note' => 'nullable|string|max:500',
            'is_active' => 'nullable|boolean',
        ]);

        $wasActive = (bool) $holiday->is_active;

        $holiday->update([
            'holiday_date' => $validated['holiday_date'],
            'name' => $validated['name'],
            'note' => $validated['note'] ?? null,
            'is_active' => $validated['is_active'] ?? true,
        ]);

        $shiftedCount = 0;
        if (!$wasActive && (bool) $holiday->is_active) {
            $shiftedCount = $this->forwardCollectionDatesForHoliday(
                Carbon::parse((string) $holiday->holiday_date)->toDateString()
            );
        }

        return response()->json([
            'message' => "Holiday updated successfully. Forwarded {$shiftedCount} collection date(s).",
            'data' => $holiday,
            'shifted_count' => $shiftedCount,
        ]);
    }

    public function destroy(MicrofinanceHoliday $holiday)
    {
        $holidayDate = Carbon::parse((string) $holiday->holiday_date)->toDateString();

        $recoveredCount = DB::transaction(function () use ($holiday, $holidayDate) {
            $activeHolidayDatesWithCurrent = MicrofinanceHoliday::query()
                ->where('is_active', true)
                ->pluck('holiday_date')
                ->map(static fn ($date) => Carbon::parse((string) $date)->toDateString())
                ->all();

            $holidayLookupWithCurrent = array_flip($activeHolidayDatesWithCurrent);
            $shiftedDate = $this->nextWorkingDate($holidayDate, $holidayLookupWithCurrent);

            // Delete first so date-recovery is calculated without this holiday in active list.
            $holiday->delete();

            $activeHolidayDatesWithoutCurrent = MicrofinanceHoliday::query()
                ->where('is_active', true)
                ->pluck('holiday_date')
                ->map(static fn ($date) => Carbon::parse((string) $date)->toDateString())
                ->all();

            $holidayLookupWithoutCurrent = array_flip($activeHolidayDatesWithoutCurrent);
            $recoveredDate = $this->firstWorkingDateOnOrAfter($holidayDate, $holidayLookupWithoutCurrent);

            if ($recoveredDate === $shiftedDate) {
                return 0;
            }

            $recoveredCount = 0;
            $recoveredCount += $this->recoverMicrofinanceDatesFromShiftedDate($shiftedDate, $recoveredDate);
            $recoveredCount += $this->recoverFinanceDatesFromShiftedDate($shiftedDate, $recoveredDate);
            $recoveredCount += $this->recoverMortgageDatesFromShiftedDate($shiftedDate, $recoveredDate);

            return $recoveredCount;
        });

        return response()->json([
            'message' => "Holiday deleted successfully. Recovered {$recoveredCount} loan date(s) across Microfinance, Finance, and Mortgage.",
            'recovered_count' => $recoveredCount,
        ]);
    }

    private function forwardCollectionDatesForHoliday(string $holidayDate): int
    {
        $activeHolidayDates = MicrofinanceHoliday::query()
            ->where('is_active', true)
            ->pluck('holiday_date')
            ->map(static fn ($date) => Carbon::parse((string) $date)->toDateString())
            ->all();

        $holidayLookup = array_flip($activeHolidayDates);
        $shiftedCount = 0;

        $shiftedCount += $this->forwardMicrofinanceDatesForHoliday($holidayDate, $holidayLookup);
        $shiftedCount += $this->forwardFinanceDatesForHoliday($holidayDate, $holidayLookup);
        $shiftedCount += $this->forwardMortgageDatesForHoliday($holidayDate, $holidayLookup);

        return $shiftedCount;
    }

    /**
     * @param array<string, int> $holidayLookup
     */
    private function forwardMicrofinanceDatesForHoliday(string $holidayDate, array $holidayLookup): int
    {
        $affectedLoans = MicrofinanceLoanRequest::query()
            ->whereNotIn('status', ['closed', 'rejected'])
            ->where(function ($query) use ($holidayDate) {
                $query->whereDate('due_date', $holidayDate)
                    ->orWhereDate('next_payment_date', $holidayDate);
            })
            ->get();

        if ($affectedLoans->isEmpty()) {
            return 0;
        }

        $shiftedCount = 0;

        foreach ($affectedLoans as $loan) {
            /** @var MicrofinanceLoanRequest $loan */
            $didShift = false;

            if (!empty($loan->due_date) && Carbon::parse((string) $loan->due_date)->toDateString() === $holidayDate) {
                $newDueDate = $this->nextWorkingDate($holidayDate, $holidayLookup);
                $loan->setAttribute('due_date', $newDueDate);
                $didShift = true;
            }

            if (!empty($loan->next_payment_date) && Carbon::parse((string) $loan->next_payment_date)->toDateString() === $holidayDate) {
                $newNextDate = $this->nextWorkingDate($holidayDate, $holidayLookup);
                $loan->setAttribute('next_payment_date', $newNextDate);
                $didShift = true;
            }

            if ($didShift) {
                if (!empty($loan->due_date)) {
                    $graceDays = max((int) ($loan->penalty_grace_days ?? 2), 0);
                    $penaltyStartsOn = Carbon::parse((string) $loan->due_date)
                        ->addDays($graceDays + 1)
                        ->toDateString();
                    $loan->penalty_starts_on = $penaltyStartsOn;
                }

                $loan->save();
                $shiftedCount++;
            }
        }

        return $shiftedCount;
    }

    /**
     * @param array<string, int> $holidayLookup
     */
    private function forwardFinanceDatesForHoliday(string $holidayDate, array $holidayLookup): int
    {
        $affectedLoans = Finance::query()
            ->whereNotIn('status', ['closed', 'rejected', 'settled'])
            ->where(function ($query) use ($holidayDate) {
                $query->whereDate('due_date', $holidayDate)
                    ->orWhereDate('next_collection_date', $holidayDate);
            })
            ->get();

        if ($affectedLoans->isEmpty()) {
            return 0;
        }

        $shiftedCount = 0;
        foreach ($affectedLoans as $loan) {
            /** @var Finance $loan */
            $didShift = false;

            if (!empty($loan->due_date) && Carbon::parse((string) $loan->due_date)->toDateString() === $holidayDate) {
                $loan->setAttribute('due_date', $this->nextWorkingDate($holidayDate, $holidayLookup));
                $didShift = true;
            }

            if (!empty($loan->next_collection_date) && Carbon::parse((string) $loan->next_collection_date)->toDateString() === $holidayDate) {
                $loan->setAttribute('next_collection_date', $this->nextWorkingDate($holidayDate, $holidayLookup));
                $didShift = true;
            }

            if ($didShift) {
                $loan->save();
                $shiftedCount++;
            }
        }

        return $shiftedCount;
    }

    /**
     * @param array<string, int> $holidayLookup
     */
    private function forwardMortgageDatesForHoliday(string $holidayDate, array $holidayLookup): int
    {
        $affectedLoans = Mortgage::query()
            ->whereNotIn('status', ['closed', 'rejected', 'settled'])
            ->whereDate('due_date', $holidayDate)
            ->get();

        if ($affectedLoans->isEmpty()) {
            return 0;
        }

        $shiftedCount = 0;
        foreach ($affectedLoans as $loan) {
            /** @var Mortgage $loan */
            if (!empty($loan->due_date) && Carbon::parse((string) $loan->due_date)->toDateString() === $holidayDate) {
                $loan->setAttribute('due_date', $this->nextWorkingDate($holidayDate, $holidayLookup));
                $loan->save();
                $shiftedCount++;
            }
        }

        return $shiftedCount;
    }

    private function recoverMicrofinanceDatesFromShiftedDate(string $shiftedDate, string $recoveredDate): int
    {
        $affectedLoans = MicrofinanceLoanRequest::query()
            ->whereNotIn('status', ['closed', 'rejected'])
            ->where(function ($query) use ($shiftedDate) {
                $query->whereDate('due_date', $shiftedDate)
                    ->orWhereDate('next_payment_date', $shiftedDate);
            })
            ->get();

        if ($affectedLoans->isEmpty()) {
            return 0;
        }

        $recoveredCount = 0;
        foreach ($affectedLoans as $loan) {
            /** @var MicrofinanceLoanRequest $loan */
            $didRecover = false;

            if (!empty($loan->due_date) && Carbon::parse((string) $loan->due_date)->toDateString() === $shiftedDate) {
                $loan->setAttribute('due_date', $recoveredDate);
                $didRecover = true;
            }

            if (!empty($loan->next_payment_date) && Carbon::parse((string) $loan->next_payment_date)->toDateString() === $shiftedDate) {
                $loan->setAttribute('next_payment_date', $recoveredDate);
                $didRecover = true;
            }

            if ($didRecover) {
                if (!empty($loan->due_date)) {
                    $graceDays = max((int) ($loan->penalty_grace_days ?? 2), 0);
                    $loan->penalty_starts_on = Carbon::parse((string) $loan->due_date)
                        ->addDays($graceDays + 1)
                        ->toDateString();
                }

                $loan->save();
                $recoveredCount++;
            }
        }

        return $recoveredCount;
    }

    private function recoverFinanceDatesFromShiftedDate(string $shiftedDate, string $recoveredDate): int
    {
        $affectedLoans = Finance::query()
            ->whereNotIn('status', ['closed', 'rejected', 'settled'])
            ->where(function ($query) use ($shiftedDate) {
                $query->whereDate('due_date', $shiftedDate)
                    ->orWhereDate('next_collection_date', $shiftedDate);
            })
            ->get();

        if ($affectedLoans->isEmpty()) {
            return 0;
        }

        $recoveredCount = 0;
        foreach ($affectedLoans as $loan) {
            /** @var Finance $loan */
            $didRecover = false;

            if (!empty($loan->due_date) && Carbon::parse((string) $loan->due_date)->toDateString() === $shiftedDate) {
                $loan->setAttribute('due_date', $recoveredDate);
                $didRecover = true;
            }

            if (!empty($loan->next_collection_date) && Carbon::parse((string) $loan->next_collection_date)->toDateString() === $shiftedDate) {
                $loan->setAttribute('next_collection_date', $recoveredDate);
                $didRecover = true;
            }

            if ($didRecover) {
                $loan->save();
                $recoveredCount++;
            }
        }

        return $recoveredCount;
    }

    private function recoverMortgageDatesFromShiftedDate(string $shiftedDate, string $recoveredDate): int
    {
        $affectedLoans = Mortgage::query()
            ->whereNotIn('status', ['closed', 'rejected', 'settled'])
            ->whereDate('due_date', $shiftedDate)
            ->get();

        if ($affectedLoans->isEmpty()) {
            return 0;
        }

        $recoveredCount = 0;
        foreach ($affectedLoans as $loan) {
            /** @var Mortgage $loan */
            if (!empty($loan->due_date) && Carbon::parse((string) $loan->due_date)->toDateString() === $shiftedDate) {
                $loan->setAttribute('due_date', $recoveredDate);
                $loan->save();
                $recoveredCount++;
            }
        }

        return $recoveredCount;
    }

    /**
     * @param array<string, int> $holidayLookup
     */
    private function nextWorkingDate(string $date, array $holidayLookup): string
    {
        $cursor = Carbon::parse($date)->addDay();

        while (isset($holidayLookup[$cursor->toDateString()])) {
            $cursor->addDay();
        }

        return $cursor->toDateString();
    }

    /**
     * @param array<string, int> $holidayLookup
     */
    private function firstWorkingDateOnOrAfter(string $date, array $holidayLookup): string
    {
        $cursor = Carbon::parse($date);

        while (isset($holidayLookup[$cursor->toDateString()])) {
            $cursor->addDay();
        }

        return $cursor->toDateString();
    }
}
