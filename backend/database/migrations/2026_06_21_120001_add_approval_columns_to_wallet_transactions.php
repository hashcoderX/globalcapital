<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('employee_wallet_bank_deposits', function (Blueprint $table) {
            if (!Schema::hasColumn('employee_wallet_bank_deposits', 'status')) {
                $table->string('status', 20)->default('pending')->after('note');
                $table->unsignedBigInteger('approved_by')->nullable()->after('status');
                $table->timestamp('approved_at')->nullable()->after('approved_by');
                $table->string('approval_note', 500)->nullable()->after('approved_at');

                $table->foreign('approved_by')->references('id')->on('users')->nullOnDelete();
                $table->index(['status', 'branch_id'], 'ewbd_status_branch_idx');
            }
        });

        Schema::table('employee_wallet_cash_handovers', function (Blueprint $table) {
            if (!Schema::hasColumn('employee_wallet_cash_handovers', 'status')) {
                $table->string('status', 20)->default('pending')->after('received_by');
                $table->unsignedBigInteger('approved_by')->nullable()->after('status');
                $table->timestamp('approved_at')->nullable()->after('approved_by');
                $table->string('approval_note', 500)->nullable()->after('approved_at');

                $table->foreign('approved_by')->references('id')->on('users')->nullOnDelete();
                $table->index(['status', 'branch_id'], 'ewch_status_branch_idx');
            }
        });
    }

    public function down(): void
    {
        Schema::table('employee_wallet_bank_deposits', function (Blueprint $table) {
            if (Schema::hasColumn('employee_wallet_bank_deposits', 'status')) {
                $table->dropIndex('ewbd_status_branch_idx');
                $table->dropForeign(['approved_by']);
                $table->dropColumn(['status', 'approved_by', 'approved_at', 'approval_note']);
            }
        });

        Schema::table('employee_wallet_cash_handovers', function (Blueprint $table) {
            if (Schema::hasColumn('employee_wallet_cash_handovers', 'status')) {
                $table->dropIndex('ewch_status_branch_idx');
                $table->dropForeign(['approved_by']);
                $table->dropColumn(['status', 'approved_by', 'approved_at', 'approval_note']);
            }
        });
    }
};
