<?php

require_once 'vendor/autoload.php';

$app = require_once 'bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

$user = new App\Models\User();
$user->name = 'Super Admin';
$user->email = 'superadmin@softcodelk.com';
$user->password = bcrypt('password');
$user->save();

echo 'User created successfully!';