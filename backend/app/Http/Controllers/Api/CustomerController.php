<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreCustomerRequest;
use App\Http\Requests\UpdateCustomerRequest;
use App\Models\Customer;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CustomerController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $perPage = (int)($request->get('per_page', 20));
        $query = Customer::query();
        if ($search = $request->get('q')) {
            $query->where(function ($q) use ($search) {
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
        $payload['customer_code'] = $payload['customer_code'] ?? ('CUS-' . strtoupper(substr(md5(uniqid('', true)), 0, 8)));
        
        try {
            $customer = Customer::create($payload);
            return response()->json($customer, 201);
        } catch (\Exception $e) {
            \Log::error('Customer creation failed:', [
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
}
