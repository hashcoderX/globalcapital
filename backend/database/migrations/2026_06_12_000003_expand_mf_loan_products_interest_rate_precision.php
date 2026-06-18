<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::statement('ALTER TABLE mf_loan_products MODIFY interest_rate DECIMAL(12,7) NOT NULL DEFAULT 0');
    }

    public function down(): void
    {
        DB::statement('ALTER TABLE mf_loan_products MODIFY interest_rate DECIMAL(8,4) NOT NULL DEFAULT 0');
    }
};
