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
        Schema::table('draft_loans', function (Blueprint $table) {
            $table->dropColumn([
                'repayment_plan',
                'down_payment',
                'financed_amount',
                'interest_type',
                'due_capital_amount',
                'due_interest_amount',
                'arrears',
            ]);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('draft_loans', function (Blueprint $table) {
            $table->json('repayment_plan')->nullable()->after('guarantor_details');
            $table->decimal('down_payment', 15, 2)->default(0)->after('amount');
            $table->decimal('financed_amount', 15, 2)->after('down_payment');
            $table->string('interest_type')->default('fixed')->after('interest_rate');
            $table->decimal('due_capital_amount', 15, 2)->default(0)->after('due_amount');
            $table->decimal('due_interest_amount', 15, 2)->default(0)->after('due_capital_amount');
            $table->decimal('arrears', 15, 2)->default(0)->after('due_interest_amount');
        });
    }
};
