<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::statement("ALTER TABLE company_document_templates MODIFY template_type ENUM('loan_agreement','reminder_letter','arrears_letter','mortgage_agreement','mortgage_reminder','mortgage_legal_letter') NOT NULL");
    }

    public function down(): void
    {
        DB::statement("ALTER TABLE company_document_templates MODIFY template_type ENUM('loan_agreement','reminder_letter','arrears_letter') NOT NULL");
    }
};
