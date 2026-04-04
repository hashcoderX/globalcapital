<?php

namespace App\Http\Controllers\Api\Microfinance;

use App\Http\Controllers\Controller;
use App\Models\MicrofinanceRoute;
use Illuminate\Http\Request;

class RouteController extends Controller
{
    public function index()
    {
        return response()->json(MicrofinanceRoute::orderBy('id', 'desc')->get());
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'code' => 'required|string|max:50|unique:mf_routes,code',
            'is_active' => 'nullable|boolean',
        ]);

        $route = MicrofinanceRoute::create([
            'name' => $validated['name'],
            'code' => $validated['code'],
            'is_active' => $validated['is_active'] ?? true,
        ]);

        return response()->json($route, 201);
    }

    public function show(MicrofinanceRoute $route)
    {
        return response()->json($route);
    }

    public function update(Request $request, MicrofinanceRoute $route)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'code' => 'required|string|max:50|unique:mf_routes,code,' . $route->id,
            'is_active' => 'nullable|boolean',
        ]);

        $route->update([
            'name' => $validated['name'],
            'code' => $validated['code'],
            'is_active' => $validated['is_active'] ?? true,
        ]);

        return response()->json($route);
    }

    public function destroy(MicrofinanceRoute $route)
    {
        $route->delete();

        return response()->json(['message' => 'Route deleted successfully']);
    }
}
