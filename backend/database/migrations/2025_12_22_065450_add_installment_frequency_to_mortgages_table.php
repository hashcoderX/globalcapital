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
        Schema::table('mortgages', function (Blueprint $table) {
            $table->enum('installment_frequency', ['daily', 'weekly', 'monthly', 'quarterly', 'yearly'])->default('monthly')->after('tenure_months');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('mortgages', function (Blueprint $table) {
            $table->dropColumn('installment_frequency');
        });
    }
};
