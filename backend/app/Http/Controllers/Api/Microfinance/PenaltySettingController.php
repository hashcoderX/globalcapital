<?php

namespace App\Http\Controllers\Api\Microfinance;

use App\Http\Controllers\Controller;
use App\Models\MicrofinancePenaltySetting;
use Illuminate\Http\Request;

class PenaltySettingController extends Controller
{
    public function show()
    {
        return response()->json(MicrofinancePenaltySetting::query()->first());
    }

    public function store(Request $request)
    {
        if (MicrofinancePenaltySetting::query()->exists()) {
            return response()->json([
                'message' => 'Initial penalty setting already exists. Use update instead.',
            ], 422);
        }

        $validated = $request->validate([
            'penalty_rate' => 'required|numeric|min:0|max:100',
            'is_active' => 'nullable|boolean',
        ]);

        $setting = MicrofinancePenaltySetting::create([
            'penalty_rate' => $validated['penalty_rate'],
            'is_active' => $validated['is_active'] ?? true,
        ]);

        return response()->json($setting, 201);
    }

    public function update(Request $request, MicrofinancePenaltySetting $penaltySetting)
    {
        $validated = $request->validate([
            'penalty_rate' => 'required|numeric|min:0|max:100',
            'is_active' => 'nullable|boolean',
        ]);

        $penaltySetting->update([
            'penalty_rate' => $validated['penalty_rate'],
            'is_active' => $validated['is_active'] ?? true,
        ]);

        return response()->json($penaltySetting);
    }
}
