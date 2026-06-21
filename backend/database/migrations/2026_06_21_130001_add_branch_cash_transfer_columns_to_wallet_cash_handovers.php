<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('employee_wallet_cash_handovers', function (Blueprint $table) {
            if (!Schema::hasColumn('employee_wallet_cash_handovers', 'branch_cash_transferred_at')) {
                $table->timestamp('branch_cash_transferred_at')->nullable()->after('approval_note');
            }

            if (!Schema::hasColumn('employee_wallet_cash_handovers', 'branch_cash_transferred_by')) {
                $table->unsignedBigInteger('branch_cash_transferred_by')->nullable()->after('branch_cash_transferred_at');
                $table->foreign('branch_cash_transferred_by', 'ewch_bct_by_fk')->references('id')->on('users')->nullOnDelete();
                $table->index('branch_cash_transferred_by', 'ewch_branch_cash_transferred_by_idx');
            }
        });
    }

    public function down(): void
    {
        Schema::table('employee_wallet_cash_handovers', function (Blueprint $table) {
            if (Schema::hasColumn('employee_wallet_cash_handovers', 'branch_cash_transferred_by')) {
                $table->dropIndex('ewch_branch_cash_transferred_by_idx');
                $table->dropForeign('ewch_bct_by_fk');
                $table->dropColumn('branch_cash_transferred_by');
            }

            if (Schema::hasColumn('employee_wallet_cash_handovers', 'branch_cash_transferred_at')) {
                $table->dropColumn('branch_cash_transferred_at');
            }
        });
    }
};
