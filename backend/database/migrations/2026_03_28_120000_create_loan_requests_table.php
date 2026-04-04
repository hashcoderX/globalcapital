<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('loan_requests', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('tenant_id')->default(1);
            $table->unsignedBigInteger('branch_id')->nullable();
            $table->string('request_no')->nullable()->unique();

            $table->string('loan_product', 120);
            $table->string('customer_no', 60);
            $table->string('customer_full_name', 190);
            $table->string('customer_nic', 80);
            $table->string('customer_mobile', 40);
            $table->text('customer_address');

            $table->decimal('principal', 16, 2);
            $table->decimal('annual_rate', 8, 4);
            $table->unsignedInteger('tenure_months');
            $table->string('installment_frequency', 20);
            $table->unsignedInteger('installments')->default(0);
            $table->decimal('installment_amount', 16, 2)->default(0);
            $table->decimal('total_payable', 16, 2)->default(0);

            $table->json('customer_details');
            $table->json('guarantor_details')->nullable();

            $table->string('status', 40)->default('pending_approval');
            $table->unsignedTinyInteger('approval_level')->default(1);
            $table->unsignedTinyInteger('required_approval_level')->default(2);
            $table->unsignedBigInteger('created_by')->nullable();
            $table->unsignedBigInteger('last_action_by')->nullable();
            $table->timestamp('last_action_at')->nullable();
            $table->text('approval_note')->nullable();

            $table->timestamps();

            $table->index(['status', 'approval_level']);
            $table->index('customer_no');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('loan_requests');
    }
};
