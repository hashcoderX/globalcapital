<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('mf_holiday_loan_date_shifts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('mf_holiday_id')->constrained('mf_holidays')->cascadeOnDelete();
            $table->string('loan_type', 20);
            $table->unsignedBigInteger('loan_id');
            $table->string('field_name', 40);
            $table->date('original_date');
            $table->date('shifted_date');
            $table->timestamps();

            $table->unique(['mf_holiday_id', 'loan_type', 'loan_id', 'field_name'], 'mf_holiday_shift_unique');
            $table->index(['loan_type', 'loan_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('mf_holiday_loan_date_shifts');
    }
};
