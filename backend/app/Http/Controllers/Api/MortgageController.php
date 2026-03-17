<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreMortgageRequest;
use App\Models\Mortgage;
use App\Models\MortgageAsset;
use App\Models\MortgageGuarantor;
use App\Models\MortgageValuation;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use App\Models\MortgageSchedule;
use App\Models\MortgagePayment;
use App\Models\MortgageDocument;

class MortgageController extends Controller
{
    // List mortgages
    public function index(Request $request): JsonResponse
    {
        $perPage = (int)($request->get('per_page', 20));
        $query = Mortgage::with(['customer', 'asset', 'valuation', 'guarantors'])->orderBy('id', 'desc');

        if ($request->filled('id')) {
            $query->where('id', (int)$request->get('id'));
        }

        if ($request->filled('nic')) {
            $nic = $request->get('nic');
            $query->whereExists(function ($sub) use ($nic) {
                $sub->select('id')
                    ->from('customers')
                    ->whereColumn('customers.id', 'mortgages.customer_id')
                    ->where('customers.nic_passport', 'like', "%$nic%");
            });
        }

        if ($request->filled('mobile')) {
            $mobile = $request->get('mobile');
            $query->whereExists(function ($sub) use ($mobile) {
                $sub->select('id')
                    ->from('customers')
                    ->whereColumn('customers.id', 'mortgages.customer_id')
                    ->where('customers.phone', 'like', "%$mobile%");
            });
        }

        if ($request->filled('vehicle_no')) {
            $vehicle = $request->get('vehicle_no');
            $query->whereExists(function ($sub) use ($vehicle) {
                $sub->select('id')
                    ->from('mortgage_assets')
                    ->whereColumn('mortgage_assets.mortgage_id', 'mortgages.id')
                    ->where('mortgage_assets.vehicle_reg_no', 'like', "%$vehicle%");
            });
        }

        if ($request->filled('deed_no')) {
            $deed = $request->get('deed_no');
            $query->whereExists(function ($sub) use ($deed) {
                $sub->select('id')
                    ->from('mortgage_assets')
                    ->whereColumn('mortgage_assets.mortgage_id', 'mortgages.id')
                    ->where('mortgage_assets.deed_number', 'like', "%$deed%");
            });
        }

        $data = $query->paginate($perPage);
        return response()->json($data);
    }

