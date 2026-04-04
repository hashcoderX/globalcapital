<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('mf_loan_requests', function (Blueprint $table) {
            $table->string('loan_scope', 20)->default('center_loan')->after('branch_id');
        });

        if (DB::getDriverName() === 'mysql') {
            DB::statement('ALTER TABLE mf_loan_requests DROP FOREIGN KEY mf_loan_requests_mf_route_id_foreign');
            DB::statement('ALTER TABLE mf_loan_requests DROP FOREIGN KEY mf_loan_requests_mf_center_id_foreign');
            DB::statement('ALTER TABLE mf_loan_requests DROP FOREIGN KEY mf_loan_requests_mf_group_id_foreign');

            DB::statement('ALTER TABLE mf_loan_requests MODIFY mf_route_id BIGINT UNSIGNED NULL');
            DB::statement('ALTER TABLE mf_loan_requests MODIFY mf_center_id BIGINT UNSIGNED NULL');
            DB::statement('ALTER TABLE mf_loan_requests MODIFY mf_group_id BIGINT UNSIGNED NULL');

            DB::statement('ALTER TABLE mf_loan_requests ADD CONSTRAINT mf_loan_requests_mf_route_id_foreign FOREIGN KEY (mf_route_id) REFERENCES mf_routes(id) ON DELETE CASCADE');
            DB::statement('ALTER TABLE mf_loan_requests ADD CONSTRAINT mf_loan_requests_mf_center_id_foreign FOREIGN KEY (mf_center_id) REFERENCES mf_centers(id) ON DELETE CASCADE');
            DB::statement('ALTER TABLE mf_loan_requests ADD CONSTRAINT mf_loan_requests_mf_group_id_foreign FOREIGN KEY (mf_group_id) REFERENCES mf_groups(id) ON DELETE CASCADE');
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (DB::getDriverName() === 'mysql') {
            DB::statement('ALTER TABLE mf_loan_requests DROP FOREIGN KEY mf_loan_requests_mf_route_id_foreign');
            DB::statement('ALTER TABLE mf_loan_requests DROP FOREIGN KEY mf_loan_requests_mf_center_id_foreign');
            DB::statement('ALTER TABLE mf_loan_requests DROP FOREIGN KEY mf_loan_requests_mf_group_id_foreign');

            DB::statement('ALTER TABLE mf_loan_requests MODIFY mf_route_id BIGINT UNSIGNED NOT NULL');
            DB::statement('ALTER TABLE mf_loan_requests MODIFY mf_center_id BIGINT UNSIGNED NOT NULL');
            DB::statement('ALTER TABLE mf_loan_requests MODIFY mf_group_id BIGINT UNSIGNED NOT NULL');

            DB::statement('ALTER TABLE mf_loan_requests ADD CONSTRAINT mf_loan_requests_mf_route_id_foreign FOREIGN KEY (mf_route_id) REFERENCES mf_routes(id) ON DELETE CASCADE');
            DB::statement('ALTER TABLE mf_loan_requests ADD CONSTRAINT mf_loan_requests_mf_center_id_foreign FOREIGN KEY (mf_center_id) REFERENCES mf_centers(id) ON DELETE CASCADE');
            DB::statement('ALTER TABLE mf_loan_requests ADD CONSTRAINT mf_loan_requests_mf_group_id_foreign FOREIGN KEY (mf_group_id) REFERENCES mf_groups(id) ON DELETE CASCADE');
        }

        Schema::table('mf_loan_requests', function (Blueprint $table) {
            $table->dropColumn('loan_scope');
        });
    }
};
