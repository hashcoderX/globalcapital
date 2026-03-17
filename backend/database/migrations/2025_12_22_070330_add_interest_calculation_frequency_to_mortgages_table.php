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
            $table->enum('interest_calculation_frequency', ['daily', 'weekly', 'monthly', 'yearly'])->default('monthly')->after('installment_frequency');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('mortgages', function (Blueprint $table) {
            $table->dropColumn('interest_calculation_frequency');
        });
    }
};
