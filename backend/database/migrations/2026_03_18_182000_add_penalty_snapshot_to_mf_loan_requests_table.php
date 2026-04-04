<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('mf_loan_requests', function (Blueprint $table) {
            $table->decimal('penalty_rate', 5, 2)->default(0)->after('next_payment_date');
            $table->unsignedInteger('penalty_grace_days')->default(2)->after('penalty_rate');
            $table->date('penalty_starts_on')->nullable()->after('penalty_grace_days');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('mf_loan_requests', function (Blueprint $table) {
            $table->dropColumn(['penalty_rate', 'penalty_grace_days', 'penalty_starts_on']);
        });
    }
};
