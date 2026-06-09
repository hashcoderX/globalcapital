<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('company_accounts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained('companies')->cascadeOnDelete();
            $table->enum('account_type', ['main', 'cash', 'bank']);
            $table->string('account_name', 190);
            $table->string('account_code', 30)->nullable();
            $table->string('bank_name', 190)->nullable();
            $table->string('bank_branch', 190)->nullable();
            $table->string('account_number', 80)->nullable();
            $table->decimal('opening_balance', 18, 2)->default(0);
            $table->decimal('current_balance', 18, 2)->default(0);
            $table->boolean('is_active')->default(true);
            $table->text('notes')->nullable();
            $table->unsignedBigInteger('created_by')->nullable();
            $table->timestamps();

            $table->index(['company_id', 'account_type']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('company_accounts');
    }
};
