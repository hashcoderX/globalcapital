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
use Illuminate\Support\Facades\Log;
use App\Models\MortgageSchedule;
use App\Models\MortgagePayment;
use App\Models\MortgageDocument;
use Carbon\Carbon;

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

        if ($request->filled('status')) {
            $query->where('status', (string) $request->get('status'));
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
                Log::info('Creating mortgage with data:', $validated);

                $installmentAmount = $this->calculateInstallmentAmount($validated);
                
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
                'installment_amount' => $installmentAmount,
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
            Log::error('Mortgage creation failed:', [
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

    private function calculateInstallmentAmount(array $validated): float
    {
        $principal = (float) ($validated['approved_amount'] ?? 0);
        if ($principal <= 0) {
            $principal = (float) ($validated['requested_amount'] ?? 0);
        }

        $annualRate = ((float) ($validated['interest_rate'] ?? 0)) / 100;
        $tenureMonths = max(1, (int) ($validated['tenure_months'] ?? 1));
        $interestType = (string) ($validated['interest_type'] ?? 'fixed');
        $installmentFrequency = (string) ($validated['installment_frequency'] ?? 'monthly');
        $interestCalculationFrequency = (string) ($validated['interest_calculation_frequency'] ?? 'monthly');

        $installmentsPerYearMap = [
            'daily' => 365,
            'weekly' => 52,
            'monthly' => 12,
            'quarterly' => 4,
            'yearly' => 1,
        ];

        $calculationPeriodsPerYearMap = [
            'daily' => 365,
            'weekly' => 52,
            'monthly' => 12,
            'yearly' => 1,
        ];

        $installmentsPerYear = $installmentsPerYearMap[$installmentFrequency] ?? 12;
        $calcPeriodsPerYear = $calculationPeriodsPerYearMap[$interestCalculationFrequency] ?? 12;

        $years = $tenureMonths / 12;
        $installmentCount = max(1, (int) round($years * $installmentsPerYear));

        // Convert interest calculation frequency to an effective annual rate, then to installment-period rate.
        $effectiveAnnualRate = $calcPeriodsPerYear > 0
            ? pow(1 + ($annualRate / $calcPeriodsPerYear), $calcPeriodsPerYear) - 1
            : $annualRate;

        $periodRate = pow(1 + $effectiveAnnualRate, 1 / $installmentsPerYear) - 1;

        if ($interestType === 'reducing') {
            if ($periodRate <= 0) {
                return round($principal / $installmentCount, 2);
            }

            $pow = pow(1 + $periodRate, $installmentCount);
            $installment = $principal * $periodRate * $pow / ($pow - 1);
            return round($installment, 2);
        }

        // Fixed/flat interest uses annual rate over tenure on full principal.
        $totalInterest = $principal * $annualRate * $years;
        $installment = ($principal + $totalInterest) / $installmentCount;
        return round($installment, 2);
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

    public function collectionReport(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'from_date' => ['nullable', 'date'],
            'to_date' => ['nullable', 'date'],
            'payment_method' => ['nullable', 'in:cash,bank,transfer,cheque,card'],
            'status' => ['nullable', 'string', 'max:50'],
            'search' => ['nullable', 'string', 'max:120'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:200'],
        ]);

        $perPage = (int) ($validated['per_page'] ?? 25);

        $baseQuery = MortgagePayment::query()
            ->with([
                'mortgage:id,mortgage_type,status,customer_id',
                'mortgage.customer:id,customer_code,first_name,last_name,nic_passport,phone',
            ])
            ->orderByDesc('paid_date')
            ->orderByDesc('id');

        if (!empty($validated['from_date'])) {
            $baseQuery->whereDate('paid_date', '>=', $validated['from_date']);
        }

        if (!empty($validated['to_date'])) {
            $baseQuery->whereDate('paid_date', '<=', $validated['to_date']);
        }

        if (!empty($validated['payment_method'])) {
            $baseQuery->where('payment_method', $validated['payment_method']);
        }

        if (!empty($validated['status'])) {
            $status = strtolower(trim((string) $validated['status']));
            $baseQuery->whereHas('mortgage', function ($query) use ($status) {
                $query->whereRaw('LOWER(status) = ?', [$status]);
            });
        }

        if (!empty($validated['search'])) {
            $search = trim((string) $validated['search']);
            $baseQuery->where(function ($query) use ($search) {
                $query
                    ->where('id', 'like', "%{$search}%")
                    ->orWhere('mortgage_id', 'like', "%{$search}%")
                    ->orWhere('remarks', 'like', "%{$search}%")
                    ->orWhereHas('mortgage', function ($mortgageQuery) use ($search) {
                        $mortgageQuery
                            ->where('mortgage_type', 'like', "%{$search}%")
                            ->orWhere('status', 'like', "%{$search}%")
                            ->orWhereHas('customer', function ($customerQuery) use ($search) {
                                $customerQuery
                                    ->where('customer_code', 'like', "%{$search}%")
                                    ->orWhere('first_name', 'like', "%{$search}%")
                                    ->orWhere('last_name', 'like', "%{$search}%")
                                    ->orWhere('nic_passport', 'like', "%{$search}%")
                                    ->orWhere('phone', 'like', "%{$search}%");
                            });
                    });
            });
        }

        $summaryQuery = clone $baseQuery;

        $summary = [
            'total_collections' => (int) (clone $summaryQuery)->count(),
            'total_amount' => (float) ((clone $summaryQuery)->sum('amount') ?: 0),
            'total_principal' => (float) ((clone $summaryQuery)->sum('principal_amount') ?: 0),
            'total_interest' => (float) ((clone $summaryQuery)->sum('interest_amount') ?: 0),
            'total_profit' => (float) ((clone $summaryQuery)->sum('profit_amount') ?: 0),
            'unique_mortgages' => (int) (clone $summaryQuery)->distinct('mortgage_id')->count('mortgage_id'),
        ];

        $records = $baseQuery->paginate($perPage);

        return response()->json([
            'summary' => $summary,
            'data' => $records,
        ]);
    }

    public function arrearsReport(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'from_due_date' => ['nullable', 'date'],
            'to_due_date' => ['nullable', 'date'],
            'mortgage_type' => ['nullable', 'string', 'max:80'],
            'status' => ['nullable', 'string', 'max:50'],
            'search' => ['nullable', 'string', 'max:120'],
            'min_arrears' => ['nullable', 'numeric', 'min:0'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:200'],
        ]);

        $perPage = (int) ($validated['per_page'] ?? 25);
        $today = Carbon::today()->toDateString();

        $baseQuery = Mortgage::query()
            ->with([
                'customer:id,customer_code,first_name,last_name,nic_passport,phone',
                'asset:id,mortgage_id,asset_type,deed_number,vehicle_reg_no',
            ])
            ->where(function ($query) use ($today) {
                $query
                    ->where('status', 'arrears')
                    ->orWhere('arrears_amount', '>', 0)
                    ->orWhere(function ($nested) use ($today) {
                        $nested
                            ->whereNotIn('status', ['settled', 'rejected'])
                            ->whereDate('due_date', '<', $today)
                            ->where(function ($dueQuery) {
                                $dueQuery
                                    ->where('due_amount', '>', 0)
                                    ->orWhere('due_interest_amount', '>', 0);
                            });
                    });
            })
            ->orderByDesc('arrears_amount')
            ->orderBy('due_date');

        if (!empty($validated['from_due_date'])) {
            $baseQuery->whereDate('due_date', '>=', $validated['from_due_date']);
        }

        if (!empty($validated['to_due_date'])) {
            $baseQuery->whereDate('due_date', '<=', $validated['to_due_date']);
        }

        if (!empty($validated['mortgage_type'])) {
            $baseQuery->whereRaw('LOWER(mortgage_type) = ?', [strtolower(trim((string) $validated['mortgage_type']))]);
        }

        if (!empty($validated['status'])) {
            $baseQuery->whereRaw('LOWER(status) = ?', [strtolower(trim((string) $validated['status']))]);
        }

        if (isset($validated['min_arrears']) && $validated['min_arrears'] !== null) {
            $baseQuery->where('arrears_amount', '>=', (float) $validated['min_arrears']);
        }

        if (!empty($validated['search'])) {
            $search = trim((string) $validated['search']);
            $baseQuery->where(function ($query) use ($search) {
                $query
                    ->where('id', 'like', "%{$search}%")
                    ->orWhere('mortgage_type', 'like', "%{$search}%")
                    ->orWhereHas('customer', function ($customerQuery) use ($search) {
                        $customerQuery
                            ->where('customer_code', 'like', "%{$search}%")
                            ->orWhere('first_name', 'like', "%{$search}%")
                            ->orWhere('last_name', 'like', "%{$search}%")
                            ->orWhere('nic_passport', 'like', "%{$search}%")
                            ->orWhere('phone', 'like', "%{$search}%");
                    })
                    ->orWhereHas('asset', function ($assetQuery) use ($search) {
                        $assetQuery
                            ->where('deed_number', 'like', "%{$search}%")
                            ->orWhere('vehicle_reg_no', 'like', "%{$search}%");
                    });
            });
        }

        $summaryQuery = clone $baseQuery;

        $summary = [
            'arrears_accounts' => (int) (clone $summaryQuery)->count(),
            'total_arrears' => (float) ((clone $summaryQuery)->sum('arrears_amount') ?: 0),
            'total_due_principal' => (float) ((clone $summaryQuery)->sum('due_amount') ?: 0),
            'total_due_interest' => (float) ((clone $summaryQuery)->sum('due_interest_amount') ?: 0),
            'overdue_accounts' => (int) (clone $summaryQuery)->whereDate('due_date', '<', $today)->count(),
            'high_risk_accounts' => (int) (clone $summaryQuery)->where('arrears_amount', '>=', 50000)->count(),
        ];

        $records = $baseQuery->paginate($perPage);

        $records->getCollection()->transform(function (Mortgage $mortgage) use ($today) {
            $dueDate = $mortgage->due_date ? Carbon::parse($mortgage->due_date) : null;
            $daysOverdue = $dueDate && $dueDate->lt(Carbon::parse($today))
                ? $dueDate->diffInDays(Carbon::parse($today))
                : 0;

            $mortgage->setAttribute('days_overdue', $daysOverdue);
            return $mortgage;
        });

        return response()->json([
            'summary' => $summary,
            'data' => $records,
        ]);
    }

    public function portfolioReport(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'from_date' => ['nullable', 'date'],
            'to_date' => ['nullable', 'date'],
            'mortgage_type' => ['nullable', 'string', 'max:80'],
            'status' => ['nullable', 'string', 'max:50'],
            'search' => ['nullable', 'string', 'max:120'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:200'],
        ]);

        $perPage = (int) ($validated['per_page'] ?? 25);

        $baseQuery = Mortgage::query()
            ->with([
                'customer:id,customer_code,first_name,last_name,nic_passport,phone',
                'asset:id,mortgage_id,asset_type,deed_number,vehicle_reg_no',
                'valuation:id,mortgage_id,market_value,forced_sale_value',
            ])
            ->orderByDesc('id');

        if (!empty($validated['from_date'])) {
            $baseQuery->whereDate('created_at', '>=', $validated['from_date']);
        }

        if (!empty($validated['to_date'])) {
            $baseQuery->whereDate('created_at', '<=', $validated['to_date']);
        }

        if (!empty($validated['mortgage_type'])) {
            $baseQuery->whereRaw('LOWER(mortgage_type) = ?', [strtolower(trim((string) $validated['mortgage_type']))]);
        }

        if (!empty($validated['status'])) {
            $baseQuery->whereRaw('LOWER(status) = ?', [strtolower(trim((string) $validated['status']))]);
        }

        if (!empty($validated['search'])) {
            $search = trim((string) $validated['search']);
            $baseQuery->where(function ($query) use ($search) {
                $query
                    ->where('id', 'like', "%{$search}%")
                    ->orWhere('mortgage_type', 'like', "%{$search}%")
                    ->orWhere('status', 'like', "%{$search}%")
                    ->orWhereHas('customer', function ($customerQuery) use ($search) {
                        $customerQuery
                            ->where('customer_code', 'like', "%{$search}%")
                            ->orWhere('first_name', 'like', "%{$search}%")
                            ->orWhere('last_name', 'like', "%{$search}%")
                            ->orWhere('nic_passport', 'like', "%{$search}%")
                            ->orWhere('phone', 'like', "%{$search}%");
                    })
                    ->orWhereHas('asset', function ($assetQuery) use ($search) {
                        $assetQuery
                            ->where('deed_number', 'like', "%{$search}%")
                            ->orWhere('vehicle_reg_no', 'like', "%{$search}%");
                    });
            });
        }

        $summaryQuery = clone $baseQuery;
        $summaryRows = (clone $summaryQuery)->get([
            'status',
            'mortgage_type',
            'requested_amount',
            'approved_amount',
            'due_amount',
            'due_interest_amount',
            'arrears_amount',
        ]);

        $summary = [
            'total_accounts' => $summaryRows->count(),
            'total_requested' => (float) $summaryRows->sum(fn ($row) => (float) ($row->requested_amount ?? 0)),
            'total_approved' => (float) $summaryRows->sum(fn ($row) => (float) ($row->approved_amount ?? 0)),
            'total_due_principal' => (float) $summaryRows->sum(fn ($row) => (float) ($row->due_amount ?? 0)),
            'total_due_interest' => (float) $summaryRows->sum(fn ($row) => (float) ($row->due_interest_amount ?? 0)),
            'total_arrears' => (float) $summaryRows->sum(fn ($row) => (float) ($row->arrears_amount ?? 0)),
            'submitted_accounts' => (int) $summaryRows->filter(fn ($row) => strtolower((string) $row->status) === 'submitted')->count(),
            'active_accounts' => (int) $summaryRows->filter(fn ($row) => in_array(strtolower((string) $row->status), ['active', 'released', 'approved'], true))->count(),
            'arrears_accounts' => (int) $summaryRows->filter(fn ($row) => strtolower((string) $row->status) === 'arrears' || (float) ($row->arrears_amount ?? 0) > 0)->count(),
            'settled_accounts' => (int) $summaryRows->filter(fn ($row) => strtolower((string) $row->status) === 'settled')->count(),
        ];

        $statusBreakdown = $summaryRows
            ->groupBy(fn ($row) => strtolower((string) ($row->status ?? 'unknown')))
            ->map(function ($group, $status) {
                return [
                    'status' => $status,
                    'count' => $group->count(),
                    'approved' => (float) $group->sum(fn ($row) => (float) ($row->approved_amount ?? 0)),
                    'arrears' => (float) $group->sum(fn ($row) => (float) ($row->arrears_amount ?? 0)),
                ];
            })
            ->values();

        $typeBreakdown = $summaryRows
            ->groupBy(fn ($row) => strtolower((string) ($row->mortgage_type ?? 'unknown')))
            ->map(function ($group, $type) {
                return [
                    'mortgage_type' => $type,
                    'count' => $group->count(),
                    'requested' => (float) $group->sum(fn ($row) => (float) ($row->requested_amount ?? 0)),
                    'approved' => (float) $group->sum(fn ($row) => (float) ($row->approved_amount ?? 0)),
                ];
            })
            ->values();

        $records = $baseQuery->paginate($perPage);

        return response()->json([
            'summary' => $summary,
            'status_breakdown' => $statusBreakdown,
            'type_breakdown' => $typeBreakdown,
            'data' => $records,
        ]);
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
            $tenureMonths = (int) ($mortgage->tenure_months ?? 0);
            $mortgage->due_date = now()->addMonths(max(1, $tenureMonths))->toDateString();

            $principal = (float) ($mortgage->approved_amount ?? $mortgage->requested_amount ?? 0);
            $mortgage->setAttribute('due_amount', round(max($principal, 0), 2));
            $mortgage->setAttribute('due_interest_amount', round($this->calculateCurrentInterestDue($mortgage, $principal), 2));
        }
        $mortgage->save();

        return response()->json([
            'id' => $mortgage->id,
            'status' => $mortgage->status,
            'due_date' => $mortgage->due_date,
            'due_amount' => $mortgage->due_amount,
            'due_interest_amount' => $mortgage->due_interest_amount,
        ]);
    }

    /**
     * Store a payment for a mortgage
     */
    public function storePayment(Request $request, int $id): JsonResponse
    {
        $user = $request->user();
        $validated = $request->validate([
            'mortgage_id' => ['nullable', 'integer'],
            'branch_id' => ['nullable', 'integer'],
            'user_id' => ['nullable', 'integer'],
            'amount' => ['required', 'numeric', 'min:0.01'],
            'paid_date' => ['nullable', 'date'],
            'date' => ['nullable', 'date'],
            'payment_method' => ['nullable', 'in:cash,bank,transfer,cheque,card'],
            'method' => ['nullable', 'in:cash,bank,transfer,cheque,card'],
            'remarks' => ['nullable', 'string'],
            'note' => ['nullable', 'string'],
            'schedule_id' => ['nullable', 'integer'],
            'collected_by' => ['nullable', 'integer'],
        ]);

        $mortgage = Mortgage::findOrFail($id);

        if (!empty($validated['mortgage_id']) && (int) $validated['mortgage_id'] !== (int) $mortgage->id) {
            return response()->json([
                'message' => 'mortgage_id mismatch with route mortgage id',
            ], 422);
        }

        $paidDate = (string) ($validated['paid_date'] ?? $validated['date'] ?? now()->toDateString());
        $paymentMethod = (string) ($validated['payment_method'] ?? $validated['method'] ?? 'cash');
        $remarks = $validated['remarks'] ?? $validated['note'] ?? null;
        $collectorId = (int) ($validated['collected_by'] ?? ($user->id ?? 1));
        $branchId = (int) ($validated['branch_id'] ?? ($user->branch_id ?? $mortgage->branch_id ?? 1));
        $userId = (int) ($validated['user_id'] ?? ($user->id ?? $collectorId));
        $amount = round((float) $validated['amount'], 2);

        $result = DB::transaction(function () use ($mortgage, $validated, $paidDate, $paymentMethod, $remarks, $collectorId, $branchId, $userId, $amount) {
            $this->ensureScheduleRecords($mortgage);

            $principalBase = (float) ($mortgage->approved_amount ?? $mortgage->requested_amount ?? 0);
            $totalPrincipalPaid = (float) MortgagePayment::where('mortgage_id', $mortgage->id)->sum('principal_amount');
            $outstandingBefore = round(max($principalBase - $totalPrincipalPaid, 0), 2);

            // Interest-first algorithm:
            // - If payment < current interest due: all payment is profit and unpaid interest is capitalized to due principal.
            // - If payment >= current interest due: interest due is profit, remaining amount reduces due principal.
            // - Next due interest is recalculated from the new due principal.
            $principalDueBefore = max((float) ($mortgage->due_amount ?? $outstandingBefore), 0);
            $interestDueBefore = max((float) ($mortgage->due_interest_amount ?? $this->calculateCurrentInterestDue($mortgage, $principalDueBefore)), 0);
            $totalDueBefore = round($principalDueBefore + $interestDueBefore, 2);
            $isFullSettlement = $amount >= ($totalDueBefore - 0.01);

            if ($isFullSettlement) {
                $interestPaid = round($interestDueBefore, 2);
                $principalPaid = round($principalDueBefore, 2);
                $profitAmount = $interestPaid;
                $arrearsAmount = 0.0;
                $newDueAmount = 0.0;
                $newDueInterest = 0.0;
                $outstandingAfter = 0.0;
            } else {
                $interestPaid = round(min($amount, $interestDueBefore), 2);
                $profitAmount = $interestPaid;
                $arrearsAmount = $amount < $interestDueBefore ? round($interestDueBefore - $amount, 2) : 0.0;

                if ($amount >= $interestDueBefore) {
                    $principalPaid = round($amount - $interestDueBefore, 2);
                    $principalPaid = min($principalPaid, $principalDueBefore);
                    $newDueAmount = round(max($principalDueBefore - $principalPaid, 0), 2);
                } else {
                    $principalPaid = 0.0;
                    $unpaidInterest = round($interestDueBefore - $amount, 2);
                    $newDueAmount = round($principalDueBefore + $unpaidInterest, 2);
                }

                $outstandingAfter = $newDueAmount;
                $newDueInterest = round($this->calculateCurrentInterestDue($mortgage, $newDueAmount), 2);
            }

            $mortgage->setAttribute('due_amount', $newDueAmount);
            $mortgage->setAttribute('due_interest_amount', $newDueInterest);
            $mortgage->setAttribute('arrears_amount', $arrearsAmount);

            $paidAt = Carbon::parse($paidDate);
            $nextDueDate = $this->addFrequency($paidAt, (string) ($mortgage->installment_frequency ?? 'monthly'));
            $mortgage->due_date = $nextDueDate->toDateString();

            if ((float) $mortgage->due_amount <= 0.01 && (float) $mortgage->due_interest_amount <= 0.01) {
                $mortgage->status = 'settled';
                $mortgage->due_date = null;
                $mortgage->setAttribute('arrears_amount', 0);
            } elseif ($arrearsAmount > 0) {
                $mortgage->status = 'arrears';
            } elseif ($mortgage->status === 'arrears') {
                $mortgage->status = 'active';
            }

            // Persist updated mortgage snapshot (due amounts, arrears, status, due date)
            $mortgage->save();

            $targetSchedule = null;
            if (!empty($validated['schedule_id'])) {
                $targetSchedule = MortgageSchedule::where('mortgage_id', $mortgage->id)
                    ->where('id', (int) $validated['schedule_id'])
                    ->first();
            }

            $payment = MortgagePayment::create([
                'mortgage_id' => $mortgage->id,
                'branch_id' => $branchId,
                'user_id' => $userId,
                'schedule_id' => $targetSchedule?->id,
                'paid_date' => $paidDate,
                'amount' => $amount,
                'interest_amount' => $interestPaid,
                'principal_amount' => $principalPaid,
                'profit_amount' => $profitAmount,
                'outstanding_principal_after' => $outstandingAfter,
                'payment_method' => $paymentMethod,
                'remarks' => $remarks,
                'collected_by' => $collectorId,
            ]);

            $this->applyPaymentToSchedules($mortgage, $amount, $targetSchedule?->id, $paidDate);
            $this->recalculateScheduleInterest($mortgage, $outstandingAfter);

            if ($isFullSettlement) {
                $this->closeSchedulesOnSettlement($mortgage);
            }

            return [
                'payment' => $payment,
                'mortgage_status' => (string) $mortgage->status,
                'due_date' => $mortgage->due_date,
                'interest_due' => $interestDueBefore,
                'interest_paid' => $interestPaid,
                'principal_paid' => $principalPaid,
                'profit_amount' => $profitAmount,
                'outstanding_principal_after' => $outstandingAfter,
                'due_amount' => (float) $mortgage->due_amount,
                'due_interest_amount' => (float) $mortgage->due_interest_amount,
                'arrears_amount' => (float) $mortgage->arrears_amount,
                'is_settled' => $isFullSettlement,
            ];
        });

        return response()->json([
            'id' => $result['payment']->id,
            'status' => 'recorded',
            'mortgage_status' => $result['mortgage_status'],
            'due_date' => $result['due_date'],
            'interest_due' => $result['interest_due'],
            'interest_paid' => $result['interest_paid'],
            'principal_paid' => $result['principal_paid'],
            'profit_amount' => $result['profit_amount'],
            'outstanding_principal_after' => $result['outstanding_principal_after'],
            'due_amount' => $result['due_amount'],
            'due_interest_amount' => $result['due_interest_amount'],
            'arrears_amount' => $result['arrears_amount'],
            'is_settled' => $result['is_settled'],
        ], 201);
    }

    /**
     * Manually adjust interest due on a mortgage.
     *
     * Used by officers when interest and principal are paid on different dates
     * and a manual waiver or special interest charge is required.
     */
    public function adjustInterest(Request $request, int $id): JsonResponse
    {
        $user = $request->user();

        $validated = $request->validate([
            'mode' => ['required', 'in:waive,add'],
            'amount' => ['required', 'numeric', 'min:0.01'],
            'note' => ['nullable', 'string'],
        ]);

        $mortgage = Mortgage::findOrFail($id);

        if (in_array($mortgage->status, ['settled', 'rejected'], true)) {
            return response()->json([
                'message' => 'Cannot adjust interest for settled or rejected mortgages.',
            ], 422);
        }

        $amount = round((float) $validated['amount'], 2);

        DB::transaction(function () use ($mortgage, $validated, $amount, $user) {
            $currentInterest = max((float) ($mortgage->due_interest_amount ?? 0), 0);
            $currentArrears = max((float) ($mortgage->arrears_amount ?? 0), 0);

            if ($validated['mode'] === 'waive') {
                // Waive (cut off) part of the interest due.
                $delta = min($amount, $currentInterest);
                $newInterest = round(max($currentInterest - $delta, 0), 2);

                // Also reduce arrears by the same waived amount (up to zero)
                $newArrears = round(max($currentArrears - $delta, 0), 2);
                $mortgage->setAttribute('arrears_amount', $newArrears);

                $mortgage->setAttribute('due_interest_amount', $newInterest);

                // If arrears cleared, move account back to active if previously in arrears
                if ($newArrears <= 0.01 && $mortgage->status === 'arrears') {
                    $mortgage->status = 'active';
                }
            } else {
                // Add special interest amount (e.g. extra week interest)
                $newInterest = round($currentInterest + $amount, 2);
                $mortgage->setAttribute('due_interest_amount', $newInterest);
                // Do not automatically change arrears here; it will follow future collections.
            }

            $mortgage->save();
        });

        // Refresh snapshot
        $mortgage->refresh();

        return response()->json([
            'id' => $mortgage->id,
            'status' => $mortgage->status,
            'due_amount' => (float) ($mortgage->due_amount ?? 0),
            'due_interest_amount' => (float) ($mortgage->due_interest_amount ?? 0),
            'arrears_amount' => (float) ($mortgage->arrears_amount ?? 0),
        ]);
    }

    private function closeSchedulesOnSettlement(Mortgage $mortgage): void
    {
        /** @var \Illuminate\Database\Eloquent\Collection<int, \App\Models\MortgageSchedule> $schedules */
        $schedules = MortgageSchedule::where('mortgage_id', $mortgage->id)
            ->whereIn('status', ['pending', 'partially_paid', 'overdue'])
            ->get();

        foreach ($schedules as $schedule) {
            $schedule->paid_amount = $schedule->total_amount;
            $schedule->status = 'paid';
            $schedule->save();
        }
    }

    private function calculateCurrentInterestDue(Mortgage $mortgage, float $principal): float
    {
        if ($principal <= 0) {
            return 0.0;
        }

        $annualRate = max(0, (float) ($mortgage->interest_rate ?? 0)) / 100;
        return max(round($principal * $annualRate, 2), 0);
    }

    private function getPeriodInterestRate(float $annualRatePercent, string $frequency): float
    {
        $annualRate = $annualRatePercent / 100;
        $periods = match (strtolower(trim($frequency))) {
            'daily' => 365,
            'weekly' => 52,
            'quarterly' => 4,
            'yearly' => 1,
            default => 12,
        };

        return $periods > 0 ? ($annualRate / $periods) : 0.0;
    }

    private function installmentsPerYear(string $frequency): int
    {
        return match (strtolower(trim($frequency))) {
            'daily' => 365,
            'weekly' => 52,
            'quarterly' => 4,
            'yearly' => 1,
            default => 12,
        };
    }

    private function addFrequency(Carbon $date, string $frequency): Carbon
    {
        return match (strtolower(trim($frequency))) {
            'daily' => $date->copy()->addDay(),
            'weekly' => $date->copy()->addWeek(),
            'quarterly' => $date->copy()->addMonths(3),
            'yearly' => $date->copy()->addYear(),
            default => $date->copy()->addMonth(),
        };
    }

    private function ensureScheduleRecords(Mortgage $mortgage): void
    {
        $hasSchedule = MortgageSchedule::where('mortgage_id', $mortgage->id)->exists();
        if ($hasSchedule) {
            return;
        }

        $principal = (float) ($mortgage->approved_amount ?? $mortgage->requested_amount ?? 0);
        $tenureMonths = max(1, (int) ($mortgage->tenure_months ?? 1));
        $frequency = (string) ($mortgage->installment_frequency ?? 'monthly');
        $installmentsPerYear = $this->installmentsPerYear($frequency);
        $installmentCount = max(1, (int) round(($tenureMonths / 12) * $installmentsPerYear));
        $annualRate = (float) ($mortgage->interest_rate ?? 0) / 100;

        if ($principal <= 0) {
            return;
        }

        $remainingPrincipal = $principal;
        $principalPerInstallment = round($principal / $installmentCount, 2);
        $periodRate = $this->getPeriodInterestRate((float) ($mortgage->interest_rate ?? 0), (string) ($mortgage->interest_calculation_frequency ?? 'monthly'));
        $fixedInterestTotal = $principal * $annualRate * ($tenureMonths / 12);
        $fixedInterestPerInstallment = round($fixedInterestTotal / $installmentCount, 2);

        $dueDate = Carbon::parse($mortgage->approved_at ?? $mortgage->created_at ?? now());

        for ($i = 1; $i <= $installmentCount; $i++) {
            $dueDate = $this->addFrequency($dueDate, $frequency);
            $principalPart = $i === $installmentCount ? round($remainingPrincipal, 2) : $principalPerInstallment;
            $interestPart = strtolower((string) $mortgage->interest_type) === 'reducing'
                ? round($remainingPrincipal * $periodRate, 2)
                : $fixedInterestPerInstallment;

            MortgageSchedule::create([
                'mortgage_id' => $mortgage->id,
                'installment_no' => $i,
                'due_date' => $dueDate->toDateString(),
                'principal' => $principalPart,
                'interest' => $interestPart,
                'total_amount' => round($principalPart + $interestPart, 2),
                'paid_amount' => 0,
                'status' => 'pending',
            ]);

            $remainingPrincipal = max($remainingPrincipal - $principalPart, 0);
        }
    }

    private function applyPaymentToSchedules(Mortgage $mortgage, float $amount, ?int $scheduleId, string $paidDate): void
    {
        $remaining = $amount;
        $paidAt = Carbon::parse($paidDate)->startOfDay();

        $scheduleQuery = MortgageSchedule::where('mortgage_id', $mortgage->id)
            ->whereIn('status', ['pending', 'partially_paid', 'overdue'])
            ->orderBy('installment_no');

        if ($scheduleId) {
            $startSchedule = MortgageSchedule::where('mortgage_id', $mortgage->id)->where('id', $scheduleId)->first();
            if ($startSchedule) {
                $scheduleQuery->where('installment_no', '>=', $startSchedule->installment_no);
            }
        }

        /** @var \Illuminate\Database\Eloquent\Collection<int, \App\Models\MortgageSchedule> $schedules */
        $schedules = $scheduleQuery->get();
        foreach ($schedules as $schedule) {
            if ($remaining <= 0) {
                break;
            }

            $currentPaid = (float) $schedule->paid_amount;
            $dueTotal = (float) $schedule->total_amount;
            $balance = max($dueTotal - $currentPaid, 0);
            if ($balance <= 0) {
                continue;
            }

            $apply = min($remaining, $balance);
            $schedule->paid_amount = round($currentPaid + $apply, 2);
            $remaining = round($remaining - $apply, 2);

            if ((float) $schedule->paid_amount >= $dueTotal - 0.01) {
                $schedule->status = 'paid';
            } elseif ($schedule->due_date && Carbon::parse($schedule->due_date)->lt($paidAt)) {
                $schedule->status = 'overdue';
            } else {
                $schedule->status = 'partially_paid';
            }

            $schedule->save();
        }
    }

    private function recalculateScheduleInterest(Mortgage $mortgage, float $startingOutstandingPrincipal): void
    {
        /** @var \Illuminate\Database\Eloquent\Collection<int, \App\Models\MortgageSchedule> $pendingSchedules */
        $pendingSchedules = MortgageSchedule::where('mortgage_id', $mortgage->id)
            ->whereIn('status', ['pending', 'partially_paid', 'overdue'])
            ->orderBy('installment_no')
            ->get();

        if ($pendingSchedules->isEmpty()) {
            return;
        }

        $outstanding = $startingOutstandingPrincipal;
        $periodRate = $this->getPeriodInterestRate((float) ($mortgage->interest_rate ?? 0), (string) ($mortgage->interest_calculation_frequency ?? 'monthly'));

        foreach ($pendingSchedules as $schedule) {
            $principalPart = (float) $schedule->principal;
            if (strtolower((string) $mortgage->interest_type) === 'reducing') {
                $interestPart = round($outstanding * $periodRate, 2);
                $schedule->interest = $interestPart;
                $schedule->total_amount = round($principalPart + $interestPart, 2);
            }

            if ((float) $schedule->paid_amount >= (float) $schedule->total_amount - 0.01) {
                $schedule->status = 'paid';
            } elseif ($schedule->due_date && Carbon::parse($schedule->due_date)->lt(now())) {
                $schedule->status = 'overdue';
            } elseif ((float) $schedule->paid_amount > 0) {
                $schedule->status = 'partially_paid';
            } else {
                $schedule->status = 'pending';
            }

            $schedule->save();
            $outstanding = max($outstanding - $principalPart, 0);
        }
    }

    private function refreshMortgageArrears(Mortgage $mortgage): void
    {
        $arrears = (float) MortgageSchedule::where('mortgage_id', $mortgage->id)
            ->whereIn('status', ['overdue', 'partially_paid'])
            ->sum(DB::raw('GREATEST(total_amount - paid_amount, 0)'));

        $mortgage->setAttribute('arrears_amount', round(max($arrears, 0), 2));
        if ($mortgage->arrears_amount > 0 && in_array($mortgage->status, ['approved', 'active', 'released'], true)) {
            $mortgage->status = 'arrears';
        }
        $mortgage->save();
    }

}
