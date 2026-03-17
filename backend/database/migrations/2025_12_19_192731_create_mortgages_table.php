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
        if (!Schema::hasTable('mortgages')) {
            Schema::create('mortgages', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('tenant_id');
                $table->unsignedBigInteger('branch_id');
                $table->unsignedBigInteger('customer_id');
                $table->enum('mortgage_type', ['land', 'house', 'vehicle', 'gold', 'other']);
                $table->decimal('requested_amount', 15, 2);
                $table->decimal('approved_amount', 15, 2)->nullable();
                $table->decimal('interest_rate', 5, 2);
                $table->enum('interest_type', ['fixed', 'reducing']);
                $table->integer('tenure_months');
                $table->decimal('installment_amount', 15, 2)->nullable();
                $table->decimal('penalty_rate', 5, 2)->default(0);
                $table->decimal('processing_fee', 10, 2)->default(0);
                $table->enum('status', ['draft', 'submitted', 'approved', 'active', 'arrears', 'settled', 'released'])->default('draft');
                $table->unsignedBigInteger('approved_by')->nullable();
                $table->timestamp('approved_at')->nullable();
                $table->unsignedBigInteger('created_by');
                $table->timestamps();

                $table->foreign('tenant_id')->references('id')->on('companies');
                $table->foreign('branch_id')->references('id')->on('companies');
                $table->foreign('customer_id')->references('id')->on('customers');
                $table->foreign('approved_by')->references('id')->on('users');
                $table->foreign('created_by')->references('id')->on('users');

                $table->index(['tenant_id', 'branch_id']);
                $table->index(['customer_id']);
                $table->index(['status']);
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('mortgages');
    }
};
