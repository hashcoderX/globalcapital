<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('mf_loan_requests', function (Blueprint $table) {
            if (!Schema::hasColumn('mf_loan_requests', 'loan_balance')) {
                $table->decimal('loan_balance', 15, 2)->nullable()->after('installment_amount');
            }
        });

        Schema::table('mf_loan_collections', function (Blueprint $table) {
            if (!Schema::hasColumn('mf_loan_collections', 'correction_amount')) {
                $table->decimal('correction_amount', 14, 2)->default(0)->after('collected_amount');
            }
        });
    }

    public function down(): void
    {
        Schema::table('mf_loan_collections', function (Blueprint $table) {
            if (Schema::hasColumn('mf_loan_collections', 'correction_amount')) {
                $table->dropColumn('correction_amount');
            }
        });

        Schema::table('mf_loan_requests', function (Blueprint $table) {
            if (Schema::hasColumn('mf_loan_requests', 'loan_balance')) {
                $table->dropColumn('loan_balance');
            }
        });
    }
};
