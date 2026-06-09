<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('mf_loan_collections', function (Blueprint $table) {
            if (!Schema::hasColumn('mf_loan_collections', 'client_reference')) {
                $table->string('client_reference', 64)->nullable()->unique()->after('note');
            }
        });
    }

    public function down(): void
    {
        Schema::table('mf_loan_collections', function (Blueprint $table) {
            if (Schema::hasColumn('mf_loan_collections', 'client_reference')) {
                $table->dropUnique(['client_reference']);
                $table->dropColumn('client_reference');
            }
        });
    }
};
