<?php

require_once __DIR__ . '/vendor/autoload.php';

$app = require_once __DIR__ . '/bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use App\Models\Permission;
use App\Models\Role;
use App\Models\User;
use Database\Seeders\RolePermissionSeeder;

$email = trim((string) (getenv('SYSTEM_SUPER_ADMIN_EMAIL') ?: 'superadmin@softcodelk.com'));
$plainPassword = (string) (getenv('SYSTEM_SUPER_ADMIN_PASSWORD') ?: 'password');
$name = 'Super Admin';

if ($email === '') {
    $email = 'superadmin@softcodelk.com';
}

// Seed roles & permissions (also links Super Admin role when user exists).
(new RolePermissionSeeder())->run();

$user = User::query()->whereRaw('LOWER(TRIM(email)) = ?', [strtolower($email)])->first();

if (!$user) {
    $user = new User();
    $user->email = $email;
}

$user->name = $name;
$user->password = $plainPassword;
$user->employee_id = null;
$user->branch_id = null;
$user->designation_id = null;
$user->save();

$superAdminRole = Role::firstOrCreate(
    ['name' => 'Super Admin'],
    ['description' => 'Full system access with all permissions']
);

$permissionIds = Permission::query()->pluck('id');
if ($permissionIds->isNotEmpty()) {
    $superAdminRole->permissions()->sync($permissionIds);
}

$user->roles()->syncWithoutDetaching([
    $superAdminRole->id => [
        'assigned_at' => now(),
        'assigned_by' => $user->id,
    ],
]);

echo "Super Admin is ready.\n";
echo "Email: {$email}\n";
echo "Password: {$plainPassword}\n";
echo "System admin check: " . ($user->fresh()->isSystemAdmin() ? 'yes' : 'no') . "\n";
