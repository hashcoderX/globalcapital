<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('mortgage_payments', function (Blueprint $table) {
            if (!Schema::hasColumn('mortgage_payments', 'branch_id')) {
                $table->unsignedBigInteger('branch_id')->nullable()->after('mortgage_id');
            }
            if (!Schema::hasColumn('mortgage_payments', 'user_id')) {
                $table->unsignedBigInteger('user_id')->nullable()->after('branch_id');
            }
            if (!Schema::hasColumn('mortgage_payments', 'interest_amount')) {
                $table->decimal('interest_amount', 15, 2)->default(0)->after('amount');
            }
            if (!Schema::hasColumn('mortgage_payments', 'principal_amount')) {
                $table->decimal('principal_amount', 15, 2)->default(0)->after('interest_amount');
            }
            if (!Schema::hasColumn('mortgage_payments', 'profit_amount')) {
                $table->decimal('profit_amount', 15, 2)->default(0)->after('principal_amount');
            }
            if (!Schema::hasColumn('mortgage_payments', 'outstanding_principal_after')) {
                $table->decimal('outstanding_principal_after', 15, 2)->default(0)->after('profit_amount');
            }
        });
    }

    public function down(): void
    {
        Schema::table('mortgage_payments', function (Blueprint $table) {
            $dropColumns = [];
            foreach (['branch_id', 'user_id', 'interest_amount', 'principal_amount', 'profit_amount', 'outstanding_principal_after'] as $col) {
                if (Schema::hasColumn('mortgage_payments', $col)) {
                    $dropColumns[] = $col;
                }
            }

            if (!empty($dropColumns)) {
                $table->dropColumn($dropColumns);
            }
        });
    }
};
