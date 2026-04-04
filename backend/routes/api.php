<?php

use App\Http\Controllers\AuthController;
use App\Http\Controllers\CompanyController;
use App\Http\Controllers\Api\HR\DepartmentController;
use App\Http\Controllers\Api\HR\DesignationController;
use App\Http\Controllers\Api\HR\EmployeeController;
use App\Http\Controllers\Api\HR\AttendanceController;
use App\Http\Controllers\Api\HR\LeaveController;
use App\Http\Controllers\Api\HR\LeaveTypeController;
use App\Http\Controllers\Api\HR\PayrollController;
use App\Http\Controllers\Api\HR\CandidateController;
use App\Http\Controllers\Api\HR\CandidateDocumentController;
use App\Http\Controllers\Api\HR\CandidateEducationController;
use App\Http\Controllers\Api\HR\CandidateExperienceController;
use App\Http\Controllers\Api\HR\CandidateInterviewController;
use App\Http\Controllers\Api\HR\EmployeeDocumentController;
use App\Http\Controllers\Api\HR\EmployeeEducationController;
use App\Http\Controllers\Api\HR\EmployeeExperienceController;
use App\Http\Controllers\Api\HR\EmployeeAllowanceDeductionController;
use App\Http\Controllers\Api\MortgageController;
use App\Http\Controllers\Api\CustomerController;
use App\Http\Controllers\Api\CustomerDocumentController;
use App\Http\Controllers\Api\CompanyDocumentTemplateController;
use App\Http\Controllers\Api\Microfinance\RouteController as MicrofinanceRouteController;
use App\Http\Controllers\Api\Microfinance\GroupController as MicrofinanceGroupController;
use App\Http\Controllers\Api\Microfinance\CenterController as MicrofinanceCenterController;
use App\Http\Controllers\Api\Microfinance\HolidayController as MicrofinanceHolidayController;
use App\Http\Controllers\Api\Microfinance\PenaltySettingController as MicrofinancePenaltySettingController;
use App\Http\Controllers\Api\Microfinance\LoanRequestController as MicrofinanceLoanRequestController;
use App\Http\Controllers\Api\Microfinance\LoanCollectionController as MicrofinanceLoanCollectionController;
use App\Http\Controllers\Api\FinanceController;
use App\Http\Controllers\Api\FinanceProductTypeController;
use App\Http\Controllers\Api\LoanRequestController;
use App\Http\Controllers\Api\SavingsAccountController;
use App\Http\Controllers\RoleController;
use App\Http\Controllers\PermissionController;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

Route::get('/user', function (Request $request) {
    return $request->user()?->load([
        'branch:id,name',
        'designation:id,name',
        'employee:id,first_name,last_name,email,branch_id,designation_id',
    ]);
})->middleware('auth:sanctum');

Route::get('/users', function () {
    return User::all();
});

Route::get('/reset-password', function () {
    User::where('email', 'superadmin@softcodelk.com')->update(['password' => \Illuminate\Support\Facades\Hash::make('password')]);
    return 'Password reset';
});

Route::post('/register', [AuthController::class, 'register']);
Route::post('/login', [AuthController::class, 'login']);
Route::post('/logout', [AuthController::class, 'logout'])->middleware('auth:sanctum');

