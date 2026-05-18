<?php

namespace App\Http\Controllers\Api\HR;

use App\Http\Controllers\Controller;
use App\Models\Employee;
use App\Models\User;
use App\Http\Requests\StoreEmployeeRequest;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class EmployeeController extends Controller
{
    private function canManageEmployees(Request $request, string $permission): bool
    {
        $user = $request->user();
        if (!$user) {
            return false;
        }

        return $user->isSystemAdmin() || $user->hasPermission($permission);
    }

    /**
     * Display a listing of the resource.
     */
    public function index(Request $request): JsonResponse
    {
        $tenantId = $request->input('tenant_id');
        $branchId = $request->input('branch_id');

        $query = Employee::with(['department', 'designation', 'branch']);

        if ($tenantId) {
            $query->where('tenant_id', $tenantId);
        }

        if ($branchId) {
            $query->where('branch_id', $branchId);
        }

        $employees = $query->paginate(15);

        return response()->json($employees);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(StoreEmployeeRequest $request): JsonResponse
    {
        if (!$this->canManageEmployees($request, 'create_employees')) {
            return response()->json(['message' => 'You do not have permission to create employees.'], 403);
        }
        $validated = $request->validated();

        // Set default values for required fields
        $employeeData = [
            'tenant_id' => 1, // Default tenant
            'branch_id' => $validated['branch_id'],
            'first_name' => $validated['first_name'],
            'last_name' => $validated['last_name'],
            'email' => $validated['email'],
            'mobile' => $validated['phone'] ?? '',
            'reporting_person' => $validated['reporting_person'] ?? null,
            'nic_passport' => 'TEMP' . time(), // Temporary NIC for demo
            'address' => $validated['address'] ?? '',
            'photo_path' => $validated['photo_path'] ?? null,
            'date_of_birth' => $validated['date_of_birth'] ?? null,
            'gender' => 'other', // Default gender
            'department_id' => $validated['department_id'],
            'designation_id' => $validated['designation_id'],
            'join_date' => $validated['hire_date'],
            'basic_salary' => $validated['basic_salary'],
            'commission' => $validated['commission'] ?? null,
            'commission_base' => $validated['commission_base'] ?? null,
            'overtime_payment_per_hour' => $validated['overtime_payment_per_hour'] ?? null,
            'deduction_late_hour' => $validated['deduction_late_hour'] ?? null,
            'epf_employee_contribution' => $validated['epf_employee_contribution'] ?? 8.00,
            'epf_employer_contribution' => $validated['epf_employer_contribution'] ?? 12.00,
            'etf_employee_contribution' => $validated['etf_employee_contribution'] ?? 0.00,
            'etf_employer_contribution' => $validated['etf_employer_contribution'] ?? 3.00,
            'tin' => $validated['tin'] ?? null,
            'tax_applicable' => (bool) ($validated['tax_applicable'] ?? false),
            'tax_relief_eligible' => (bool) ($validated['tax_relief_eligible'] ?? false),
            'apit_tax_amount' => $validated['apit_tax_amount'] ?? null,
            'apit_tax_rate' => $validated['apit_tax_rate'] ?? null,
            'employee_type' => 'full_time', // Default type
            'status' => $validated['status'] ?? 'active',
        ];

        // Generate a collision-safe employee code, including soft-deleted rows.
        $latestCode = Employee::withTrashed()
            ->whereNotNull('employee_code')
            ->where('employee_code', 'like', 'EMP%')
            ->orderByDesc('id')
            ->value('employee_code');

        $nextNumber = 1;
        if (is_string($latestCode) && preg_match('/^EMP(\d+)$/', $latestCode, $matches)) {
            $nextNumber = ((int) $matches[1]) + 1;
        }

        do {
            $candidateCode = 'EMP' . str_pad((string) $nextNumber, 4, '0', STR_PAD_LEFT);
            $nextNumber++;
        } while (Employee::withTrashed()->where('employee_code', $candidateCode)->exists());

        $employeeData['employee_code'] = $candidateCode;

        $employee = DB::transaction(function () use ($validated, $employeeData) {
            $employee = Employee::create($employeeData);

            // Create user account for the employee.
            User::create([
                'name' => $validated['first_name'] . ' ' . $validated['last_name'],
                'email' => $validated['email'],
                'password' => Hash::make($validated['password']),
                'employee_id' => $employee->id,
                'branch_id' => $validated['branch_id'],
                'designation_id' => $validated['designation_id'],
            ]);

            return $employee;
        });

        return response()->json($employee->load(['department', 'designation', 'branch']), 201);
    }

    /**
     * Display the specified resource.
     */
    public function show(Employee $employee): JsonResponse
    {
        return response()->json($employee->load(['department', 'designation', 'branch']));
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, Employee $employee): JsonResponse
    {
        if (!$this->canManageEmployees($request, 'edit_employees')) {
            return response()->json(['message' => 'You do not have permission to edit employees.'], 403);
        }

        $validated = $request->validate([
            'first_name' => 'sometimes|required|string|max:255',
            'last_name' => 'sometimes|required|string|max:255',
            'email' => 'sometimes|required|email|unique:employees,email,' . $employee->id,
            'password' => 'nullable|string|min:8',
            'phone' => 'nullable|string|max:20',
            'reporting_person' => 'nullable|string|max:255',
            'address' => 'nullable|string',
            'date_of_birth' => 'nullable|date|before:today',
            'hire_date' => 'sometimes|required|date',
            'basic_salary' => 'sometimes|required|numeric|min:0',
            'commission' => 'nullable|numeric|min:0|max:100',
            'commission_base' => 'nullable|in:company_profit,own_business',
            'overtime_payment_per_hour' => 'nullable|numeric|min:0',
            'deduction_late_hour' => 'nullable|numeric|min:0',
            'epf_employee_contribution' => 'nullable|numeric|min:0|max:100',
            'epf_employer_contribution' => 'nullable|numeric|min:0|max:100',
            'etf_employee_contribution' => 'nullable|numeric|min:0|max:100',
            'etf_employer_contribution' => 'nullable|numeric|min:0|max:100',
            'tin' => 'nullable|string|max:50',
            'tax_applicable' => 'nullable|boolean',
            'tax_relief_eligible' => 'nullable|boolean',
            'apit_tax_amount' => 'nullable|numeric|min:0',
            'apit_tax_rate' => 'nullable|numeric|min:0|max:100',
            'department_id' => 'sometimes|required|exists:departments,id',
            'designation_id' => 'sometimes|required|exists:designations,id',
            'branch_id' => 'sometimes|required|exists:companies,id',
            'status' => 'in:active,inactive',
        ]);

        // Map frontend fields to backend fields
        $updateData = [
            'first_name' => $validated['first_name'] ?? $employee->first_name,
            'last_name' => $validated['last_name'] ?? $employee->last_name,
            'email' => $validated['email'] ?? $employee->email,
            'mobile' => $validated['phone'] ?? $employee->mobile,
            'reporting_person' => array_key_exists('reporting_person', $validated)
                ? ($validated['reporting_person'] ?: null)
                : $employee->reporting_person,
            'address' => $validated['address'] ?? $employee->address,
            'date_of_birth' => $validated['date_of_birth'] ?? $employee->date_of_birth,
            'department_id' => $validated['department_id'] ?? $employee->department_id,
            'designation_id' => $validated['designation_id'] ?? $employee->designation_id,
            'branch_id' => $validated['branch_id'] ?? $employee->branch_id,
            'join_date' => $validated['hire_date'] ?? $employee->join_date,
            'basic_salary' => $validated['basic_salary'] ?? $employee->basic_salary,
            'commission' => $validated['commission'] ?? $employee->commission,
            'commission_base' => $validated['commission_base'] ?? $employee->commission_base,
            'overtime_payment_per_hour' => $validated['overtime_payment_per_hour'] ?? $employee->overtime_payment_per_hour,
            'deduction_late_hour' => $validated['deduction_late_hour'] ?? $employee->deduction_late_hour,
            'epf_employee_contribution' => $validated['epf_employee_contribution'] ?? $employee->epf_employee_contribution,
            'epf_employer_contribution' => $validated['epf_employer_contribution'] ?? $employee->epf_employer_contribution,
            'etf_employee_contribution' => $validated['etf_employee_contribution'] ?? $employee->etf_employee_contribution,
            'etf_employer_contribution' => $validated['etf_employer_contribution'] ?? $employee->etf_employer_contribution,
            'tin' => array_key_exists('tin', $validated) ? ($validated['tin'] ?: null) : $employee->tin,
            'tax_applicable' => array_key_exists('tax_applicable', $validated)
                ? (bool) $validated['tax_applicable']
                : (bool) $employee->tax_applicable,
            'tax_relief_eligible' => array_key_exists('tax_relief_eligible', $validated)
                ? (bool) $validated['tax_relief_eligible']
                : (bool) $employee->tax_relief_eligible,
            'apit_tax_amount' => array_key_exists('apit_tax_amount', $validated) ? ($validated['apit_tax_amount'] ?: null) : $employee->apit_tax_amount,
            'apit_tax_rate' => array_key_exists('apit_tax_rate', $validated) ? ($validated['apit_tax_rate'] ?: null) : $employee->apit_tax_rate,
            'status' => $validated['status'] ?? $employee->status,
        ];

        $employee->update($updateData);

        if (!empty($validated['password']) && $employee->user) {
            $employee->user->update(['password' => Hash::make($validated['password'])]);
        }

        // Update user's designation if changed
        if (isset($validated['designation_id']) && $employee->user) {
            $employee->user->update(['designation_id' => $validated['designation_id']]);
        }

        return response()->json($employee->load(['department', 'designation', 'branch']));
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(Employee $employee): JsonResponse
    {
        $request = request();
        if (!$this->canManageEmployees($request, 'delete_employees')) {
            return response()->json(['message' => 'You do not have permission to delete employees.'], 403);
        }

        DB::transaction(function () use ($employee): void {
            $employeeId = (int) $employee->id;

            // Remove or nullify dependent rows that don't have ON DELETE CASCADE.
            DB::table('attendance')->where('employee_id', $employeeId)->delete();
            DB::table('payrolls')->where('employee_id', $employeeId)->delete();
            DB::table('leaves')->where('employee_id', $employeeId)->delete();

            if (Schema::hasColumn('leaves', 'approved_by')) {
                DB::table('leaves')->where('approved_by', $employeeId)->update(['approved_by' => null]);
            }
            if (Schema::hasColumn('leaves', 'section_head_approved_by')) {
                DB::table('leaves')->where('section_head_approved_by', $employeeId)->update(['section_head_approved_by' => null]);
            }
            if (Schema::hasColumn('leaves', 'hr_approved_by')) {
                DB::table('leaves')->where('hr_approved_by', $employeeId)->update(['hr_approved_by' => null]);
            }

            // Prevent FK failures by removing the linked login account first.
            if ($employee->user) {
                $employee->user->delete();
            }

            // SoftDeletes model: forceDelete removes physical row from employees table.
            $employee->forceDelete();
        });

        return response()->json(['message' => 'Employee deleted successfully and removed from database.']);
    }
}
