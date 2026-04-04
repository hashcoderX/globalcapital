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
        Schema::table('finances', function (Blueprint $table) {
            $table->decimal('total_paid_amount', 15, 2)->default(0)->after('refund_amount');
            $table->decimal('balance_amount', 15, 2)->default(0)->after('total_paid_amount');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('finances', function (Blueprint $table) {
            $table->dropColumn(['total_paid_amount', 'balance_amount']);
        });
    }
};
