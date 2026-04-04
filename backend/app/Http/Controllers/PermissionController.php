<?php

namespace App\Http\Controllers;

use App\Models\Permission;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Str;

class PermissionController extends Controller
{
    private function normalizeSegment(string $segment): string
    {
        $normalized = strtolower(trim($segment));

        if ($normalized === 'companies') {
            return 'branches';
        }

        return $segment;
    }

    private function actionFromRoute(array $methods, string $uri): string
    {
        $normalizedUri = strtolower($uri);

        if (Str::contains($normalizedUri, 'download')) {
            return 'download';
        }

        if (Str::contains($normalizedUri, ['approve', 'assign', 'mark', 'generate', 'upload', 'store', 'create'])) {
            return 'create';
        }

        if (Str::contains($normalizedUri, ['update', 'edit', 'status', 'lifecycle', 'adjust'])) {
            return 'edit';
        }

        if (Str::contains($normalizedUri, ['delete', 'remove', 'destroy'])) {
            return 'delete';
        }

        if (Str::contains($normalizedUri, ['report', 'reports', 'meta', 'show', 'view', 'index', 'find', 'ledger', 'payslip'])) {
            return 'view';
        }

        if (in_array('DELETE', $methods, true)) {
            return 'delete';
        }

        if (in_array('PUT', $methods, true) || in_array('PATCH', $methods, true)) {
            return 'edit';
        }

        if (in_array('POST', $methods, true)) {
            return 'create';
        }

        return 'view';
    }

    private function resourceFromUri(string $uri): string
    {
        $segments = array_values(array_map(function (string $segment): string {
            return $this->normalizeSegment($segment);
        }, array_filter(explode('/', trim($uri, '/')), function (string $segment): bool {
            return $segment !== '' && !Str::startsWith($segment, '{') && $segment !== 'api';
        })));

        if (empty($segments)) {
            return 'system';
        }

        $resourceSegments = [];
        foreach ($segments as $segment) {
            if (in_array($segment, ['download-agreement', 'download-reminder-letter', 'download-legal-letter', 'status', 'lifecycle', 'meta', 'approve', 'reject', 'request-documents', 'documents', 'collections', 'schedule', 'payments', 'transactions', 'deposit', 'withdraw', 'reports', 'report', 'generate-code'], true)) {
                continue;
            }
            $resourceSegments[] = $segment;
        }

        if (empty($resourceSegments)) {
            $resourceSegments = [$segments[0]];
        }

        return Str::slug(implode('_', $resourceSegments), '_');
    }

    private function moduleFromUri(string $uri): string
    {
        $segments = array_values(array_filter(explode('/', trim($uri, '/'))));
        $apiIndex = array_search('api', $segments, true);
        $moduleSegment = $this->normalizeSegment((string) ($segments[$apiIndex + 1] ?? $segments[0] ?? 'System'));

        return Str::title(str_replace(['-', '_'], ' ', (string) $moduleSegment));
    }

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

    public function syncFromRoutes(Request $request): JsonResponse
    {
        $user = $request->user();
        if (!$user || (!$user->isSystemAdmin() && !$user->hasPermission('edit_permissions') && !$user->hasPermission('edit_roles'))) {
            return response()->json(['message' => 'Only admins can sync permissions.'], 403);
        }

        $routes = Route::getRoutes();
        $created = 0;
        $existing = 0;
        $syncedPermissions = [];

        foreach ($routes as $route) {
            $uri = (string) $route->uri();
            if (!Str::startsWith($uri, 'api/')) {
                continue;
            }

            if (in_array($uri, ['api/login', 'api/logout', 'api/register', 'api/user', 'api/users'], true)) {
                continue;
            }

            $methods = array_values(array_diff($route->methods(), ['HEAD', 'OPTIONS']));
            if (empty($methods)) {
                continue;
            }

            $action = $this->actionFromRoute($methods, $uri);
            $resource = $this->resourceFromUri($uri);
            $name = strtolower($action . '_' . $resource);

            $module = $this->moduleFromUri($uri);
            $description = sprintf('Allows %s access for API route %s', $action, $uri);

            $permission = Permission::firstOrCreate(
                ['name' => $name],
                [
                    'module' => $module,
                    'description' => $description,
                    'is_active' => true,
                ]
            );

            if ($permission->wasRecentlyCreated) {
                $created++;
            } else {
                $existing++;
                if ((string) $permission->module === '' || (string) $permission->description === '') {
                    $permission->update([
                        'module' => $permission->module ?: $module,
                        'description' => $permission->description ?: $description,
                    ]);
                }
            }

            $syncedPermissions[] = $permission->name;
        }

        return response()->json([
            'message' => 'Permission sync completed successfully.',
            'created' => $created,
            'existing' => $existing,
            'total_synced' => count(array_unique($syncedPermissions)),
        ]);
    }
}