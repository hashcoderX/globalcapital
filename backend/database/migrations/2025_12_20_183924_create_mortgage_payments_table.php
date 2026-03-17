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
        if (!Schema::hasTable('mortgage_payments')) {
            Schema::create('mortgage_payments', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('mortgage_id');
                $table->unsignedBigInteger('schedule_id')->nullable();
                $table->date('paid_date');
                $table->decimal('amount', 15, 2);
                $table->enum('payment_method', ['cash', 'bank', 'transfer', 'cheque', 'card']);
                $table->text('remarks')->nullable();
                $table->unsignedBigInteger('collected_by');
                $table->timestamps();

                $table->foreign('mortgage_id')->references('id')->on('mortgages')->onDelete('cascade');
                $table->foreign('schedule_id')->references('id')->on('mortgage_schedules')->onDelete('set null');
                $table->foreign('collected_by')->references('id')->on('users');

                $table->index(['mortgage_id']);
                $table->index(['paid_date']);
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('mortgage_payments');
    }
};
