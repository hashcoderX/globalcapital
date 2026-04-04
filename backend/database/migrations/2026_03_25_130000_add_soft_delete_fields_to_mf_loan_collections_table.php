<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('mf_loan_collections', function (Blueprint $table) {
            if (!Schema::hasColumn('mf_loan_collections', 'deleted_at')) {
                $table->softDeletes();
            }

            if (!Schema::hasColumn('mf_loan_collections', 'deleted_by')) {
                $table->foreignId('deleted_by')->nullable()->after('created_by')->constrained('users')->nullOnDelete();
            }

            if (!Schema::hasColumn('mf_loan_collections', 'deletion_reason')) {
                $table->string('deletion_reason', 500)->nullable()->after('deleted_by');
            }
        });
    }

    public function down(): void
    {
        Schema::table('mf_loan_collections', function (Blueprint $table) {
            if (Schema::hasColumn('mf_loan_collections', 'deletion_reason')) {
                $table->dropColumn('deletion_reason');
            }

            if (Schema::hasColumn('mf_loan_collections', 'deleted_by')) {
                $table->dropConstrainedForeignId('deleted_by');
            }

            if (Schema::hasColumn('mf_loan_collections', 'deleted_at')) {
                $table->dropSoftDeletes();
            }
        });
    }
};