    // Create mortgage (persist)
    public function store(StoreMortgageRequest $request): JsonResponse
    {
        $user = $request->user();
        
        if (!$user) {
            return response()->json(['message' => 'Unauthorized'], 401);
        }
        
        $validated = $request->validated();

        try {
            return DB::transaction(function () use ($validated, $user) {
                \Log::info('Creating mortgage with data:', $validated);
                
                // Check if customer exists
                $customer = \App\Models\Customer::find($validated['customer_id']);
                if (!$customer) {
                    throw new \Exception('Customer not found');
                }
                
            $mortgage = Mortgage::create([
                'tenant_id' => 1, // Temporarily hardcode for testing
                'branch_id' => 1, // Temporarily hardcode for testing
                'customer_id' => $validated['customer_id'],
                'mortgage_type' => $validated['mortgage_type'],
                'requested_amount' => $validated['requested_amount'],
                'approved_amount' => $validated['approved_amount'] ?? null,
                'interest_rate' => $validated['interest_rate'],
                'interest_type' => $validated['interest_type'],
                'tenure_months' => $validated['tenure_months'],
                'installment_frequency' => $validated['installment_frequency'],
                'interest_calculation_frequency' => $validated['interest_calculation_frequency'],
                'installment_amount' => null,
                'penalty_rate' => $validated['penalty_rate'] ?? 0,
                'processing_fee' => $validated['processing_fee'] ?? 0,
                'insurance_fee' => $validated['insurance_fee'] ?? 0,
                'status' => 'draft',
                'created_by' => $user->id,
            ]);

            if (!empty($validated['asset'])) {
                MortgageAsset::create([
                    'mortgage_id' => $mortgage->id,
                    'asset_type' => $validated['asset']['asset_type'] ?? 'land',
                    'description' => $validated['asset']['description'] ?? '',
                    'ownership_type' => $validated['asset']['ownership_type'] ?? 'single',
                    'address' => $validated['asset']['physical']['address'] ?? $validated['asset']['address'] ?? null,
                    'deed_number' => $validated['asset']['legal']['deed_number'] ?? $validated['asset']['deed_number'] ?? null,
                    'deed_date' => isset($validated['asset']['legal']['deed_date']) ? $validated['asset']['legal']['deed_date'] : (isset($validated['asset']['deed_date']) ? $validated['asset']['deed_date'] : null),
                    'survey_plan_number' => $validated['asset']['legal']['survey_plan_number'] ?? $validated['asset']['survey_plan_number'] ?? null,
                    'registration_office' => $validated['asset']['legal']['registration_office'] ?? $validated['asset']['registration_office'] ?? null,
                    'lawyer_name' => $validated['asset']['legal']['lawyer_name'] ?? null,
                    'land_size_or_area' => $validated['asset']['physical']['area'] ?? $validated['asset']['land_size_or_area'] ?? null,
                    'boundaries' => $validated['asset']['physical']['boundaries'] ?? null,
                    'vehicle_reg_no' => $validated['asset']['vehicle']['registration_number'] ?? $validated['asset']['vehicle_reg_no'] ?? null,
                    'engine_no' => $validated['asset']['vehicle']['engine_number'] ?? $validated['asset']['engine_no'] ?? null,
                    'chassis_no' => $validated['asset']['vehicle']['chassis_number'] ?? $validated['asset']['chassis_no'] ?? null,
                    'manufacture_year' => $validated['asset']['vehicle']['manufacture_year'] ?? null,
                    'created_by' => $user->id,
                ]);
            }

            $valuationSource = $validated['asset']['valuation'] ?? $validated['valuation'] ?? null;
            if (!empty($valuationSource)) {
                MortgageValuation::create([
                    'mortgage_id' => $mortgage->id,
                    'market_value' => $valuationSource['market_value'] ?? null,
                    'forced_sale_value' => $valuationSource['forced_sale_value'] ?? null,
                    'valuation_date' => $valuationSource['valuation_date'] ?? null,
                    'valuer_name' => $valuationSource['valuer_name'] ?? null,
                    'remarks' => null,
                ]);
            }

            // Optional Guarantors
            if (!empty($validated['guarantors']) && is_array($validated['guarantors'])) {
                foreach ($validated['guarantors'] as $g) {
                    MortgageGuarantor::create([
                        'mortgage_id' => $mortgage->id,
                        'name' => $g['name'] ?? $g['full_name'] ?? null,
                        'nic' => $g['nic'] ?? null,
                        'relationship' => $g['relationship'] ?? null,
                        'income' => $g['income'] ?? null,
                        'contact_number' => $g['contact_number'] ?? null,
                    ]);
                }
            }

            // Handle co_borrower as a guarantor
            if (!empty($validated['co_borrower'])) {
                MortgageGuarantor::create([
                    'mortgage_id' => $mortgage->id,
                    'name' => $validated['co_borrower']['full_name'] ?? null,
                    'nic' => $validated['co_borrower']['nic'] ?? null,
                    'relationship' => $validated['co_borrower']['relationship'] ?? null,
                    'income' => $validated['co_borrower']['monthly_income'] ?? null,
                    'contact_number' => $validated['co_borrower']['contact_number'] ?? null,
                ]);
            }

            return response()->json([
                'id' => $mortgage->id,
                'status' => $mortgage->status,
            ], 201);
        });
        } catch (\Exception $e) {
            \Log::error('Mortgage creation failed:', [
                'message' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
                'user_id' => $user ? $user->id : null,
                'validated_data' => $validated
            ]);
            
            return response()->json([
                'message' => 'Failed to create mortgage',
                'error' => $e->getMessage(),
                'line' => $e->getLine(),
                'file' => basename($e->getFile())
            ], 500);
        }
    }

    // Show mortgage
    public function show(int $id): JsonResponse
    {
        $mortgage = Mortgage::with(['asset', 'valuation', 'guarantors'])->findOrFail($id);
        return response()->json($mortgage);
    }

