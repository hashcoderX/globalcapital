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
        Schema::table('employees', function (Blueprint $table) {
            $table->string('tin')->nullable();
            $table->boolean('tax_applicable')->default(false);
            $table->boolean('tax_relief_eligible')->default(false);
            $table->decimal('apit_tax_amount', 10, 2)->nullable();
            $table->decimal('apit_tax_rate', 5, 2)->nullable();

            $table->decimal('epf_employee_contribution', 5, 2)->nullable();
            $table->decimal('epf_employer_contribution', 5, 2)->nullable();
            $table->decimal('etf_employee_contribution', 5, 2)->nullable();
            $table->decimal('etf_employer_contribution', 5, 2)->nullable();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('employees', function (Blueprint $table) {
            $table->dropColumn([
                'tin',
                'tax_applicable',
                'tax_relief_eligible',
                'apit_tax_amount',
                'apit_tax_rate',
                'epf_employee_contribution',
                'epf_employer_contribution',
                'etf_employee_contribution',
                'etf_employer_contribution',
            ]);
        });
    }
};
