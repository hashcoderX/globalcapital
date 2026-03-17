<?php

$url = 'http://localhost:8000/api/login';
$data = json_encode([
    'email' => 'superadmin@softcodelk.com',
    'password' => 'password'
]);

$options = [
    'http' => [
        'method' => 'POST',
        'header' => 'Content-Type: application/json',
        'content' => $data
    ]
];

$context = stream_context_create($options);
$result = file_get_contents($url, false, $context);

if ($result === false) {
    echo "Error: Unable to connect to the server.\n";
} else {
    $response = json_decode($result, true);
    if (isset($response['token'])) {
        echo "Login successful! Token: " . substr($response['token'], 0, 20) . "...\n";
    } else {
        echo "Login failed: " . ($result ?? 'Unknown error') . "\n";
    }
}