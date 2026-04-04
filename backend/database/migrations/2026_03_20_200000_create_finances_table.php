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
        Schema::create('finances', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('tenant_id')->default(1);
            $table->unsignedBigInteger('branch_id')->nullable();
            $table->foreignId('customer_id')->constrained()->cascadeOnDelete();
            $table->string('finance_type')->default('vehicle'); // e.g. vehicle, equipment
            $table->string('product_type')->nullable(); // e.g. lease, hire purchase
            $table->string('asset_reference')->nullable(); // registration no / chassis / deed etc.
            $table->decimal('amount', 15, 2); // invoice / asset value
            $table->decimal('down_payment', 15, 2)->default(0);
            $table->decimal('financed_amount', 15, 2); // amount financed
            $table->decimal('interest_rate', 8, 4)->default(0); // annual nominal rate
            $table->string('interest_type')->default('fixed'); // fixed / reducing
            $table->integer('tenure_months');
            $table->string('installment_frequency')->default('monthly');
            $table->decimal('installment_amount', 15, 2);
            $table->string('status')->default('draft'); // draft, active, settled, cancelled
            $table->date('start_date')->nullable();
            $table->unsignedBigInteger('created_by')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('finances');
    }
};
