<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('accounting_expenses', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained('companies')->cascadeOnDelete();
            $table->date('expense_date');
            $table->string('category', 80);
            $table->string('title', 190);
            $table->decimal('amount', 18, 2);
            $table->enum('payment_method', ['cash', 'bank', 'main'])->default('cash');
            $table->string('reference_no', 80)->nullable();
            $table->text('notes')->nullable();
            $table->unsignedBigInteger('created_by')->nullable();
            $table->timestamps();

            $table->index(['company_id', 'expense_date']);
            $table->index(['company_id', 'category']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('accounting_expenses');
    }
};
