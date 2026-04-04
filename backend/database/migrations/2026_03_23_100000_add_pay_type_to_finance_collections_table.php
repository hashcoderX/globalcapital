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
            $table->string('pay_type', 30)->default('cash')->after('payment_amount');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('finance_collections', function (Blueprint $table) {
            $table->dropColumn('pay_type');
        });
    }
};
