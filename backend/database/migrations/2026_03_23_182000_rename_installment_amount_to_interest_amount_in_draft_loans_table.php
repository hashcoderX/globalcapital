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
        DB::statement('ALTER TABLE draft_loans CHANGE installment_amount interest_amount DECIMAL(15,2) NOT NULL DEFAULT 0');
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        DB::statement('ALTER TABLE draft_loans CHANGE interest_amount installment_amount DECIMAL(15,2) NOT NULL DEFAULT 0');
    }
};
