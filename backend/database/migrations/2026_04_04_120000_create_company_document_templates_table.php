<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('company_document_templates', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained('companies')->cascadeOnDelete();
            $table->enum('template_type', ['loan_agreement', 'reminder_letter', 'arrears_letter']);
            $table->string('file_path', 255);
            $table->string('original_name', 255);
            $table->foreignId('uploaded_by')->nullable()->constrained('users')->nullOnDelete();
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->index(['company_id', 'template_type', 'is_active'], 'idx_company_template_active');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('company_document_templates');
    }
};
