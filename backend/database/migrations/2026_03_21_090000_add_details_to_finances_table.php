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
            $table->json('vehicle_details')->nullable()->after('asset_reference');
            $table->json('valuation_details')->nullable()->after('vehicle_details');
            $table->json('guarantor_details')->nullable()->after('valuation_details');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('finances', function (Blueprint $table) {
            $table->dropColumn(['vehicle_details', 'valuation_details', 'guarantor_details']);
        });
    }
};
