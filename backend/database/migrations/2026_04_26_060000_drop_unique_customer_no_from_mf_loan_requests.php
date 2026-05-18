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
            try {
                $table->dropUnique('mf_loan_requests_customer_no_unique');
            } catch (\Throwable $e) {
                // Fallback for environments where the index name differs.
                try {
                    $table->dropUnique(['customer_no']);
                } catch (\Throwable $ignored) {
                    // Ignore if already removed.
                }
            }

            try {
                $table->index('customer_no', 'mf_loan_requests_customer_no_index');
            } catch (\Throwable $ignored) {
                // Ignore if index already exists.
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('mf_loan_requests', function (Blueprint $table) {
            try {
                $table->dropIndex('mf_loan_requests_customer_no_index');
            } catch (\Throwable $ignored) {
                // Ignore if index is missing.
            }

            try {
                $table->unique('customer_no', 'mf_loan_requests_customer_no_unique');
            } catch (\Throwable $ignored) {
                // Ignore if unique index already exists or data contains duplicates.
            }
        });
    }
};
