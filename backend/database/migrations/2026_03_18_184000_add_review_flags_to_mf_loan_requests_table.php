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
            $table->boolean('documents_requested')->default(false)->after('penalty_starts_on');
            $table->text('document_request_note')->nullable()->after('documents_requested');
            $table->timestamp('document_requested_at')->nullable()->after('document_request_note');
            $table->text('rejection_reason')->nullable()->after('document_requested_at');
            $table->timestamp('rejected_at')->nullable()->after('rejection_reason');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('mf_loan_requests', function (Blueprint $table) {
            $table->dropColumn([
                'documents_requested',
                'document_request_note',
                'document_requested_at',
                'rejection_reason',
                'rejected_at',
            ]);
        });
    }
};
