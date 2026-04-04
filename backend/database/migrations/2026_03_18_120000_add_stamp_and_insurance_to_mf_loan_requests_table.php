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
            $table->decimal('stamp_charges', 15, 2)->default(0)->after('document_charges');
            $table->decimal('insurance_charges', 15, 2)->default(0)->after('stamp_charges');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('mf_loan_requests', function (Blueprint $table) {
            $table->dropColumn(['stamp_charges', 'insurance_charges']);
        });
    }
};
