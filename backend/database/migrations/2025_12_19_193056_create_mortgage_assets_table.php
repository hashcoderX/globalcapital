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
        Schema::create('mortgage_assets', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('mortgage_id');
            $table->enum('asset_type', ['land', 'house', 'vehicle', 'gold', 'other']);
            $table->text('description');
            $table->enum('ownership_type', ['single', 'joint']);
            $table->text('address')->nullable();
            $table->string('deed_number')->nullable();
            $table->date('deed_date')->nullable();
            $table->string('survey_plan_number')->nullable();
            $table->string('registration_office')->nullable();
            $table->string('land_size_or_area')->nullable();
            $table->string('vehicle_reg_no')->nullable();
            $table->string('engine_no')->nullable();
            $table->string('chassis_no')->nullable();
            $table->unsignedBigInteger('created_by');
            $table->timestamps();

            $table->foreign('mortgage_id')->references('id')->on('mortgages')->onDelete('cascade');
            $table->foreign('created_by')->references('id')->on('users');

            $table->index(['mortgage_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('mortgage_assets');
    }
};
