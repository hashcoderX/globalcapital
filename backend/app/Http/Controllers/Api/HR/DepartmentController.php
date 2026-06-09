<?php

namespace App\Http\Controllers\Api\HR;

use App\Http\Controllers\Controller;
use App\Models\Company;
use App\Models\Department;
use Illuminate\Database\QueryException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DepartmentController extends Controller
{
    /**
     * @return array{tenant_id: int, branch_id: int}|JsonResponse
     */
    private function resolveCompanyContext(Request $request): array|JsonResponse
    {
        $company = null;
        $user = $request->user();
        $branchId = (int) ($user?->branch_id ?? 0);

        if ($branchId > 0) {
            $company = Company::query()->find($branchId);
        }

        if (!$company) {
            $company = Company::query()->orderBy('id')->first();
        }

        if (!$company) {
            return response()->json([
                'message' => 'Company profile is not set up yet. Open Company Settings and register your company before adding departments.',
                'code' => 'COMPANY_PROFILE_REQUIRED',
            ], 422);
        }

        if (!$this->isCompanyProfileComplete($company)) {
            return response()->json([
                'message' => 'Company profile is incomplete. Fill in company name, email, address, and phone in Company Settings before adding departments.',
                'code' => 'COMPANY_PROFILE_INCOMPLETE',
                'company_id' => (int) $company->id,
            ], 422);
        }

        $companyId = (int) $company->id;

        return [
            'tenant_id' => $companyId,
            'branch_id' => $companyId,
        ];
    }

    private function isCompanyProfileComplete(Company $company): bool
    {
        return trim((string) $company->name) !== ''
            && trim((string) $company->email) !== ''
            && trim((string) ($company->address ?? '')) !== ''
            && trim((string) ($company->phone ?? '')) !== '';
    }

    private function friendlyQueryExceptionMessage(QueryException $exception): string
    {
        $sqlMessage = strtolower($exception->getMessage());

        if (str_contains($sqlMessage, 'departments_tenant_id_name_unique') || str_contains($sqlMessage, 'duplicate entry')) {
            return 'A department with this name already exists for your company.';
        }

        if (str_contains($sqlMessage, 'foreign key constraint') || str_contains($sqlMessage, '1452')) {
            return 'Company profile is missing or invalid. Complete Company Settings before managing departments.';
        }

        return 'Unable to save department right now. Please check your company profile and try again.';
    }

    /**
     * Display a listing of the resource.
     */
    public function index(Request $request): JsonResponse
    {
        $tenantId = $request->input('tenant_id');
        $branchId = $request->input('branch_id');

        $query = Department::query();

        if ($tenantId) {
            $query->where('tenant_id', $tenantId);
        }

        if ($branchId) {
            $query->where('branch_id', $branchId);
        }

        $departments = $query->orderBy('name')->paginate(15);

        return response()->json($departments);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'is_active' => 'boolean',
        ]);

        $context = $this->resolveCompanyContext($request);
        if ($context instanceof JsonResponse) {
            return $context;
        }

        $duplicateExists = Department::query()
            ->where('tenant_id', $context['tenant_id'])
            ->whereRaw('LOWER(name) = ?', [strtolower(trim((string) $validated['name']))])
            ->exists();

        if ($duplicateExists) {
            return response()->json([
                'message' => 'A department with this name already exists for your company.',
                'code' => 'DEPARTMENT_DUPLICATE',
            ], 422);
        }

        try {
            $department = Department::create([
                'tenant_id' => $context['tenant_id'],
                'branch_id' => $context['branch_id'],
                'name' => trim((string) $validated['name']),
                'description' => $validated['description'] ?? null,
                'is_active' => $validated['is_active'] ?? true,
            ]);
        } catch (QueryException $exception) {
            return response()->json([
                'message' => $this->friendlyQueryExceptionMessage($exception),
                'code' => 'DEPARTMENT_SAVE_FAILED',
            ], 422);
        }

        return response()->json($department, 201);
    }

    /**
     * Display the specified resource.
     */
    public function show(Department $department): JsonResponse
    {
        return response()->json($department);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, Department $department): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'sometimes|required|string|max:255',
            'description' => 'nullable|string',
            'is_active' => 'boolean',
        ]);

        if (array_key_exists('name', $validated)) {
            $name = trim((string) $validated['name']);
            $duplicateExists = Department::query()
                ->where('tenant_id', $department->tenant_id)
                ->whereRaw('LOWER(name) = ?', [strtolower($name)])
                ->where('id', '!=', $department->id)
                ->exists();

            if ($duplicateExists) {
                return response()->json([
                    'message' => 'A department with this name already exists for your company.',
                    'code' => 'DEPARTMENT_DUPLICATE',
                ], 422);
            }

            $validated['name'] = $name;
        }

        try {
            $department->update($validated);
        } catch (QueryException $exception) {
            return response()->json([
                'message' => $this->friendlyQueryExceptionMessage($exception),
                'code' => 'DEPARTMENT_SAVE_FAILED',
            ], 422);
        }

        return response()->json($department);
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(Department $department): JsonResponse
    {
        $employeeCount = $department->employees()->count();
        if ($employeeCount > 0) {
            return response()->json([
                'message' => 'Cannot delete this department because employees are assigned to it.',
                'employees_count' => $employeeCount,
            ], 409);
        }

        try {
            $department->delete();
        } catch (QueryException $exception) {
            return response()->json([
                'message' => 'Cannot delete this department because it is linked to other records.',
            ], 409);
        }

        return response()->json(['message' => 'Department deleted successfully']);
    }
}
