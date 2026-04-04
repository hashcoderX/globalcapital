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
            if (!Schema::hasColumn('finance_collections', 'branch_id')) {
                $table->unsignedBigInteger('branch_id')->nullable()->after('finance_id');
                $table->index('branch_id', 'fin_coll_branch_idx');
            }

            if (!Schema::hasColumn('finance_collections', 'collector_id')) {
                $table->unsignedBigInteger('collector_id')->nullable()->after('branch_id');
                $table->index('collector_id', 'fin_coll_collector_idx');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('finance_collections', function (Blueprint $table) {
            if (Schema::hasColumn('finance_collections', 'collector_id')) {
                $table->dropIndex('fin_coll_collector_idx');
                $table->dropColumn('collector_id');
            }

            if (Schema::hasColumn('finance_collections', 'branch_id')) {
                $table->dropIndex('fin_coll_branch_idx');
                $table->dropColumn('branch_id');
            }
        });
    }
};
