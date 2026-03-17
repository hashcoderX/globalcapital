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
        Schema::table('mortgage_valuations', function (Blueprint $table) {
            $table->decimal('market_value', 15, 2)->nullable()->change();
            $table->decimal('forced_sale_value', 15, 2)->nullable()->change();
            $table->date('valuation_date')->nullable()->change();
            $table->string('valuer_name')->nullable()->change();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('mortgage_valuations', function (Blueprint $table) {
            $table->decimal('market_value', 15, 2)->nullable(false)->change();
            $table->decimal('forced_sale_value', 15, 2)->nullable(false)->change();
            $table->date('valuation_date')->nullable(false)->change();
            $table->string('valuer_name')->nullable(false)->change();
        });
    }
};
