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
        Schema::dropIfExists('mf_centers');

        Schema::create('mf_centers', function (Blueprint $table) {
            $table->id();
            $table->foreignId('mf_route_id')->constrained('mf_routes')->cascadeOnDelete();
            $table->string('name');
            $table->string('code')->unique();
            $table->string('meeting_day')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('mf_centers');

        Schema::create('mf_centers', function (Blueprint $table) {
            $table->id();
            $table->foreignId('mf_group_id')->constrained('mf_groups')->cascadeOnDelete();
            $table->string('name');
            $table->string('code')->unique();
            $table->string('meeting_day')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });
    }
};