Route::middleware(['auth:sanctum', 'system.online'])->group(function () {
    Route::get('system/status', [CompanyController::class, 'getSystemStatus']);
    Route::post('system/status', [CompanyController::class, 'updateSystemStatus']);
    Route::post('system/reset', [CompanyController::class, 'resetSystem']);
    Route::apiResource('companies', CompanyController::class);
    Route::get('companies/{company}/backup', [CompanyController::class, 'backup']);
    Route::get('companies/{company}/database-backup', [CompanyController::class, 'databaseBackup']);
    Route::get('companies/{company}/document-templates', [CompanyDocumentTemplateController::class, 'index']);
    Route::post('companies/{company}/document-templates', [CompanyDocumentTemplateController::class, 'store']);
    Route::get('companies/{company}/document-templates/{template}/view', [CompanyDocumentTemplateController::class, 'view']);
    Route::delete('companies/{company}/document-templates/{template}', [CompanyDocumentTemplateController::class, 'destroy']);

    // HRM Routes
    Route::prefix('hr')->group(function () {
        Route::apiResource('departments', DepartmentController::class);
        Route::apiResource('designations', DesignationController::class);
        Route::apiResource('employees', EmployeeController::class);
        Route::apiResource('candidates', CandidateController::class);

        // Candidate nested resources
        Route::get('candidates/{candidate}/documents', [CandidateDocumentController::class, 'index']);
        Route::post('candidates/{candidate}/documents', [CandidateDocumentController::class, 'store']);
        Route::delete('candidates/{candidate}/documents/{document}', [CandidateDocumentController::class, 'destroy']);
        Route::get('candidates/{candidate}/documents/{document}/download', [CandidateDocumentController::class, 'download']);

        Route::get('candidates/{candidate}/educations', [CandidateEducationController::class, 'index']);
        Route::post('candidates/{candidate}/educations', [CandidateEducationController::class, 'store']);
        Route::put('candidates/{candidate}/educations/{education}', [CandidateEducationController::class, 'update']);
        Route::delete('candidates/{candidate}/educations/{education}', [CandidateEducationController::class, 'destroy']);

        Route::get('candidates/{candidate}/experiences', [CandidateExperienceController::class, 'index']);
        Route::post('candidates/{candidate}/experiences', [CandidateExperienceController::class, 'store']);
        Route::put('candidates/{candidate}/experiences/{experience}', [CandidateExperienceController::class, 'update']);
        Route::delete('candidates/{candidate}/experiences/{experience}', [CandidateExperienceController::class, 'destroy']);
        Route::post('candidates/{candidate}/generate-appointment-letter', [CandidateController::class, 'generateAppointmentLetter']);
        Route::post('candidates/{candidate}/convert-to-employee', [CandidateController::class, 'convertToEmployee']);
        Route::post('candidates/{candidate}/schedule-interview', [CandidateController::class, 'scheduleInterview']);
        // Multiple interviews per candidate
        Route::get('candidates/{candidate}/interviews', [CandidateInterviewController::class, 'index']);
        Route::post('candidates/{candidate}/interviews', [CandidateInterviewController::class, 'store']);
        Route::put('candidates/{candidate}/interviews/{interview}', [CandidateInterviewController::class, 'update']);
        Route::get('interviews/upcoming', [CandidateInterviewController::class, 'upcoming']);
        Route::get('candidates/{candidate}/download-cv', [CandidateController::class, 'downloadCv']);
        Route::get('candidates/{candidate}/download-appointment-letter', [CandidateController::class, 'downloadAppointmentLetter']);

        // Employee nested resources
        Route::get('employees/{employee}/documents', [EmployeeDocumentController::class, 'index']);
        Route::post('employees/{employee}/documents', [EmployeeDocumentController::class, 'store']);
        Route::delete('employees/{employee}/documents/{document}', [EmployeeDocumentController::class, 'destroy']);
        Route::get('employees/{employee}/documents/{document}/download', [EmployeeDocumentController::class, 'download']);

        Route::get('employees/{employee}/education', [EmployeeEducationController::class, 'index']);
        Route::post('employees/{employee}/education', [EmployeeEducationController::class, 'store']);
        Route::put('employees/{employee}/education/{education}', [EmployeeEducationController::class, 'update']);
        Route::delete('employees/{employee}/education/{education}', [EmployeeEducationController::class, 'destroy']);

        Route::get('employees/{employee}/experience', [EmployeeExperienceController::class, 'index']);
        Route::post('employees/{employee}/experience', [EmployeeExperienceController::class, 'store']);
        Route::put('employees/{employee}/experience/{experience}', [EmployeeExperienceController::class, 'update']);
        Route::delete('employees/{employee}/experience/{experience}', [EmployeeExperienceController::class, 'destroy']);

        // Employee Allowances and Deductions
        Route::get('employees/{employee}/allowances-deductions', [EmployeeAllowanceDeductionController::class, 'index']);
        Route::post('employees/{employee}/allowances-deductions', [EmployeeAllowanceDeductionController::class, 'store']);
        Route::put('employees/{employee}/allowances-deductions/{allowanceDeduction}', [EmployeeAllowanceDeductionController::class, 'update']);
        Route::delete('employees/{employee}/allowances-deductions/{allowanceDeduction}', [EmployeeAllowanceDeductionController::class, 'destroy']);

        Route::apiResource('attendance', AttendanceController::class);
        Route::post('attendance/mark', [AttendanceController::class, 'markBasic']);
        Route::post('attendance/mark-out', [AttendanceController::class, 'markOut']);
        Route::post('attendance/upload-csv', [AttendanceController::class, 'uploadCsv']);
        Route::get('attendance/employee/{employeeId}', [AttendanceController::class, 'getEmployeeAttendance']);
        Route::apiResource('leaves', LeaveController::class);
        Route::post('leaves/{leave}/section-head-approve', [LeaveController::class, 'sectionHeadApprove']);
        Route::post('leaves/{leave}/hr-approve', [LeaveController::class, 'hrApprove']);
        Route::apiResource('leave-types', LeaveTypeController::class);
        Route::apiResource('payrolls', PayrollController::class);
        Route::post('payrolls/generate', [PayrollController::class, 'generate']);
        Route::get('payrolls/{payroll}/payslip', [PayrollController::class, 'payslip']);
    });

    // Role and Permission Management Routes
    Route::get('roles', [RoleController::class, 'index']);
    Route::get('permissions', [PermissionController::class, 'index']);
    
    Route::middleware('permission:view_roles')->group(function () {
        Route::get('roles/{role}', [RoleController::class, 'show']);
        Route::get('users/{userId}/roles', [RoleController::class, 'getUserRoles']);
    });
    Route::middleware('permission:create_roles')->group(function () {
        Route::post('roles', [RoleController::class, 'store']);
    });
    Route::middleware('permission:edit_roles')->group(function () {
        Route::put('roles/{role}', [RoleController::class, 'update']);
        Route::put('roles/{role}/permissions', [RoleController::class, 'updatePermissions']);
    });
    Route::middleware('permission:delete_roles')->group(function () {
        Route::delete('roles/{role}', [RoleController::class, 'destroy']);
    });
    Route::middleware('permission:assign_roles')->group(function () {
        Route::post('roles/assign-to-user', [RoleController::class, 'assignToUser']);
        Route::post('roles/remove-from-user', [RoleController::class, 'removeFromUser']);
    });

    Route::middleware('permission:view_permissions')->group(function () {
        Route::get('permissions/{permission}', [PermissionController::class, 'show']);
    });
    Route::middleware('permission:create_permissions')->group(function () {
        Route::post('permissions', [PermissionController::class, 'store']);
    });
    Route::middleware('permission:edit_permissions')->group(function () {
        Route::put('permissions/{permission}', [PermissionController::class, 'update']);
    });
    Route::post('permissions/sync-routes', [PermissionController::class, 'syncFromRoutes']);
    Route::middleware('permission:delete_permissions')->group(function () {
        Route::delete('permissions/{permission}', [PermissionController::class, 'destroy']);
    });

    // Mortgage Management Routes
    Route::apiResource('mortgages', MortgageController::class)->only(['index', 'store', 'show']);
    Route::post('mortgages/{mortgage}/status', [MortgageController::class, 'updateStatus']);
    Route::get('mortgages/reports/collections', [MortgageController::class, 'collectionReport']);
    Route::get('mortgages/reports/arrears', [MortgageController::class, 'arrearsReport']);
    Route::get('mortgages/reports/portfolio', [MortgageController::class, 'portfolioReport']);
    Route::get('mortgages/{mortgage}/payments', [MortgageController::class, 'payments']);
    Route::post('mortgages/{mortgage}/payments', [MortgageController::class, 'storePayment']);
    Route::post('mortgages/{mortgage}/interest-adjustments', [MortgageController::class, 'adjustInterest']);
    Route::get('mortgages/{mortgage}/documents', [MortgageController::class, 'documents']);
    Route::post('mortgages/{mortgage}/documents', [MortgageController::class, 'storeDocument']);
    Route::get('mortgages/{mortgage}/schedule', [MortgageController::class, 'schedule']);

    // Finance Management Routes (non-mortgage finance agreements)
    Route::get('finances/reports/income-expense', [FinanceController::class, 'incomeExpenseReport']);
    Route::get('finances/reports/cash-flow', [FinanceController::class, 'cashFlowReport']);
    Route::get('finances/reports/general-ledger', [FinanceController::class, 'generalLedgerSnapshot']);
    Route::apiResource('finances', FinanceController::class)->only(['index', 'store', 'show']);
    Route::post('finances/{finance}/status', [FinanceController::class, 'updateStatus']);
    Route::get('finances/{finance}/collections', [FinanceController::class, 'collections']);
    Route::post('finances/{finance}/collections', [FinanceController::class, 'storeCollection']);
    Route::get('finances/{finance}/documents', [FinanceController::class, 'documents']);
    Route::post('finances/{finance}/documents', [FinanceController::class, 'storeDocument']);
    Route::get('finance-product-types', [FinanceProductTypeController::class, 'index']);
    Route::post('finance-product-types', [FinanceProductTypeController::class, 'store']);

    // Loan Requests (step-by-step loan module)
    Route::get('loan-requests', [LoanRequestController::class, 'index']);
    Route::post('loan-requests', [LoanRequestController::class, 'store']);
    Route::get('loan-requests/{id}', [LoanRequestController::class, 'show']);
    Route::post('loan-requests/{id}/status', [LoanRequestController::class, 'updateStatus']);

    // Customers
    Route::get('customers/generate-code', [CustomerController::class, 'generateCode']);
    Route::get('customers/by-code/{customerCode}', [CustomerController::class, 'findByCode']);
    Route::apiResource('customers', CustomerController::class);
    Route::get('customers/{customer}/documents', [CustomerDocumentController::class, 'index']);
    Route::post('customers/{customer}/documents', [CustomerDocumentController::class, 'store']);
    Route::delete('customers/{customer}/documents/{document}', [CustomerDocumentController::class, 'destroy']);

    // Savings & Deposits
    Route::get('savings-accounts/reports/ledger', [SavingsAccountController::class, 'ledgerReport']);
    Route::get('savings-accounts/reports/deposit-growth', [SavingsAccountController::class, 'depositGrowthReport']);
    Route::get('savings-accounts/reports/maturity', [SavingsAccountController::class, 'maturityReport']);
    Route::apiResource('savings-accounts', SavingsAccountController::class)->only(['index', 'store', 'show']);
    Route::get('savings-accounts/{account}/transactions', [SavingsAccountController::class, 'transactions']);
    Route::post('savings-accounts/{account}/deposit', [SavingsAccountController::class, 'deposit']);
    Route::post('savings-accounts/{account}/withdraw', [SavingsAccountController::class, 'withdraw']);

    // Microfinance Settings
    Route::prefix('microfinance/settings')->group(function () {
        Route::apiResource('routes', MicrofinanceRouteController::class);
        Route::apiResource('groups', MicrofinanceGroupController::class);
        Route::apiResource('centers', MicrofinanceCenterController::class);
        Route::apiResource('holidays', MicrofinanceHolidayController::class);
        Route::get('penalty-rate', [MicrofinancePenaltySettingController::class, 'show']);
        Route::post('penalty-rate', [MicrofinancePenaltySettingController::class, 'store']);
        Route::put('penalty-rate/{penaltySetting}', [MicrofinancePenaltySettingController::class, 'update']);
    });

    // Microfinance Loan Requests
    Route::prefix('microfinance/loan-requests')->group(function () {
        Route::get('/', [MicrofinanceLoanRequestController::class, 'index']);
        Route::get('/meta', [MicrofinanceLoanRequestController::class, 'meta']);
        Route::post('/', [MicrofinanceLoanRequestController::class, 'store']);
        Route::put('/{loanRequest}', [MicrofinanceLoanRequestController::class, 'update']);
        Route::post('/{loanRequest}/lifecycle', [MicrofinanceLoanRequestController::class, 'updateLifecycle']);
        Route::post('/{loanRequest}/documents', [MicrofinanceLoanRequestController::class, 'storeDocuments']);
        Route::get('/{loanRequest}/download-agreement', [MicrofinanceLoanRequestController::class, 'downloadAgreement']);
        Route::get('/{loanRequest}/download-reminder-letter', [MicrofinanceLoanRequestController::class, 'downloadReminderLetter']);
        Route::get('/{loanRequest}/download-legal-letter', [MicrofinanceLoanRequestController::class, 'downloadLegalLetter']);
        Route::post('/{loanRequest}/approve', [MicrofinanceLoanRequestController::class, 'approve']);
        Route::post('/{loanRequest}/reject', [MicrofinanceLoanRequestController::class, 'reject']);
        Route::post('/{loanRequest}/request-documents', [MicrofinanceLoanRequestController::class, 'requestDocuments']);
    });

    // Microfinance Collections
    Route::prefix('microfinance/collections')->group(function () {
        Route::get('/', [MicrofinanceLoanCollectionController::class, 'index']);
        Route::post('/', [MicrofinanceLoanCollectionController::class, 'store']);
        Route::delete('/{collection}', [MicrofinanceLoanCollectionController::class, 'destroy']);
    });
});