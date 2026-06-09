<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::statement(
            "ALTER TABLE mortgages MODIFY status ENUM(
                'draft',
                'submitted',
                'approved',
                'active',
                'arrears',
                'settled',
                'released',
                'rejected'
            ) NOT NULL DEFAULT 'draft'"
        );
    }

    public function down(): void
    {
        DB::statement(
            "ALTER TABLE mortgages MODIFY status ENUM(
                'draft',
                'submitted',
                'approved',
                'active',
                'arrears',
                'settled',
                'released'
            ) NOT NULL DEFAULT 'draft'"
        );
    }
};
