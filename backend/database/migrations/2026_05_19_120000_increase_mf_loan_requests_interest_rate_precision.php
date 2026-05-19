<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('mf_loan_requests', function (Blueprint $table) {
            $table->decimal('interest_rate', 10, 7)->change();
        });
    }

    public function down(): void
    {
        Schema::table('mf_loan_requests', function (Blueprint $table) {
            $table->decimal('interest_rate', 6, 2)->change();
        });
    }
};
