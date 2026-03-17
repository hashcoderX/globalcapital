<?php

namespace App\Http\Controllers\Api\HR;

use App\Http\Controllers\Controller;
use App\Models\Leave;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Carbon\Carbon;

class LeaveController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(Request $request): JsonResponse
    {
        $tenantId = $request->input('tenant_id');
        $branchId = $request->input('branch_id');
        $employeeId = $request->input('employee_id');
        $status = $request->input('status');

        $query = Leave::with(['employee', 'approver']);

        if ($tenantId) {
            $query->where('tenant_id', $tenantId);
        }

        if ($branchId) {
            $query->where('branch_id', $branchId);
        }

        if ($employeeId) {
            $query->where('employee_id', $employeeId);
        }

        if ($status) {
            $query->where('status', $status);
        }

        $leaves = $query->paginate(15);

        return response()->json($leaves);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'employee_id' => 'required|exists:employees,id',
            'leave_type' => 'required|exists:leave_types,code',
            'start_date' => 'required|date|after_or_equal:today',
            'end_date' => 'required|date|after_or_equal:start_date',
            'reason' => 'required|string',
        ]);

        // Get tenant_id and branch_id from authenticated user
        $user = $request->user();
        $validated['tenant_id'] = 1; // Default tenant for now
        $validated['branch_id'] = $user->branch_id ?? 1; // Default branch if not set

        // Calculate days requested
        $startDate = Carbon::parse($validated['start_date']);
        $endDate = Carbon::parse($validated['end_date']);
        $validated['days_requested'] = $startDate->diffInDays($endDate) + 1;

        $leave = Leave::create($validated);

        return response()->json($leave->load(['employee', 'approver']), 201);
    }

    /**
     * Display the specified resource.
     */
    public function show(Leave $leave): JsonResponse
    {
        return response()->json($leave->load(['employee', 'approver']));
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, Leave $leave): JsonResponse
    {
        // Only allow status updates for approval/rejection
        $validated = $request->validate([
            'status' => 'required|in:approved,rejected',
            'approver_notes' => 'nullable|string',
            'approved_by' => 'required|exists:employees,id',
        ]);

        $validated['approved_at'] = now();

        $leave->update($validated);

        return response()->json($leave->load(['employee', 'approver', 'sectionHeadApprover', 'hrApprover']));
    }

    /**
     * Section Head Approval
     */
    public function sectionHeadApprove(Request $request, Leave $leave): JsonResponse
    {
        $validated = $request->validate([
            'approved' => 'required|boolean',
            'notes' => 'nullable|string',
            'approved_by' => 'required|exists:employees,id',
        ]);

        $updateData = [
            'section_head_approved' => $validated['approved'],
            'section_head_approved_by' => $validated['approved_by'],
            'section_head_approved_at' => now(),
            'section_head_notes' => $validated['notes'] ?? null,
        ];

        if ($validated['approved']) {
            $updateData['status'] = 'section_head_approved';
        } else {
            $updateData['status'] = 'rejected';
        }

        $leave->update($updateData);

        return response()->json($leave->load(['employee', 'sectionHeadApprover']));
    }

    /**
     * HR Approval
     */
    public function hrApprove(Request $request, Leave $leave): JsonResponse
    {
        $validated = $request->validate([
            'approved' => 'required|boolean',
            'notes' => 'nullable|string',
            'approved_by' => 'required|exists:employees,id',
        ]);

        $updateData = [
            'hr_approved' => $validated['approved'],
            'hr_approved_by' => $validated['approved_by'],
            'hr_approved_at' => now(),
            'hr_notes' => $validated['notes'] ?? null,
        ];

        if ($validated['approved']) {
            $updateData['status'] = 'approved';
            $updateData['approved_by'] = $validated['approved_by'];
            $updateData['approved_at'] = now();
            $updateData['approver_notes'] = $validated['notes'] ?? null;
        } else {
            $updateData['status'] = 'rejected';
        }

        $leave->update($updateData);

        return response()->json($leave->load(['employee', 'hrApprover']));
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(Leave $leave): JsonResponse
    {
        $leave->delete();

        return response()->json(['message' => 'Leave request deleted successfully']);
    }

    /**
     * Get leave balance for an employee
     */
    public function balance(Request $request): JsonResponse
    {
        $request->validate([
            'employee_id' => 'required|exists:employees,id',
            'year' => 'nullable|integer|min:2020|max:' . (date('Y') + 1),
        ]);

        $employeeId = $request->employee_id;
        $year = $request->year ?? date('Y');

        // This is a simplified calculation - in real app, you'd have leave policies
        $annualLeave = 25; // days per year
        $casualLeave = 10; // days per year
        $medicalLeave = 15; // days per year

        $usedAnnual = Leave::where('employee_id', $employeeId)
            ->where('leave_type', 'annual')
            ->where('status', 'approved')
            ->whereYear('start_date', $year)
            ->sum('days_requested');

        $usedCasual = Leave::where('employee_id', $employeeId)
            ->where('leave_type', 'casual')
            ->where('status', 'approved')
            ->whereYear('start_date', $year)
            ->sum('days_requested');

        $usedMedical = Leave::where('employee_id', $employeeId)
            ->where('leave_type', 'medical')
            ->where('status', 'approved')
            ->whereYear('start_date', $year)
            ->sum('days_requested');

        return response()->json([
            'employee_id' => $employeeId,
            'year' => $year,
            'annual' => [
                'total' => $annualLeave,
                'used' => $usedAnnual,
                'remaining' => $annualLeave - $usedAnnual,
            ],
            'casual' => [
                'total' => $casualLeave,
                'used' => $usedCasual,
                'remaining' => $casualLeave - $usedCasual,
            ],
            'medical' => [
                'total' => $medicalLeave,
                'used' => $usedMedical,
                'remaining' => $medicalLeave - $usedMedical,
            ],
        ]);
    }
}
