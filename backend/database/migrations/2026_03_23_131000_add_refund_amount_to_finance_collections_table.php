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
        Schema::table('finance_collections', function (Blueprint $table) {
            $table->decimal('refund_amount', 15, 2)->default(0)->after('payment_amount');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('finance_collections', function (Blueprint $table) {
            $table->dropColumn('refund_amount');
        });
    }
};
