<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('mf_loan_requests', function (Blueprint $table) {
            $table->string('charges_collection_status', 20)
                ->default('pending')
                ->after('charge_payment_mode');
            $table->timestamp('charges_wallet_credited_at')
                ->nullable()
                ->after('net_disbursed_amount');
        });
    }

    public function down(): void
    {
        Schema::table('mf_loan_requests', function (Blueprint $table) {
            $table->dropColumn(['charges_collection_status', 'charges_wallet_credited_at']);
        });
    }
};
