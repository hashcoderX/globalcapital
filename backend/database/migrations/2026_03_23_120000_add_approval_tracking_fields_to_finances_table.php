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
        Schema::table('finances', function (Blueprint $table) {
            $table->decimal('refund_amount', 15, 2)->default(0)->after('installment_amount');
            $table->date('due_date')->nullable()->after('refund_amount');
            $table->decimal('due_amount', 15, 2)->default(0)->after('due_date');
            $table->decimal('due_interest_amount', 15, 2)->default(0)->after('due_amount');
            $table->decimal('penalty', 15, 2)->default(0)->after('due_interest_amount');
            $table->date('next_collection_date')->nullable()->after('penalty');
            $table->date('finance_end_date')->nullable()->after('next_collection_date');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('finances', function (Blueprint $table) {
            $table->dropColumn([
                'refund_amount',
                'due_date',
                'due_amount',
                'due_interest_amount',
                'penalty',
                'next_collection_date',
                'finance_end_date',
            ]);
        });
    }
};
