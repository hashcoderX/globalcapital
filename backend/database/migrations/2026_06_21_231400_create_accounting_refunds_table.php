<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('accounting_refunds', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained('companies')->cascadeOnDelete();
            $table->date('refund_date');
            $table->string('title', 190);
            $table->decimal('amount', 18, 2);
            $table->enum('payment_method', ['cash', 'bank'])->default('cash');
            $table->string('reference_no', 80)->nullable();
            $table->text('notes')->nullable();
            $table->unsignedBigInteger('created_by')->nullable();
            $table->timestamps();

            $table->index(['company_id', 'refund_date']);
            $table->index(['company_id', 'payment_method']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('accounting_refunds');
    }
};
