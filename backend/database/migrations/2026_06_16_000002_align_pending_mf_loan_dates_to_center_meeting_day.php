<?php

use Carbon\CarbonImmutable;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        $dayMap = [
            'sunday' => 0,
            'monday' => 1,
            'tuesday' => 2,
            'wednesday' => 3,
            'thursday' => 4,
            'friday' => 5,
            'saturday' => 6,
        ];

        $alignToUpcomingMeetingDay = static function (CarbonImmutable $date, ?string $meetingDay) use ($dayMap): CarbonImmutable {
            $normalized = strtolower(trim((string) $meetingDay));
            if ($normalized === '' || !array_key_exists($normalized, $dayMap)) {
                return $date;
            }

            $targetDow = $dayMap[$normalized];
            $currentDow = (int) $date->format('w');
            $delta = ($targetDow - $currentDow + 7) % 7;
            if ($delta === 0) {
                $delta = 7;
            }

            return $date->addDays($delta);
        };

        $rows = DB::table('mf_loan_requests as loans')
            ->join('mf_centers as centers', 'centers.id', '=', 'loans.mf_center_id')
            ->where('loans.loan_scope', 'center_loan')
            ->whereIn('loans.status', ['approved', 'released'])
            ->select([
                'loans.id',
                'centers.meeting_day',
            ])
            ->get();

        $now = now();
        $today = CarbonImmutable::today();

        foreach ($rows as $row) {
            $alignedDate = $alignToUpcomingMeetingDay($today, (string) $row->meeting_day)->format('Y-m-d');

            DB::table('mf_loan_requests')
                ->where('id', (int) $row->id)
                ->update([
                    'next_payment_date' => $alignedDate,
                    'due_date' => $alignedDate,
                    'updated_at' => $now,
                ]);
        }
    }

    public function down(): void
    {
        // Data correction migration only; no reliable rollback.
    }
};

