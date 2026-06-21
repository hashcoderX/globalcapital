<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('employee_wallet_bank_deposits', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('employee_wallet_id');
            $table->unsignedBigInteger('employee_id');
            $table->unsignedBigInteger('branch_id');
            $table->unsignedBigInteger('bank_account_id');
            $table->decimal('amount', 12, 2);
            $table->date('deposit_date');
            $table->string('note', 500)->nullable();
            $table->unsignedBigInteger('created_by')->nullable();
            $table->timestamps();

            $table->foreign('employee_wallet_id')->references('id')->on('employee_wallets')->onDelete('cascade');
            $table->foreign('employee_id')->references('id')->on('employees')->onDelete('cascade');
            $table->foreign('branch_id')->references('id')->on('companies');
            $table->foreign('bank_account_id')->references('id')->on('company_accounts');
            $table->foreign('created_by')->references('id')->on('users')->nullOnDelete();

            $table->index(['employee_wallet_id', 'deposit_date'], 'ewbd_wallet_date_idx');
            $table->index(['branch_id', 'deposit_date'], 'ewbd_branch_date_idx');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('employee_wallet_bank_deposits');
    }
};
