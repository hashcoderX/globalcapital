<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreCustomerRequest;
use App\Http\Requests\UpdateCustomerRequest;
use App\Models\Customer;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class CustomerController extends Controller
{
    public function generateCode(): JsonResponse
    {
        return response()->json([
            'customer_no' => $this->generateDateTimeBasedCustomerCode(),
        ]);
    }

    public function index(Request $request): JsonResponse
    {
        $perPage = (int)($request->get('per_page', 20));
        $branchId = (int)($request->get('branch_id', 0));
        $query = Customer::query();

        if ($branchId > 0) {
            $query->where('branch_id', $branchId);
        }

        if ($search = $request->get('q')) {
            $query->where(function ($q) use ($search) {
                $q->where('customer_code', 'like', "%$search%");
                $q->where('first_name', 'like', "%$search%");
                $q->orWhere('last_name', 'like', "%$search%");
                $q->orWhere('nic_passport', 'like', "%$search%");
                $q->orWhere('email', 'like', "%$search%");
                $q->orWhere('phone', 'like', "%$search%");
            });
        }
        $data = $query->orderByDesc('id')->paginate($perPage);
        return response()->json($data);
    }

    public function store(StoreCustomerRequest $request): JsonResponse
    {
        $user = $request->user();
        $payload = $request->validated();
        $payload['tenant_id'] = $user->tenant_id ?? 1;
        $payload['branch_id'] = $user->branch_id ?? 1;
        $payload['created_by'] = $user->id;
        $payload['customer_code'] = $payload['customer_code'] ?? $this->generateDateTimeBasedCustomerCode();
        
        try {
            $customer = Customer::create($payload);
            return response()->json($customer, 201);
        } catch (\Exception $e) {
            Log::error('Customer creation failed:', [
                'message' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
                'user_id' => $user ? $user->id : null,
                'payload' => $payload
            ]);
            
            return response()->json([
                'message' => 'Failed to create customer',
                'error' => $e->getMessage(),
                'line' => $e->getLine(),
                'file' => basename($e->getFile())
            ], 500);
        }
    }

    public function show(Customer $customer): JsonResponse
    {
        return response()->json($customer);
    }

    public function findByCode(string $customerCode): JsonResponse
    {
        $customer = $this->findCustomerByCodeOrSerial($customerCode);

        if (!$customer) {
            return response()->json([
                'message' => 'Customer not found for provided Customer No.',
            ], 404);
        }

        return response()->json($customer);
    }

    private function findCustomerByCodeOrSerial(string $input): ?Customer
    {
        $normalized = strtoupper(trim($input));
        if ($normalized === '') {
            return null;
        }

        if (ctype_digit($normalized) && strlen($normalized) <= 5) {
            $serial = str_pad($normalized, 5, '0', STR_PAD_LEFT);
            return Customer::where('customer_code', 'like', '%-' . $serial)
                ->orderByDesc('id')
                ->first();
        }

        return Customer::whereRaw('UPPER(customer_code) = ?', [$normalized])->first();
    }

    public function update(UpdateCustomerRequest $request, Customer $customer): JsonResponse
    {
        $customer->update($request->validated());
        return response()->json($customer);
    }

    public function destroy(Customer $customer): JsonResponse
    {
        $customer->delete();
        return response()->json(null, 204);
    }

    private function generateDateTimeBasedCustomerCode(): string
    {
        $prefix = 'CUS-' . now()->format('ymd') . '-';

        // Generate a random 5-digit suffix and verify uniqueness before returning.
        do {
            $randomPart = str_pad((string) random_int(1, 99999), 5, '0', STR_PAD_LEFT);
            $candidate = $prefix . $randomPart;
            $exists = Customer::where('customer_code', $candidate)->exists();
        } while ($exists);

        return $candidate;
    }
}
