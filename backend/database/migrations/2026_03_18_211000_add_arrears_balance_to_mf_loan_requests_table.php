<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('mf_loan_requests', function (Blueprint $table) {
            $table->decimal('arrears_balance', 14, 2)->default(0)->after('loan_end_date');
        });
    }

    public function down(): void
    {
        Schema::table('mf_loan_requests', function (Blueprint $table) {
            $table->dropColumn('arrears_balance');
        });
    }
};
