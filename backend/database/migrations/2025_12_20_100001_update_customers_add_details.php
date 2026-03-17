<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('customers', function (Blueprint $table) {
            if (!Schema::hasColumn('customers', 'marital_status')) {
                $table->enum('marital_status', ['single','married','divorced','widowed'])->nullable()->after('gender');
            }
            if (!Schema::hasColumn('customers', 'nationality')) {
                $table->string('nationality')->nullable()->after('marital_status');
            }
            if (Schema::hasColumn('customers', 'address')) {
                $table->renameColumn('address', 'permanent_address');
            }
            if (!Schema::hasColumn('customers', 'current_address')) {
                $table->text('current_address')->nullable()->after('permanent_address');
            }
            if (!Schema::hasColumn('customers', 'employment_type')) {
                $table->enum('employment_type', ['salaried','self_employed','business'])->nullable()->after('current_address');
            }
            if (!Schema::hasColumn('customers', 'employer_name')) {
                $table->string('employer_name')->nullable()->after('employment_type');
            }
            if (!Schema::hasColumn('customers', 'job_title')) {
                $table->string('job_title')->nullable()->after('employer_name');
            }
            if (!Schema::hasColumn('customers', 'other_income_sources')) {
                $table->string('other_income_sources')->nullable()->after('monthly_income');
            }
            if (!Schema::hasColumn('customers', 'existing_loans')) {
                $table->boolean('existing_loans')->default(false)->after('other_income_sources');
            }
            if (!Schema::hasColumn('customers', 'monthly_loan_obligations')) {
                $table->decimal('monthly_loan_obligations', 12, 2)->nullable()->after('existing_loans');
            }
            if (!Schema::hasColumn('customers', 'credit_score')) {
                $table->integer('credit_score')->nullable()->after('monthly_loan_obligations');
            }
        });
    }

    public function down(): void
    {
        Schema::table('customers', function (Blueprint $table) {
            // Note: renaming back 'permanent_address' to 'address' is unsafe if data rely on new column names.
            // For simplicity, we will not revert rename in down() to avoid data loss.
            $table->dropColumn([
                'marital_status','nationality','current_address','employment_type','employer_name','job_title','other_income_sources','existing_loans','monthly_loan_obligations','credit_score'
            ]);
        });
    }
};
