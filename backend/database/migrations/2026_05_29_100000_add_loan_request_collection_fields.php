<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('loan_requests', function (Blueprint $table) {
            if (!Schema::hasColumn('loan_requests', 'due_date')) {
                $table->date('due_date')->nullable()->after('installment_amount');
            }
            if (!Schema::hasColumn('loan_requests', 'next_due_date')) {
                $table->date('next_due_date')->nullable()->after('due_date');
            }
            if (!Schema::hasColumn('loan_requests', 'total_collected')) {
                $table->decimal('total_collected', 15, 2)->default(0)->after('next_due_date');
            }
        });

        if (!Schema::hasTable('loan_request_collections')) {
            Schema::create('loan_request_collections', function (Blueprint $table) {
                $table->id();
                $table->foreignId('loan_request_id')->constrained('loan_requests')->cascadeOnDelete();
                $table->date('collection_date');
                $table->decimal('collected_amount', 15, 2);
                $table->string('payment_type', 30)->default('cash');
                $table->string('payment_reference')->nullable();
                $table->text('note')->nullable();
                $table->unsignedBigInteger('created_by')->nullable();
                $table->timestamps();
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('loan_request_collections');

        Schema::table('loan_requests', function (Blueprint $table) {
            foreach (['due_date', 'next_due_date', 'total_collected'] as $column) {
                if (Schema::hasColumn('loan_requests', $column)) {
                    $table->dropColumn($column);
                }
            }
        });
    }
};
