<?php

namespace App\Http\Controllers\Api\HR;

use App\Http\Controllers\Controller;
use App\Models\Employee;
use App\Models\User;
use App\Http\Requests\StoreEmployeeRequest;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Hash;

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
            'employee_type' => 'full_time', // Default type
            'status' => $validated['status'] ?? 'active',
        ];

        // Generate employee code
        $lastEmployee = Employee::orderBy('id', 'desc')->first();
        $nextNumber = $lastEmployee ? intval(substr($lastEmployee->employee_code, -4)) + 1 : 1;
        $employeeData['employee_code'] = 'EMP' . str_pad($nextNumber, 4, '0', STR_PAD_LEFT);

        $employee = Employee::create($employeeData);

        // Create user account for the employee
        User::create([
            'name' => $validated['first_name'] . ' ' . $validated['last_name'],
            'email' => $validated['email'],
            'password' => Hash::make($validated['password']),
            'employee_id' => $employee->id,
            'branch_id' => $validated['branch_id'],
            'designation_id' => $validated['designation_id'],
        ]);

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
            'phone' => 'nullable|string|max:20',
            'address' => 'nullable|string',
            'date_of_birth' => 'nullable|date|before:today',
            'hire_date' => 'sometimes|required|date',
            'basic_salary' => 'sometimes|required|numeric|min:0',
            'commission' => 'nullable|numeric|min:0|max:100',
            'commission_base' => 'nullable|in:company_profit,own_business',
            'overtime_payment_per_hour' => 'nullable|numeric|min:0',
            'deduction_late_hour' => 'nullable|numeric|min:0',
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
            'status' => $validated['status'] ?? $employee->status,
        ];

        $employee->update($updateData);

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

        // Prevent foreign key failures by removing linked login account first.
        if ($employee->user) {
            $employee->user->delete();
        }

        $employee->delete();

        return response()->json(['message' => 'Employee deleted successfully']);
    }
}
