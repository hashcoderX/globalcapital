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
        Schema::table('companies', function (Blueprint $table) {
            $table->foreignId('manager_user_id')->nullable()->after('currency')->constrained('users')->nullOnDelete();
            $table->decimal('opening_asset', 18, 2)->default(0)->after('manager_user_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('companies', function (Blueprint $table) {
            $table->dropConstrainedForeignId('manager_user_id');
            $table->dropColumn('opening_asset');
        });
    }
};
