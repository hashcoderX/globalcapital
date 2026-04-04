<?php

namespace App\Http\Controllers\Api\Microfinance;

use App\Http\Controllers\Controller;
use App\Models\MicrofinanceCenter;
use Illuminate\Http\Request;

class CenterController extends Controller
{
    public function index()
    {
        return response()->json(
            MicrofinanceCenter::with('route:id,name,code')
                ->orderBy('id', 'desc')
                ->get()
        );
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'mf_route_id' => 'required|exists:mf_routes,id',
            'name' => 'required|string|max:255',
            'code' => 'required|string|max:50|unique:mf_centers,code',
            'meeting_day' => 'nullable|string|max:50',
            'is_active' => 'nullable|boolean',
        ]);

        $center = MicrofinanceCenter::create([
            'mf_route_id' => $validated['mf_route_id'],
            'name' => $validated['name'],
            'code' => $validated['code'],
            'meeting_day' => $validated['meeting_day'] ?? null,
            'is_active' => $validated['is_active'] ?? true,
        ])->load('route:id,name,code');

        return response()->json($center, 201);
    }

    public function show(MicrofinanceCenter $center)
    {
        return response()->json($center->load('route:id,name,code'));
    }

    public function update(Request $request, MicrofinanceCenter $center)
    {
        $validated = $request->validate([
            'mf_route_id' => 'required|exists:mf_routes,id',
            'name' => 'required|string|max:255',
            'code' => 'required|string|max:50|unique:mf_centers,code,' . $center->id,
            'meeting_day' => 'nullable|string|max:50',
            'is_active' => 'nullable|boolean',
        ]);

        $center->update([
            'mf_route_id' => $validated['mf_route_id'],
            'name' => $validated['name'],
            'code' => $validated['code'],
            'meeting_day' => $validated['meeting_day'] ?? null,
            'is_active' => $validated['is_active'] ?? true,
        ]);

        return response()->json($center->load('route:id,name,code'));
    }

    public function destroy(MicrofinanceCenter $center)
    {
        $center->delete();

        return response()->json(['message' => 'Center deleted successfully']);
    }
}
