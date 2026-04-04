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
        Schema::table('finance_product_types', function (Blueprint $table) {
            $table->decimal('interest_rate', 8, 2)->nullable()->after('description');
            $table->string('interest_type', 20)->nullable()->after('interest_rate');
            $table->unsignedInteger('tenure_months')->nullable()->after('interest_type');
            $table->string('installment_frequency', 20)->nullable()->after('tenure_months');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('finance_product_types', function (Blueprint $table) {
            $table->dropColumn([
                'interest_rate',
                'interest_type',
                'tenure_months',
                'installment_frequency',
            ]);
        });
    }
};
