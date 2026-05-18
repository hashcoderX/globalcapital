<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Backfill only NULL values; do not overwrite already configured rows.
        DB::table('employees')
            ->whereNull('epf_employee_contribution')
            ->update(['epf_employee_contribution' => 8.00]);

        DB::table('employees')
            ->whereNull('epf_employer_contribution')
            ->update(['epf_employer_contribution' => 12.00]);

        DB::table('employees')
            ->whereNull('etf_employee_contribution')
            ->update(['etf_employee_contribution' => 0.00]);

        DB::table('employees')
            ->whereNull('etf_employer_contribution')
            ->update(['etf_employer_contribution' => 3.00]);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // No safe rollback: cannot distinguish between backfilled values and user-provided values.
    }
};
