<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Symfony\Component\HttpFoundation\Response;
use Throwable;

class EnsureSystemOnlineForNonAdmins
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();
        if (!$user) {
            return $next($request);
        }

        try {
            if (!Schema::hasTable('system_settings')) {
                return $next($request);
            }

            $statusValue = DB::table('system_settings')->where('key', 'system_online')->value('value');
            $isOnline = (string) ($statusValue ?? '1') === '1';

            if ($isOnline || $user->isSystemAdmin()) {
                return $next($request);
            }

            return response()->json([
                'message' => 'System is currently offline. Only admins can access at this time.'
            ], 423);
        } catch (Throwable) {
            // Fail-open to avoid locking everyone out if settings table is unavailable.
            return $next($request);
        }
    }
}
