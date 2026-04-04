<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('mortgages', function (Blueprint $table) {
            if (!Schema::hasColumn('mortgages', 'due_amount')) {
                $table->decimal('due_amount', 15, 2)->default(0)->after('arrears_amount');
            }
            if (!Schema::hasColumn('mortgages', 'due_interest_amount')) {
                $table->decimal('due_interest_amount', 15, 2)->default(0)->after('due_amount');
            }
        });
    }

    public function down(): void
    {
        Schema::table('mortgages', function (Blueprint $table) {
            $drop = [];
            if (Schema::hasColumn('mortgages', 'due_interest_amount')) {
                $drop[] = 'due_interest_amount';
            }
            if (Schema::hasColumn('mortgages', 'due_amount')) {
                $drop[] = 'due_amount';
            }
            if (!empty($drop)) {
                $table->dropColumn($drop);
            }
        });
    }
};
