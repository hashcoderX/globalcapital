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
        Schema::create('mortgage_documents', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('mortgage_id');
            $table->enum('document_type', ['deed', 'valuation', 'agreement', 'insurance', 'nic', 'other']);
            $table->string('file_path');
            $table->string('original_name');
            $table->unsignedBigInteger('uploaded_by');
            $table->timestamps();

            $table->foreign('mortgage_id')->references('id')->on('mortgages')->onDelete('cascade');
            $table->foreign('uploaded_by')->references('id')->on('users');

            $table->index(['mortgage_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('mortgage_documents');
    }
};
