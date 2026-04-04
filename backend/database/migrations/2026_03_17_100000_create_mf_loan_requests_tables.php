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
        Schema::create('mf_loan_requests', function (Blueprint $table) {
            $table->id();
            $table->foreignId('mf_route_id')->constrained('mf_routes')->cascadeOnDelete();
            $table->foreignId('mf_center_id')->constrained('mf_centers')->cascadeOnDelete();
            $table->foreignId('mf_group_id')->constrained('mf_groups')->cascadeOnDelete();

            $table->string('manager_name');
            $table->string('field_officer');
            $table->string('group_leader');

            $table->string('customer_no')->unique();
            $table->string('customer_name');
            $table->string('nick_name')->nullable();
            $table->string('nic');
            $table->text('address');
            $table->string('contact_no');

            $table->decimal('loan_amount', 15, 2);
            $table->text('reason')->nullable();
            $table->enum('refund_option', ['day', 'week', 'month']);
            $table->decimal('interest_rate', 6, 2);
            $table->integer('terms_count');
            $table->decimal('refundable_amount', 15, 2);
            $table->decimal('installment_amount', 15, 2);
            $table->decimal('document_charges', 15, 2)->default(0);
            $table->date('loan_request_date');

            $table->enum('status', ['requested', 'approved', 'released', 'rejected'])->default('requested');
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });

        Schema::create('mf_loan_guarantors', function (Blueprint $table) {
            $table->id();
            $table->foreignId('mf_loan_request_id')->constrained('mf_loan_requests')->cascadeOnDelete();
            $table->string('name');
            $table->string('nic')->nullable();
            $table->text('address')->nullable();
            $table->string('contact_no')->nullable();
            $table->string('relationship')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('mf_loan_guarantors');
        Schema::dropIfExists('mf_loan_requests');
    }
};
