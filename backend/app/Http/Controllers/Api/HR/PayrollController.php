<?php

namespace App\Http\Controllers\Api\HR;

use App\Http\Controllers\Controller;
use App\Models\Payroll;
use App\Models\Employee;
use App\Models\Attendance;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Carbon\Carbon;
use PDF; // Assuming you have a PDF package

class PayrollController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(Request $request): JsonResponse
    {
        $tenantId = $request->input('tenant_id');
        $branchId = $request->input('branch_id');
        $monthYear = $request->input('month_year');

        $query = Payroll::with('employee');

        if ($tenantId) {
            $query->where('tenant_id', $tenantId);
        }

        if ($branchId) {
            $query->where('branch_id', $branchId);
        }

        if ($monthYear) {
            $query->where('month_year', $monthYear);
        }

        $payrolls = $query->paginate(15);

        return response()->json($payrolls);
    }

    /**
     * Generate payroll for a specific month
     */
    public function generate(Request $request): JsonResponse
    {
        $request->validate([
            'branch_id' => 'nullable|exists:companies,id',
            'month_year' => 'required|date_format:Y-m',
        ]);

        $user = $request->user();
        $tenantId = 1; // Default tenant for now
        $branchId = $request->branch_id ?? $user->branch_id;
        $monthYear = $request->month_year;

        // Get all active employees for the branch
        $employees = Employee::where('tenant_id', $tenantId)
            ->where('branch_id', $branchId)
            ->where('status', 'active')
            ->get();

        $generatedPayrolls = [];

        foreach ($employees as $employee) {
            // Check if payroll already exists
            $existingPayroll = Payroll::where('employee_id', $employee->id)
                ->where('month_year', $monthYear)
                ->first();

            if ($existingPayroll) {
                continue; // Skip if already generated
            }

            // Get attendance for the month
            $attendance = Attendance::where('employee_id', $employee->id)
                ->whereRaw("DATE_FORMAT(date, '%Y-%m') = ?", [$monthYear])
                ->get();

            $workingDays = $attendance->count();
            $presentDays = $attendance->where('status', 'present')->count();
            $absentDays = $attendance->where('status', 'absent')->count();

            // Calculate salary based on attendance
            $dailyRate = $employee->basic_salary / 30; // Assuming 30 working days
            $earnedSalary = $dailyRate * $presentDays;

            // Simple allowances and deductions (can be expanded)
            $allowances = 0; // Add logic for allowances
            $deductions = 0; // Add logic for deductions

            $netSalary = $earnedSalary + $allowances - $deductions;

            $payroll = Payroll::create([
                'tenant_id' => $tenantId,
                'branch_id' => $branchId,
                'employee_id' => $employee->id,
                'month_year' => $monthYear,
                'basic_salary' => $employee->basic_salary,
                'allowances' => $allowances,
                'deductions' => $deductions,
                'net_salary' => $netSalary,
                'working_days' => $workingDays,
                'present_days' => $presentDays,
                'absent_days' => $absentDays,
                'overtime_hours' => 0, // Add overtime calculation
                'overtime_amount' => 0,
                'status' => 'pending',
            ]);

            $generatedPayrolls[] = $payroll->load('employee');
        }

        return response()->json([
            'message' => 'Payroll generated successfully',
            'payrolls' => $generatedPayrolls,
        ]);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'employee_id' => 'required|exists:employees,id',
            'month_year' => 'required|date_format:Y-m',
            'basic_salary' => 'required|numeric|min:0',
            'allowances' => 'numeric|min:0',
            'deductions' => 'numeric|min:0',
            'net_salary' => 'required|numeric|min:0',
            'working_days' => 'required|integer|min:0',
            'present_days' => 'required|integer|min:0',
            'absent_days' => 'required|integer|min:0',
            'overtime_hours' => 'numeric|min:0',
            'overtime_amount' => 'numeric|min:0',
            'status' => 'in:pending,processed,paid',
        ]);

        // Get tenant_id and branch_id from authenticated user
        $user = $request->user();
        $validated['tenant_id'] = 1; // Default tenant for now
        $validated['branch_id'] = $user->branch_id;

        $payroll = Payroll::create($validated);

        return response()->json($payroll->load('employee'), 201);
    }

    /**
     * Display the specified resource.
     */
    public function show(Payroll $payroll): JsonResponse
    {
        return response()->json($payroll->load('employee'));
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, Payroll $payroll): JsonResponse
    {
        $validated = $request->validate([
            'allowances' => 'numeric|min:0',
            'deductions' => 'numeric|min:0',
            'net_salary' => 'numeric|min:0',
            'status' => 'in:pending,processed,paid',
            'processed_at' => 'nullable|date',
        ]);

        $payroll->update($validated);

        return response()->json($payroll->load('employee'));
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(Payroll $payroll): JsonResponse
    {
        $payroll->delete();

        return response()->json(['message' => 'Payroll record deleted successfully']);
    }

    /**
     * Generate PDF payslip
     */
    public function payslip(Payroll $payroll): \Illuminate\Http\Response
    {
        // This would require a PDF package like dompdf or tcpdf
        // For now, return JSON
        return response()->json([
            'payslip' => $payroll->load('employee'),
            'message' => 'PDF generation would be implemented here',
        ]);
    }
}
