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
            if (!Schema::hasColumn('mf_loan_requests', 'bank_name')) {
                $table->string('bank_name', 190)->nullable()->after('contact_no');
            }
            if (!Schema::hasColumn('mf_loan_requests', 'bank_branch')) {
                $table->string('bank_branch', 190)->nullable()->after('bank_name');
            }
            if (!Schema::hasColumn('mf_loan_requests', 'bank_account_no')) {
                $table->string('bank_account_no', 80)->nullable()->after('bank_branch');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('mf_loan_requests', function (Blueprint $table) {
            if (Schema::hasColumn('mf_loan_requests', 'bank_account_no')) {
                $table->dropColumn('bank_account_no');
            }
            if (Schema::hasColumn('mf_loan_requests', 'bank_branch')) {
                $table->dropColumn('bank_branch');
            }
            if (Schema::hasColumn('mf_loan_requests', 'bank_name')) {
                $table->dropColumn('bank_name');
            }
        });
    }
};

