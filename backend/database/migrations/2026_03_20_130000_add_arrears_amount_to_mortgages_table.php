<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('mortgages', function (Blueprint $table) {
            if (!Schema::hasColumn('mortgages', 'arrears_amount')) {
                $table->decimal('arrears_amount', 15, 2)->default(0)->after('due_date');
            }
        });
    }

    public function down(): void
    {
        Schema::table('mortgages', function (Blueprint $table) {
            if (Schema::hasColumn('mortgages', 'arrears_amount')) {
                $table->dropColumn('arrears_amount');
            }
        });
    }
};
