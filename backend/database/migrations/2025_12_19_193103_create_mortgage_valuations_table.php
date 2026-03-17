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
        Schema::create('mortgage_valuations', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('mortgage_id');
            $table->decimal('market_value', 15, 2);
            $table->decimal('forced_sale_value', 15, 2);
            $table->date('valuation_date');
            $table->string('valuer_name');
            $table->text('remarks')->nullable();
            $table->timestamps();

            $table->foreign('mortgage_id')->references('id')->on('mortgages')->onDelete('cascade');

            $table->index(['mortgage_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('mortgage_valuations');
    }
};
