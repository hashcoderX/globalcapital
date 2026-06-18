<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('mf_loan_products', function (Blueprint $table) {
            $table->id();
            $table->string('name')->unique();
            $table->decimal('interest_rate', 8, 4)->default(0);
            $table->enum('interest_type', ['flat', 'reducing'])->default('flat');
            $table->unsignedInteger('terms_count')->default(1);
            $table->enum('refund_option', ['day', 'week', 'month'])->default('month');
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('mf_loan_products');
    }
};
