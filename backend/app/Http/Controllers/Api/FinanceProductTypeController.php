<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\FinanceProductType;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class FinanceProductTypeController extends Controller
{
    public function index(): JsonResponse
    {
        $types = FinanceProductType::query()
            ->where('is_active', true)
            ->orderBy('name')
            ->get();

        return response()->json([
            'data' => $types,
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $user = $request->user();

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:100', 'unique:finance_product_types,name'],
            'description' => ['nullable', 'string', 'max:255'],
            'interest_rate' => ['required', 'numeric', 'min:0', 'max:100'],
            'interest_type' => ['required', 'in:fixed,reducing'],
            'tenure_months' => ['required', 'integer', 'min:1', 'max:600'],
            'installment_frequency' => ['required', 'in:daily,weekly,monthly,quarterly,yearly'],
        ]);

        $baseCode = strtoupper(Str::slug($validated['name'], '-'));
        $code = $baseCode;
        $counter = 2;
        while (FinanceProductType::where('code', $code)->exists()) {
            $code = $baseCode . '-' . $counter;
            $counter++;
        }

        $type = FinanceProductType::create([
            'name' => $validated['name'],
            'code' => $code,
            'description' => $validated['description'] ?? null,
            'interest_rate' => $validated['interest_rate'],
            'interest_type' => $validated['interest_type'],
            'tenure_months' => $validated['tenure_months'],
            'installment_frequency' => $validated['installment_frequency'],
            'is_active' => true,
            'created_by' => $user?->id,
        ]);

        return response()->json($type, 201);
    }
}
