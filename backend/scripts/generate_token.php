<?php
require __DIR__.'/../vendor/autoload.php';
$app = require __DIR__.'/../bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

$user = App\Models\User::first();
if (!$user) {
    $user = App\Models\User::factory()->create(['email' => 'test@example.com']);
}

$token = $user->createToken('cli')->plainTextToken;
echo $token;
