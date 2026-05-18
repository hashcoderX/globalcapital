<?php

namespace App\Http\Controllers\Api\HR;

use App\Http\Controllers\Controller;
use App\Models\Designation;
use App\Models\Employee;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;

class DesignationController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(Request $request): JsonResponse
    {
        $tenantId = $request->input('tenant_id');
        $branchId = $request->input('branch_id');
        $perPage = (int) $request->query('per_page', 15);
        if ($perPage < 1) { $perPage = 1; }
        if ($perPage > 100) { $perPage = 100; }

        $query = Designation::query();

        if ($tenantId) {
            $query->where('tenant_id', $tenantId);
        }

        if ($branchId) {
            $query->where('branch_id', $branchId);
        }

        $designations = $query->paginate($perPage);

        return response()->json($designations);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'salary_range_min' => 'nullable|numeric|min:0',
            'salary_range_max' => 'nullable|numeric|min:0',
            'is_active' => 'boolean',
        ]);

        // Set default values for required fields
        $designationData = [
            'tenant_id' => 1, // Default tenant
            'branch_id' => 1, // Default branch
            'name' => $validated['name'],
            'description' => $validated['description'] ?? null,
            'salary_range_min' => $validated['salary_range_min'] ?? null,
            'salary_range_max' => $validated['salary_range_max'] ?? null,
            'is_active' => $validated['is_active'] ?? true,
        ];

        $designation = Designation::create($designationData);

        return response()->json($designation, 201);
    }

    /**
     * Display the specified resource.
     */
    public function show(Designation $designation): JsonResponse
    {
        return response()->json($designation);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, Designation $designation): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'sometimes|required|string|max:255',
            'description' => 'nullable|string',
            'salary_range_min' => 'nullable|numeric|min:0',
            'salary_range_max' => 'nullable|numeric|min:0',
            'is_active' => 'boolean',
        ]);

        $designation->update($validated);

        return response()->json($designation);
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(Designation $designation): JsonResponse
    {
        $tenantId = (int) $designation->tenant_id;
        $branchId = (int) $designation->branch_id;

        $employeesCount = Employee::where('designation_id', $designation->id)->count();
        $usersCount = User::where('designation_id', $designation->id)->count();

        try {
            DB::transaction(function () use ($designation, $tenantId, $branchId, $employeesCount, $usersCount): void {
            if ($employeesCount > 0 || $usersCount > 0) {
                $fallbackDesignation = Designation::firstOrCreate(
                    [
                        'tenant_id' => $tenantId,
                        'name' => 'Unassigned Designation',
                    ],
                    [
                        'branch_id' => $branchId,
                        'description' => 'Auto-generated fallback designation for reassignment during delete.',
                        'is_active' => true,
                    ]
                );

                if ((int) $fallbackDesignation->id === (int) $designation->id) {
                    $alternative = Designation::where('tenant_id', $tenantId)
                        ->where('id', '!=', $designation->id)
                        ->orderBy('id')
                        ->first();

                    if (!$alternative) {
                        throw new \RuntimeException('Cannot delete this designation because it is currently assigned and no alternative designation exists.');
                    }

                    $fallbackDesignation = $alternative;
                }

                Employee::where('designation_id', $designation->id)
                    ->update(['designation_id' => $fallbackDesignation->id]);

                User::where('designation_id', $designation->id)
                    ->update(['designation_id' => $fallbackDesignation->id]);
            }

            $designation->delete();
            });
        } catch (\RuntimeException $exception) {
            return response()->json([
                'message' => $exception->getMessage(),
            ], 409);
        }

        $message = 'Designation deleted successfully.';
        if ($employeesCount > 0 || $usersCount > 0) {
            $message .= ' Linked records were reassigned automatically.';
        }

        return response()->json(['message' => $message]);
    }
}
