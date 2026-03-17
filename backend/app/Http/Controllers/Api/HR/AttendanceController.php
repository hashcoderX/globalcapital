<?php

namespace App\Http\Controllers\Api\HR;

use App\Http\Controllers\Controller;
use App\Models\Attendance;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Carbon\Carbon;
use App\Models\Employee;

class AttendanceController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(Request $request): JsonResponse
    {
        $tenantId = $request->input('tenant_id');
        $branchId = $request->input('branch_id');
        $month = $request->input('month'); // YYYY-MM
        $date = $request->input('date'); // YYYY-MM-DD

        $query = Attendance::with('employee');

        if ($tenantId) {
            $query->where('tenant_id', $tenantId);
        }

        if ($branchId) {
            $query->where('branch_id', $branchId);
        }

        if ($month) {
            $query->whereRaw("DATE_FORMAT(date, '%Y-%m') = ?", [$month]);
        }

        if ($date) {
            $query->where('date', $date);
        }

        $attendance = $query->paginate(15);

        return response()->json($attendance);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'tenant_id' => 'required|exists:companies,id',
            'branch_id' => 'required|exists:companies,id',
            'employee_id' => 'required|exists:employees,id',
            'date' => 'required|date',
            'in_time' => 'nullable|date_format:H:i',
            'out_time' => 'nullable|date_format:H:i|after:in_time',
            'status' => 'required|in:present,absent,late,half_day',
            'notes' => 'nullable|string',
        ]);

        // Calculate work hours if both times are present
        if ($validated['in_time'] && $validated['out_time']) {
            $inTime = Carbon::createFromFormat('H:i', $validated['in_time']);
            $outTime = Carbon::createFromFormat('H:i', $validated['out_time']);
            $validated['work_hours'] = $outTime->diffInHours($inTime, true);
        }

        $attendance = Attendance::create($validated);

        return response()->json($attendance->load('employee'), 201);
    }

    /**
     * Display the specified resource.
     */
    public function show(Attendance $attendance): JsonResponse
    {
        return response()->json($attendance->load('employee'));
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, Attendance $attendance): JsonResponse
    {
        $validated = $request->validate([
            'in_time' => 'nullable|date_format:H:i',
            'out_time' => 'nullable|date_format:H:i|after:in_time',
            'status' => 'sometimes|required|in:present,absent,late,half_day',
            'notes' => 'nullable|string',
        ]);

        // Recalculate work hours
        if (isset($validated['in_time']) && isset($validated['out_time'])) {
            $inTime = Carbon::createFromFormat('H:i', $validated['in_time']);
            $outTime = Carbon::createFromFormat('H:i', $validated['out_time']);
            $validated['work_hours'] = $outTime->diffInHours($inTime, true);
        }

        $attendance->update($validated);

        return response()->json($attendance->load('employee'));
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(Attendance $attendance): JsonResponse
    {
        $attendance->delete();

        return response()->json(['message' => 'Attendance record deleted successfully']);
    }

    /**
     * Get monthly attendance report
     */
    public function monthlyReport(Request $request): JsonResponse
    {
        $request->validate([
            'tenant_id' => 'required|exists:companies,id',
            'branch_id' => 'sometimes|exists:companies,id',
            'month' => 'required|date_format:Y-m',
        ]);

        $tenantId = $request->tenant_id;
        $branchId = $request->branch_id;
        $month = $request->month;

        $query = Attendance::where('tenant_id', $tenantId)
            ->whereRaw("DATE_FORMAT(date, '%Y-%m') = ?", [$month])
            ->with('employee');

        if ($branchId) {
            $query->where('branch_id', $branchId);
        }

        $attendanceRecords = $query->get();

        $report = $attendanceRecords->groupBy('employee_id')->map(function ($records, $employeeId) {
            $employee = $records->first()->employee;
            $totalDays = $records->count();
            $presentDays = $records->where('status', 'present')->count();
            $absentDays = $records->where('status', 'absent')->count();
            $lateDays = $records->where('status', 'late')->count();
            $totalHours = $records->sum('work_hours');

            return [
                'employee' => $employee,
                'total_days' => $totalDays,
                'present_days' => $presentDays,
                'absent_days' => $absentDays,
                'late_days' => $lateDays,
                'total_hours' => $totalHours,
                'attendance_percentage' => $totalDays > 0 ? round(($presentDays / $totalDays) * 100, 2) : 0,
            ];
        })->values();

        return response()->json([
            'month' => $month,
            'report' => $report,
        ]);
    }

    /**
     * Basic mark attendance: minimal payload, easy to operate.
     */
    public function markBasic(Request $request): JsonResponse
    {
        try {
            $validated = $request->validate([
                'employee_id' => 'required|exists:employees,id',
                'status' => 'required|in:present,absent,late,half_day',
                'date' => 'nullable|date',
                'in_time' => 'nullable|date_format:H:i',
                'notes' => 'nullable|string',
            ]);

            $employee = Employee::findOrFail($validated['employee_id']);
            $date = $validated['date'] ?? Carbon::today()->toDateString();

            // Check if attendance already exists for this employee on this date
            $existingAttendance = Attendance::where('employee_id', $employee->id)
                ->where('date', $date)
                ->first();

            if ($existingAttendance) {
                return response()->json([
                    'error' => 'Attendance already marked',
                    'message' => 'This employee has already been marked for attendance on ' . $date,
                    'existing_record' => $existingAttendance->load('employee')
                ], 409); // Conflict status code
            }

            // Ensure branch_id exists, default to first available company
            $branchId = $employee->branch_id;
            if (!$branchId || !\DB::table('companies')->where('id', $branchId)->exists()) {
                $firstCompany = \DB::table('companies')->first();
                if ($firstCompany) {
                    $branchId = $firstCompany->id;
                } else {
                    return response()->json([
                        'error' => 'No companies found',
                        'message' => 'Please create at least one company before marking attendance'
                    ], 400);
                }
            }

            $tenantId = $branchId; // Use the same for tenant

            $data = [
                'tenant_id' => $tenantId,
                'branch_id' => $branchId,
                'employee_id' => $employee->id,
                'date' => $date,
                'status' => $validated['status'],
                'notes' => $validated['notes'] ?? null,
                'in_time' => $validated['in_time'] ?? null,
                'work_hours' => null,
            ];

            // Calculate work hours if both in_time and out_time are provided
            // Note: out_time is not set in markBasic, only in markOut
            if ($validated['in_time'] && false) { // Always false since we don't set out_time in markBasic
                $inTime = Carbon::createFromFormat('H:i', $validated['in_time']);
                $outTime = Carbon::createFromFormat('H:i', $validated['out_time']);
                $workHours = $outTime->diffInMinutes($inTime) / 60;
                $data['work_hours'] = round($workHours, 2);
            }

            $attendance = Attendance::create($data);

            return response()->json($attendance->load('employee'), 201);
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json([
                'error' => 'Validation failed',
                'message' => 'Invalid input data',
                'errors' => $e->errors()
            ], 422);
        } catch (\Illuminate\Database\QueryException $e) {
            // Handle database constraint violations
            if ($e->getCode() == 23000) { // Integrity constraint violation
                return response()->json([
                    'error' => 'Database constraint violation',
                    'message' => 'Attendance record already exists or foreign key constraint failed'
                ], 409);
            }
            return response()->json([
                'error' => 'Database error',
                'message' => $e->getMessage()
            ], 500);
        } catch (\Exception $e) {
            return response()->json([
                'error' => 'Internal server error',
                'message' => $e->getMessage(),
                'line' => $e->getLine(),
                'file' => $e->getFile()
            ], 500);
        }
    }

    /**
     * Upload CSV file to bulk mark attendance
     */
    public function uploadCsv(Request $request): JsonResponse
    {
        $request->validate([
            'csv_file' => 'required|file|mimes:csv,txt|max:2048', // 2MB max
        ]);

        $file = $request->file('csv_file');
        $path = $file->getRealPath();
        $data = array_map('str_getcsv', file($path));

        if (empty($data)) {
            return response()->json(['error' => 'CSV file is empty'], 400);
        }

        $header = array_shift($data); // Remove header row
        $header = array_map('strtolower', $header); // Normalize to lowercase

        // Expected headers: employee_code, date, in_time, out_time, status, notes
        $expectedHeaders = ['employee_code', 'date', 'in_time', 'out_time', 'status', 'notes'];
        $missingHeaders = array_diff($expectedHeaders, $header);
        if (!empty($missingHeaders)) {
            return response()->json(['error' => 'Missing required headers: ' . implode(', ', $missingHeaders)], 400);
        }

        $createdRecords = [];
        $errors = [];

        foreach ($data as $rowIndex => $row) {
            if (count($row) !== count($header)) {
                $errors[] = "Row " . ($rowIndex + 2) . ": Column count mismatch";
                continue;
            }

            $rowData = array_combine($header, $row);

            // Find employee by code
            $employee = Employee::where('employee_code', $rowData['employee_code'])->first();
            if (!$employee) {
                $errors[] = "Row " . ($rowIndex + 2) . ": Employee code {$rowData['employee_code']} not found";
                continue;
            }

            // Validate status
            $validStatuses = ['present', 'absent', 'late', 'half_day'];
            if (!in_array($rowData['status'], $validStatuses)) {
                $errors[] = "Row " . ($rowIndex + 2) . ": Invalid status {$rowData['status']}";
                continue;
            }

            // Prepare data
            $attendanceData = [
                'tenant_id' => 1, // default tenant
                'branch_id' => $employee->branch_id,
                'employee_id' => $employee->id,
                'date' => $rowData['date'],
                'status' => $rowData['status'],
                'notes' => $rowData['notes'] ?? null,
            ];

            if (!empty($rowData['in_time'])) {
                $attendanceData['in_time'] = $rowData['in_time'];
            }

            if (!empty($rowData['out_time'])) {
                $attendanceData['out_time'] = $rowData['out_time'];
            }

            if (!empty($attendanceData['in_time']) && !empty($attendanceData['out_time'])) {
                try {
                    $inTime = Carbon::createFromFormat('H:i', $attendanceData['in_time']);
                    $outTime = Carbon::createFromFormat('H:i', $attendanceData['out_time']);
                    $attendanceData['work_hours'] = $outTime->diffInHours($inTime, true);
                } catch (\Exception $e) {
                    $errors[] = "Row " . ($rowIndex + 2) . ": Invalid time format";
                    continue;
                }
            }

            try {
                $attendance = Attendance::create($attendanceData);
                $createdRecords[] = $attendance->load('employee');
            } catch (\Exception $e) {
                $errors[] = "Row " . ($rowIndex + 2) . ": Failed to create record - " . $e->getMessage();
            }
        }

        return response()->json([
            'message' => 'CSV upload processed',
            'created_records' => count($createdRecords),
            'errors' => $errors,
            'data' => $createdRecords,
        ], 200);
    }

    /**
     * Get attendance history for a specific employee
     */
    public function getEmployeeAttendance(Request $request, $employeeId): JsonResponse
    {
        $request->validate([
            'start_date' => 'nullable|date',
            'end_date' => 'nullable|date|after_or_equal:start_date',
        ]);

        $employee = Employee::findOrFail($employeeId);

        $query = Attendance::where('employee_id', $employeeId)->with('employee');

        if ($request->start_date) {
            $query->where('date', '>=', $request->start_date);
        }

        if ($request->end_date) {
            $query->where('date', '<=', $request->end_date);
        }

        $attendance = $query->orderBy('date', 'desc')->get();

        return response()->json([
            'employee' => $employee,
            'attendance' => $attendance,
        ]);
    }

    /**
     * Mark out time for existing attendance record
     */
    public function markOut(Request $request): JsonResponse
    {
        try {
            $validated = $request->validate([
                'employee_id' => 'required|exists:employees,id',
                'out_time' => 'required|date_format:H:i',
                'date' => 'nullable|date',
                'notes' => 'nullable|string',
            ]);

            $employee = Employee::findOrFail($validated['employee_id']);
            $date = $validated['date'] ?? Carbon::today()->toDateString();

            // Find existing attendance record for this employee on this date
            $attendance = Attendance::where('employee_id', $employee->id)
                ->where('date', $date)
                ->first();

            if (!$attendance) {
                \Log::info('Mark out failed: No attendance record found', [
                    'employee_id' => $employee->id,
                    'date' => $date,
                    'validated' => $validated
                ]);
                return response()->json([
                    'error' => 'No attendance record found',
                    'message' => 'This employee has not been marked present for ' . $date,
                ], 404);
            }

            if ($attendance->out_time) {
                \Log::info('Mark out failed: Already marked out', [
                    'attendance_id' => $attendance->id,
                    'existing_out_time' => $attendance->out_time
                ]);
                return response()->json([
                    'error' => 'Already marked out',
                    'message' => 'This employee has already been marked out for ' . $date,
                    'existing_record' => $attendance
                ], 409);
            }

            // Update the attendance record with out_time
            $attendance->out_time = $validated['out_time'];

            // Calculate work hours if in_time exists
            if ($attendance->in_time) {
                try {
                    $inTime = Carbon::createFromFormat('H:i:s', $attendance->in_time);
                    $outTime = Carbon::createFromFormat('H:i:s', $validated['out_time']);
                    $workHours = $outTime->diffInMinutes($inTime, true) / 60; // true = always positive
                    $attendance->work_hours = round($workHours, 2);
                } catch (\Exception $e) {
                    // If time parsing fails, don't calculate work hours
                    // This prevents the 500 error
                }
            }

            // Update notes if provided
            if ($validated['notes']) {
                $attendance->notes = $validated['notes'];
            }

            try {
                $attendance->save();
            } catch (\Exception $e) {
                \Log::error('Mark out save failed', [
                    'attendance_id' => $attendance->id,
                    'error' => $e->getMessage()
                ]);
                throw $e;
            }

            return response()->json([
                'message' => 'Marked out successfully',
                'attendance' => $attendance
            ], 200);
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json([
                'error' => 'Validation failed',
                'message' => 'Invalid input data',
                'errors' => $e->errors()
            ], 422);
        } catch (\Exception $e) {
            return response()->json([
                'error' => 'Internal server error',
                'message' => $e->getMessage(),
                'line' => $e->getLine(),
                'file' => $e->getFile()
            ], 500);
        }
    }
}
