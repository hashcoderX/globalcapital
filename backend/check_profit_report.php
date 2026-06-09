<?php

require __DIR__ . '/vendor/autoload.php';
$app = require __DIR__ . '/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

$user = App\Models\User::first();
if (!$user) {
    echo "no user\n";
    exit(1);
}

$request = Illuminate\Http\Request::create('/api/mortgages/reports/profit', 'GET', ['per_page' => 20]);
$request->setUserResolver(fn () => $user);

$response = app(App\Http\Controllers\Api\MortgageController::class)->profitReport($request);
echo $response->getContent();
