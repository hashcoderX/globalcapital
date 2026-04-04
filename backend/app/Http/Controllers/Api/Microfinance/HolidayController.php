<?php

namespace App\Http\Controllers\Api\Microfinance;

use App\Http\Controllers\Controller;
use App\Models\MicrofinanceHoliday;
use App\Models\MicrofinanceLoanRequest;
use Carbon\Carbon;
use Illuminate\Http\Request;

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
        $holiday->delete();

        return response()->json(['message' => 'Holiday deleted successfully']);
    }

    private function forwardCollectionDatesForHoliday(string $holidayDate): int
    {
        $affectedLoans = MicrofinanceLoanRequest::query()
            ->whereDate('due_date', $holidayDate)
            ->orWhereDate('next_payment_date', $holidayDate)
            ->get();

        if ($affectedLoans->isEmpty()) {
            return 0;
        }

        $activeHolidayDates = MicrofinanceHoliday::query()
            ->where('is_active', true)
            ->pluck('holiday_date')
            ->map(static fn ($date) => Carbon::parse((string) $date)->toDateString())
            ->all();

        $holidayLookup = array_flip($activeHolidayDates);
        $shiftedCount = 0;

        foreach ($affectedLoans as $loan) {
            /** @var MicrofinanceLoanRequest $loan */
            $didShift = false;

            if (!empty($loan->due_date) && Carbon::parse((string) $loan->due_date)->toDateString() === $holidayDate) {
                $newDueDate = $this->nextWorkingDate($holidayDate, $holidayLookup);
                $loan->due_date = $newDueDate;
                $didShift = true;
            }

            if (!empty($loan->next_payment_date) && Carbon::parse((string) $loan->next_payment_date)->toDateString() === $holidayDate) {
                $newNextDate = $this->nextWorkingDate($holidayDate, $holidayLookup);
                $loan->next_payment_date = $newNextDate;
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
    private function nextWorkingDate(string $date, array $holidayLookup): string
    {
        $cursor = Carbon::parse($date)->addDay();

        while (isset($holidayLookup[$cursor->toDateString()])) {
            $cursor->addDay();
        }

        return $cursor->toDateString();
    }
}
