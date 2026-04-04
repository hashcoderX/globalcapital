<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('mf_loan_collections', function (Blueprint $table) {
            $table->id();
            $table->foreignId('mf_loan_request_id')->constrained('mf_loan_requests')->cascadeOnDelete();
            $table->date('collection_date');
            $table->decimal('collected_amount', 14, 2);
            $table->decimal('capital_amount', 14, 2)->default(0);
            $table->decimal('interest_amount', 14, 2)->default(0);
            $table->decimal('penalty_amount', 14, 2)->default(0);
            $table->string('note', 1000)->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->index(['mf_loan_request_id', 'collection_date']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('mf_loan_collections');
    }
};
