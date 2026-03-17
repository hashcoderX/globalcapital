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
        Schema::create('mortgage_guarantors', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('mortgage_id');
            $table->string('name');
            $table->string('nic');
            $table->string('relationship');
            $table->decimal('income', 12, 2)->nullable();
            $table->string('contact_number');
            $table->timestamps();

            $table->foreign('mortgage_id')->references('id')->on('mortgages')->onDelete('cascade');

            $table->index(['mortgage_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('mortgage_guarantors');
    }
};