    public function payments(int $id): JsonResponse
    {
        $payments = MortgagePayment::where('mortgage_id', $id)
            ->orderBy('paid_date', 'asc')
            ->get()
            ->map(function ($p) {
                return [
                    'id' => $p->id,
                    'paid_date' => $p->paid_date?->format('Y-m-d'),
                    'amount' => $p->amount,
                    'payment_method' => $p->payment_method,
                    'remarks' => $p->remarks,
                ];
            });

        return response()->json(['data' => $payments]);
    }

    public function documents(int $id): JsonResponse
    {
        $documents = MortgageDocument::where('mortgage_id', $id)->get();
        return response()->json([
            'data' => $documents,
        ]);
    }

    public function storeDocument(Request $request, int $id): JsonResponse
    {
        $request->validate([
            'document_type' => 'required|string',
            'file' => 'required|file|mimes:pdf,doc,docx,jpg,jpeg,png|max:10240',
        ]);

        $mortgage = Mortgage::findOrFail($id);
        $user = $request->user();

        if ($request->hasFile('file')) {
            $file = $request->file('file');
            $originalName = $file->getClientOriginalName();
            $fileName = time() . '_' . $originalName;
            $filePath = $file->storeAs('mortgage_documents', $fileName, 'public');

            $document = MortgageDocument::create([
                'mortgage_id' => $id,
                'document_type' => $request->document_type,
                'file_path' => $filePath,
                'original_name' => $originalName,
                'uploaded_by' => $user->id,
            ]);

            return response()->json([
                'message' => 'Document uploaded successfully',
                'document' => $document,
            ], 201);
        }

        return response()->json(['message' => 'No file uploaded'], 400);
    }

    public function schedule(int $id): JsonResponse
    {
        $schedules = MortgageSchedule::where('mortgage_id', $id)->orderBy('installment_no')->get();
        return response()->json([
            'data' => $schedules,
        ]);
    }

    // Update status with allowed transitions
    public function updateStatus(Request $request, int $id): JsonResponse
    {
        $user = $request->user();
        $validated = $request->validate([
            'action' => ['required', 'in:submit,approve,reject,release'],
            'note' => ['nullable', 'string'],
        ]);

        $mortgage = Mortgage::findOrFail($id);

        $map = [
            'draft' => [
                'submit' => 'submitted',
            ],
            'submitted' => [
                'approve' => 'approved',
                'reject' => 'rejected',
            ],
            'approved' => [
                'release' => 'released',
            ],
        ];

        $current = $mortgage->status ?? 'draft';
        $action = $validated['action'];

        if (!isset($map[$current]) || !isset($map[$current][$action])) {
            return response()->json([
                'message' => 'Invalid transition',
                'current' => $current,
                'action' => $action,
            ], 422);
        }

        $next = $map[$current][$action];

        $mortgage->status = $next;
        if ($next === 'approved') {
            $mortgage->approved_by = $user->id ?? null;
            $mortgage->approved_at = now();
        }
        $mortgage->save();

        return response()->json([
            'id' => $mortgage->id,
            'status' => $mortgage->status,
        ]);
    }

    /**
     * Store a payment for a mortgage
     */
    public function storePayment(Request $request, int $id): JsonResponse
    {
        $user = $request->user();
        $validated = $request->validate([
            'amount' => ['required', 'numeric', 'min:0.01'],
            'date' => ['required', 'date'],
            'method' => ['required', 'in:cash,bank,transfer,cheque,card'],
            'note' => ['nullable', 'string'],
            'schedule_id' => ['nullable', 'integer'],
        ]);

        $mortgage = Mortgage::findOrFail($id);

        $payment = MortgagePayment::create([
            'mortgage_id' => $mortgage->id,
            'schedule_id' => $validated['schedule_id'] ?? null,
            'paid_date' => $validated['date'],
            'amount' => $validated['amount'],
            'payment_method' => $validated['method'],
            'remarks' => $validated['note'] ?? null,
            'collected_by' => $user->id ?? 1,
        ]);

        return response()->json([
            'id' => $payment->id,
            'status' => 'recorded',
        ], 201);
    }

}
