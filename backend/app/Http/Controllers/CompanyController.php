<?php

namespace App\Http\Controllers;

use App\Models\Company;
use App\Models\Employee;
use App\Models\Candidate;
use App\Models\Department;
use App\Models\Designation;
use Illuminate\Http\Request;

class CompanyController extends Controller
{
    public function index()
    {
        $companies = Company::all();
        return response()->json($companies);
    }

    public function show(Company $company)
    {
        return response()->json($company);
    }

    public function store(Request $request)
    {
        $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|string|email|max:255|unique:companies',
            'address' => 'nullable|string',
            'phone' => 'nullable|string|max:20',
            'website' => 'nullable|url',
            'country' => 'nullable|string|max:100',
            'currency' => 'nullable|string|max:10',
        ]);

        $company = Company::create($request->all());

        return response()->json($company, 201);
    }

    public function update(Request $request, Company $company)
    {
        $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|string|email|max:255|unique:companies,email,' . $company->id,
            'address' => 'nullable|string',
            'phone' => 'nullable|string|max:20',
            'website' => 'nullable|url',
            'country' => 'nullable|string|max:100',
            'currency' => 'nullable|string|max:10',
        ]);

        $company->update($request->all());

        return response()->json($company);
    }

    public function destroy(Company $company)
    {
        // Check if company is referenced in other tables
        $hasEmployees = Employee::where('tenant_id', $company->id)->orWhere('branch_id', $company->id)->exists();
        $hasCandidates = Candidate::where('tenant_id', $company->id)->orWhere('branch_id', $company->id)->exists();
        $hasDepartments = Department::where('tenant_id', $company->id)->orWhere('branch_id', $company->id)->exists();
        $hasDesignations = Designation::where('tenant_id', $company->id)->orWhere('branch_id', $company->id)->exists();

        if ($hasEmployees || $hasCandidates || $hasDepartments || $hasDesignations) {
            return response()->json(['error' => 'Cannot delete company because it is referenced by other records.'], 422);
        }

        $company->delete();
        return response()->json(['message' => 'Company deleted successfully']);
    }
}
