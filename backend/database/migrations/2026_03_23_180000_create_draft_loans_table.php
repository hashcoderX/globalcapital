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
        Schema::create('draft_loans', function (Blueprint $table) {
            $table->id();
            $table->foreignId('finance_id')->nullable()->constrained('finances')->nullOnDelete();
            $table->unsignedBigInteger('tenant_id')->default(1);
            $table->unsignedBigInteger('branch_id')->nullable();
            $table->foreignId('customer_id')->constrained()->cascadeOnDelete();
            $table->string('customer_no')->nullable();
            $table->string('finance_type')->default('vehicle');
            $table->string('product_type')->default('draft loan');
            $table->string('asset_reference')->nullable();
            $table->json('vehicle_details')->nullable();
            $table->json('valuation_details')->nullable();
            $table->json('guarantor_details')->nullable();
            $table->json('repayment_plan')->nullable();
            $table->decimal('amount', 15, 2);
            $table->decimal('down_payment', 15, 2)->default(0);
            $table->decimal('financed_amount', 15, 2);
            $table->decimal('interest_rate', 8, 4)->default(0);
            $table->string('interest_type')->default('fixed');
            $table->integer('tenure_months');
            $table->string('installment_frequency')->default('monthly');
            $table->decimal('installment_amount', 15, 2)->default(0);
            $table->date('start_date')->nullable();
            $table->date('due_date')->nullable();
            $table->decimal('due_amount', 15, 2)->default(0);
            $table->decimal('due_capital_amount', 15, 2)->default(0);
            $table->decimal('due_interest_amount', 15, 2)->default(0);
            $table->decimal('arrears', 15, 2)->default(0);
            $table->decimal('total_paid_amount', 15, 2)->default(0);
            $table->decimal('balance_amount', 15, 2)->default(0);
            $table->date('next_collection_date')->nullable();
            $table->string('status')->default('pending_approval');
            $table->unsignedBigInteger('created_by')->nullable();
            $table->timestamps();

            $table->index(['product_type', 'status']);
            $table->index(['customer_id', 'status']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('draft_loans');
    }
};
