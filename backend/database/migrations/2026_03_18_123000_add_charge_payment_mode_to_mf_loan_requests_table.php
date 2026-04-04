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
            $table->string('charge_payment_mode', 30)->default('hand_cash')->after('insurance_charges');
            $table->decimal('net_disbursed_amount', 15, 2)->default(0)->after('charge_payment_mode');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('mf_loan_requests', function (Blueprint $table) {
            $table->dropColumn(['charge_payment_mode', 'net_disbursed_amount']);
        });
    }
};
