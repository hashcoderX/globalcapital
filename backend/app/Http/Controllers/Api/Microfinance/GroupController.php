<?php

namespace App\Http\Controllers\Api\Microfinance;

use App\Http\Controllers\Controller;
use App\Models\MicrofinanceGroup;
use Illuminate\Http\Request;

class GroupController extends Controller
{
    public function index()
    {
        return response()->json(
            MicrofinanceGroup::with('route:id,name,code', 'center:id,name,code,mf_route_id')
                ->orderBy('id', 'desc')
                ->get()
        );
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'mf_route_id' => 'required|exists:mf_routes,id',
            'mf_center_id' => 'required|exists:mf_centers,id',
            'name' => 'required|string|max:255',
            'code' => 'required|string|max:50|unique:mf_groups,code',
            'is_active' => 'nullable|boolean',
        ]);

        $group = MicrofinanceGroup::create([
            'mf_route_id' => $validated['mf_route_id'],
            'mf_center_id' => $validated['mf_center_id'],
            'name' => $validated['name'],
            'code' => $validated['code'],
            'is_active' => $validated['is_active'] ?? true,
        ])->load('route:id,name,code', 'center:id,name,code,mf_route_id');

        return response()->json($group, 201);
    }

    public function show(MicrofinanceGroup $group)
    {
        return response()->json($group->load('route:id,name,code', 'center:id,name,code,mf_route_id'));
    }

    public function update(Request $request, MicrofinanceGroup $group)
    {
        $validated = $request->validate([
            'mf_route_id' => 'required|exists:mf_routes,id',
            'mf_center_id' => 'required|exists:mf_centers,id',
            'name' => 'required|string|max:255',
            'code' => 'required|string|max:50|unique:mf_groups,code,' . $group->id,
            'is_active' => 'nullable|boolean',
        ]);

        $group->update([
            'mf_route_id' => $validated['mf_route_id'],
            'mf_center_id' => $validated['mf_center_id'],
            'name' => $validated['name'],
            'code' => $validated['code'],
            'is_active' => $validated['is_active'] ?? true,
        ]);

        return response()->json($group->load('route:id,name,code', 'center:id,name,code,mf_route_id'));
    }

    public function destroy(MicrofinanceGroup $group)
    {
        $group->delete();

        return response()->json(['message' => 'Group deleted successfully']);
    }
}
