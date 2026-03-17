<?php

namespace App\Http\Controllers;

use App\Models\Permission;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Validator;

class PermissionController extends Controller
{
    public function index(): JsonResponse
    {
        $permissions = Permission::all();
        return response()->json($permissions);
    }

    public function store(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255|unique:permissions',
            'description' => 'nullable|string|max:500',
            'module' => 'nullable|string|max:255'
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $permission = Permission::create($request->all());
        return response()->json($permission, 201);
    }

    public function show(Permission $permission): JsonResponse
    {
        return response()->json($permission);
    }

    public function update(Request $request, Permission $permission): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255|unique:permissions,name,' . $permission->id,
            'description' => 'nullable|string|max:500',
            'module' => 'nullable|string|max:255'
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $permission->update($request->all());
        return response()->json($permission);
    }

    public function destroy(Permission $permission): JsonResponse
    {
        // Check if permission is assigned to any roles
        if ($permission->roles()->exists()) {
            return response()->json(['message' => 'Cannot delete permission that is assigned to roles'], 409);
        }

        $permission->delete();
        return response()->json(['message' => 'Permission deleted successfully']);
    }
}