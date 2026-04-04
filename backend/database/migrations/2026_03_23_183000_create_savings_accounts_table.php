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
        Schema::create('savings_accounts', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('tenant_id')->default(1);
            $table->unsignedBigInteger('branch_id')->nullable();
            $table->foreignId('customer_id')->constrained('customers')->cascadeOnDelete();
            $table->string('account_number', 60)->unique();
            $table->enum('account_type', ['savings', 'current', 'fixed_deposit'])->default('savings');
            $table->decimal('opening_deposit', 15, 2)->default(0);
            $table->decimal('balance', 15, 2)->default(0);
            $table->decimal('interest_rate', 8, 4)->default(0);
            $table->date('opened_at')->nullable();
            $table->enum('status', ['active', 'dormant', 'closed'])->default('active');
            $table->unsignedBigInteger('created_by')->nullable();
            $table->timestamps();

            $table->index(['customer_id', 'status']);
            $table->index(['account_type', 'status']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('savings_accounts');
    }
};
