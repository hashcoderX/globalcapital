<?php

namespace App\Services;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Schema;

class WhatsappGatewayService
{
    /**
     * @return array<string, mixed>
     */
    public function getConfig(): array
    {
        if (!Schema::hasTable('system_settings')) {
            return [];
        }

        $raw = DB::table('system_settings')->where('key', 'whatsapp_gateway_config')->value('value');
        if (!is_string($raw) || trim($raw) === '') {
            return [];
        }

        $decoded = json_decode($raw, true);
        return is_array($decoded) ? $decoded : [];
    }

    /**
     * @param array<string, mixed> $config
     */
    public function saveConfig(array $config): void
    {
        DB::table('system_settings')->updateOrInsert(
            ['key' => 'whatsapp_gateway_config'],
            [
                'value' => json_encode($config, JSON_UNESCAPED_SLASHES),
                'updated_at' => now(),
                'created_at' => now(),
            ]
        );
    }

    /**
     * @return array<string, mixed>
     */
    public function sanitizedConfigForApi(): array
    {
        $config = $this->getConfig();
        return [
            'enabled' => (bool) ($config['enabled'] ?? false),
            'provider_name' => (string) ($config['provider_name'] ?? ''),
            'endpoint_url' => (string) ($config['endpoint_url'] ?? ''),
            'http_method' => (string) ($config['http_method'] ?? 'POST'),
            'auth_type' => (string) ($config['auth_type'] ?? 'none'),
            'username' => (string) ($config['username'] ?? ''),
            'password' => (string) ($config['password'] ?? ''),
            'auth_token' => (string) ($config['auth_token'] ?? ''),
            'api_key_header' => (string) ($config['api_key_header'] ?? 'X-API-Key'),
            'api_key_value' => (string) ($config['api_key_value'] ?? ''),
            'sender_id' => (string) ($config['sender_id'] ?? ''),
            'timeout_seconds' => (int) ($config['timeout_seconds'] ?? 10),
            'message_template' => (string) ($config['message_template'] ?? ''),
        ];
    }

    /**
     * @return array{ok:bool,message:string,response_body?:string,status_code?:int}
     */
    public function send(string $phone, string $message): array
    {
        $config = $this->getConfig();
        if (!($config['enabled'] ?? false)) {
            return ['ok' => false, 'message' => 'WhatsApp gateway is disabled.'];
        }

        $endpointUrl = trim((string) ($config['endpoint_url'] ?? ''));
        if ($endpointUrl === '') {
            return ['ok' => false, 'message' => 'WhatsApp gateway endpoint URL is not configured.'];
        }

        $cleanPhone = preg_replace('/\s+/', '', $phone) ?? '';
        if ($cleanPhone === '') {
            return ['ok' => false, 'message' => 'Recipient phone number is empty.'];
        }

        $timeout = max(3, (int) ($config['timeout_seconds'] ?? 10));
        $method = strtoupper((string) ($config['http_method'] ?? 'POST'));
        $senderId = trim((string) ($config['sender_id'] ?? ''));

        $payload = [
            'to' => $cleanPhone,
            'phone' => $cleanPhone,
            'number' => $cleanPhone,
            'message' => $message,
            'text' => $message,
            'sender' => $senderId,
            'sender_id' => $senderId,
        ];

        $headers = ['Accept' => 'application/json,text/plain,*/*'];
        $authType = strtolower(trim((string) ($config['auth_type'] ?? 'none')));
        $http = Http::timeout($timeout)->withHeaders($headers);

        if ($authType === 'bearer' && trim((string) ($config['auth_token'] ?? '')) !== '') {
            $http = $http->withToken((string) $config['auth_token']);
        } elseif ($authType === 'basic' && trim((string) ($config['username'] ?? '')) !== '') {
            $http = $http->withBasicAuth(
                (string) ($config['username'] ?? ''),
                (string) ($config['password'] ?? '')
            );
        } elseif ($authType === 'api_key') {
            $headerName = trim((string) ($config['api_key_header'] ?? 'X-API-Key'));
            $headerValue = (string) ($config['api_key_value'] ?? '');
            if ($headerName !== '' && $headerValue !== '') {
                $http = $http->withHeaders([$headerName => $headerValue]);
            }
        }

        try {
            $response = $method === 'GET'
                ? $http->get($endpointUrl, $payload)
                : $http->post($endpointUrl, $payload);
        } catch (\Throwable $e) {
            Log::warning('WhatsApp gateway request failed', ['error' => $e->getMessage()]);
            return ['ok' => false, 'message' => 'WhatsApp gateway connection failed: ' . $e->getMessage()];
        }

        if (!$response->successful()) {
            return [
                'ok' => false,
                'message' => 'WhatsApp gateway returned an error response.',
                'status_code' => $response->status(),
                'response_body' => $response->body(),
            ];
        }

        return [
            'ok' => true,
            'message' => 'WhatsApp message sent successfully.',
            'status_code' => $response->status(),
            'response_body' => $response->body(),
        ];
    }

    /**
     * @param array<string, mixed> $context
     */
    public function buildCollectionMessage(array $context): string
    {
        $template = trim((string) ($this->getConfig()['message_template'] ?? ''));
        $defaults = [
            'customer_name' => (string) ($context['customer_name'] ?? 'Customer'),
            'amount' => (string) ($context['amount'] ?? '0.00'),
            'date' => (string) ($context['date'] ?? now()->toDateString()),
            'reference' => (string) ($context['reference'] ?? '-'),
            'module' => (string) ($context['module'] ?? 'Collection'),
        ];

        if ($template === '') {
            return sprintf(
                'Dear %s, your %s payment of LKR %s was received on %s. Ref: %s',
                $defaults['customer_name'],
                strtolower($defaults['module']),
                $defaults['amount'],
                $defaults['date'],
                $defaults['reference']
            );
        }

        $message = $template;
        foreach ($defaults as $key => $value) {
            $message = str_replace('{{' . $key . '}}', $value, $message);
        }
        return $message;
    }
}

