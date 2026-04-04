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
            $table->string('reference_no', 100)->nullable()->after('pay_type');
            $table->string('cheque_no', 100)->nullable()->after('reference_no');
            $table->date('cheque_date')->nullable()->after('cheque_no');
            $table->string('cheque_bank', 120)->nullable()->after('cheque_date');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('finance_collections', function (Blueprint $table) {
            $table->dropColumn(['reference_no', 'cheque_no', 'cheque_date', 'cheque_bank']);
        });
    }
};
