<?php

require_once 'vendor/autoload.php';

$app = require_once 'bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use App\Models\Role;
use App\Models\User;
use Illuminate\Support\Facades\Hash;

$email = 'superadmin@gmail.com';
$plainPassword = 'password';

$user = User::firstOrNew(['email' => $email]);
$user->name = 'Super Admin';
$user->password = Hash::make($plainPassword);
$user->employee_id = null;
$user->branch_id = null;
$user->designation_id = null;
$user->save();

$superAdminRole = Role::firstOrCreate(
	['name' => 'Super Admin'],
	['description' => 'Full system access with all permissions']
);

$user->roles()->sync([
	$superAdminRole->id => [
		'assigned_at' => now(),
		'assigned_by' => $user->id,
	],
]);

echo "Super Admin is ready.\n";
echo "Email: {$email}\n";
echo "Password: {$plainPassword}\n";