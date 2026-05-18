<?php

namespace App\Http\Controllers;

use App\Models\Role;
use App\Models\Permission;
use App\Models\Designation;
use App\Models\Company;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;

class RoleController extends Controller
{
    public function index(): JsonResponse
    {
        $roles = Role::with('permissions')->get();
        return response()->json($roles);
    }

    public function store(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255|unique:roles',
            'description' => 'nullable|string|max:500',
            'permissions' => 'array',
            'permissions.*' => 'exists:permissions,id'
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $role = DB::transaction(function () use ($request) {
            $role = Role::create([
                'name' => $request->name,
                'description' => $request->description,
            ]);

            if ($request->has('permissions')) {
                $role->permissions()->attach($request->permissions);
            }

            // Keep designation list aligned with roles: create designation if it does not exist.
            $defaultCompanyId = (int) (Company::query()->orderBy('id')->value('id') ?? 1);
            $requestedBranchId = (int) ($request->user()?->branch_id ?? 0);
            $branchId = Company::query()->whereKey($requestedBranchId)->exists()
                ? $requestedBranchId
                : $defaultCompanyId;

            Designation::firstOrCreate(
                [
                    'tenant_id' => $defaultCompanyId,
                    'name' => (string) $request->name,
                ],
                [
                    'branch_id' => $branchId,
                    'description' => (string) ($request->description ?? ''),
                    'is_active' => true,
                ]
            );

            return $role;
        });

        return response()->json($role->load('permissions'), 201);
    }

    public function show(Role $role): JsonResponse
    {
        return response()->json($role->load('permissions'));
    }

    public function update(Request $request, Role $role): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255|unique:roles,name,' . $role->id,
            'description' => 'nullable|string|max:500',
            'permissions' => 'array',
            'permissions.*' => 'exists:permissions,id'
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $role->update([
            'name' => $request->name,
            'description' => $request->description,
        ]);

        if ($request->has('permissions')) {
            $role->permissions()->sync($request->permissions);
        }

        return response()->json($role->load('permissions'));
    }

    public function destroy(Request $request, Role $role): JsonResponse
    {
        $force = $request->boolean('force');

        // Check if role is assigned to any users
        if (!$force && $role->users()->exists()) {
            return response()->json([
                'message' => 'Cannot delete role that is assigned to users',
                'assigned_users' => $role->users()->count(),
            ], 409);
        }

        DB::transaction(function () use ($role): void {
            $role->users()->detach();
            $role->permissions()->detach();
            $role->userRoles()->delete();
            $role->rolePermissions()->delete();
            $role->delete();
        });

        return response()->json(['message' => 'Role deleted successfully']);
    }

    public function assignToUser(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'user_id' => 'required|exists:users,id',
            'role_id' => 'required|exists:roles,id'
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $user = \App\Models\User::find($request->user_id);
        $user->roles()->syncWithoutDetaching([
            $request->role_id => [
                'assigned_by' => Auth::id() ?? $user->id,
                'assigned_at' => now(),
            ],
        ]);

        return response()->json(['message' => 'Role assigned to user successfully']);
    }

    public function removeFromUser(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'user_id' => 'required|exists:users,id',
            'role_id' => 'required|exists:roles,id'
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $user = \App\Models\User::find($request->user_id);
        $user->roles()->detach($request->role_id);

        return response()->json(['message' => 'Role removed from user successfully']);
    }

    public function getUserRoles($userId): JsonResponse
    {
        $user = \App\Models\User::with('roles.permissions')->findOrFail($userId);
        return response()->json($user->roles);
    }

    public function updatePermissions(Request $request, Role $role): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'permissions' => 'array',
            'permissions.*' => 'exists:permissions,id'
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $role->permissions()->sync($request->permissions);

        return response()->json($role->load('permissions'));
    }
}