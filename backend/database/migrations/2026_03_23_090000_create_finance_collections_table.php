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
        Schema::create('finance_collections', function (Blueprint $table) {
            $table->id();
            $table->foreignId('finance_id')->constrained()->cascadeOnDelete();
            $table->date('payment_date');
            $table->decimal('payment_amount', 15, 2);
            $table->decimal('interest_charged', 15, 2)->default(0);
            $table->decimal('interest_paid', 15, 2)->default(0);
            $table->decimal('principal_paid', 15, 2)->default(0);
            $table->decimal('arrears', 15, 2)->default(0);
            $table->decimal('remaining_capital', 15, 2)->default(0);
            $table->json('meta')->nullable();
            $table->unsignedBigInteger('created_by')->nullable();
            $table->timestamps();

            $table->index(['finance_id', 'payment_date']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('finance_collections');
    }
};
