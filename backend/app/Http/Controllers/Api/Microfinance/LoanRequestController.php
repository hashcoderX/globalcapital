<?php

namespace App\Http\Controllers\Api\Microfinance;

use App\Http\Controllers\Controller;
use App\Models\CompanyDocumentTemplate;
use App\Models\Customer;
use App\Models\Employee;
use App\Models\MicrofinanceCenter;
use App\Models\MicrofinanceGroup;
use App\Models\MicrofinanceLoanRequest;
use App\Models\MicrofinancePenaltySetting;
use App\Models\MicrofinanceRoute;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;

class LoanRequestController extends Controller
{
    public function buildLoanAgreementVariables(MicrofinanceLoanRequest $loanRequest): array
    {
        $issueDate = $loanRequest->loan_request_date ?: date('Y-m-d');
        $routeName = optional($loanRequest->route)->name ?: '-';
        $centerName = optional($loanRequest->center)->name ?: '-';
        $groupName = optional($loanRequest->group)->name ?: '-';

        return [
            'customer_name' => (string) ($loanRequest->customer_name ?: ''),
            'customer_no' => (string) ($loanRequest->customer_no ?: ''),
            'loan_code' => (string) ($loanRequest->loan_code ?: ''),
            'issue_date' => (string) $issueDate,
            'loan_amount' => number_format((float) ($loanRequest->loan_amount ?: 0), 2, '.', ''),
            'principal' => number_format((float) ($loanRequest->loan_amount ?: 0), 2, '.', ''),
            'refundable_amount' => number_format((float) ($loanRequest->refundable_amount ?: 0), 2, '.', ''),
            'total_payable' => number_format((float) ($loanRequest->refundable_amount ?: 0), 2, '.', ''),
            'installment' => number_format((float) ($loanRequest->installment_amount ?: 0), 2, '.', ''),
            'interest_rate' => number_format((float) ($loanRequest->interest_rate ?: 0), 2, '.', ''),
            'interest_type' => (string) ($loanRequest->interest_type ?: ''),
            'terms_count' => (string) ($loanRequest->terms_count ?: ''),
            'refund_option' => (string) ($loanRequest->refund_option ?: ''),
            'address' => (string) ($loanRequest->address ?: ''),
            'contact_no' => (string) ($loanRequest->contact_no ?: ''),
            'route_name' => (string) $routeName,
            'center_name' => (string) $centerName,
            'group_name' => (string) $groupName,
            'request_no' => (string) ($loanRequest->id ?: ''),
        ];
    }

    public function extractPlaceholdersFromDocx(string $docxPath): array
    {
        $zip = new \ZipArchive();
        if ($zip->open($docxPath) !== true) {
            return [];
        }

        $placeholders = [];
        for ($i = 0; $i < $zip->numFiles; $i++) {
            $entryName = $zip->getNameIndex($i);
            if (!$entryName || !str_starts_with($entryName, 'word/') || !str_ends_with($entryName, '.xml')) {
                continue;
            }

            $content = $zip->getFromIndex($i);
            if (!is_string($content) || $content === '') {
                continue;
            }

            // Extract standard {{field}} and ${field} patterns
            if (preg_match_all('/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}|\$\{\s*([a-zA-Z0-9_]+)\s*\}/', $content, $matches, PREG_SET_ORDER)) {
                foreach ($matches as $match) {
                    $key = $match[1] !== '' ? $match[1] : $match[2];
                    if ($key !== '') {
                        $placeholders[$key] = true;
                    }
                }
            }
        }

        $zip->close();
        return $placeholders;
    }

    private function mapPlaceholdersWithOpenAi(array $placeholders, array $loanData): array
    {
        $mapping = [];

        // Handle standard {{field}} patterns
        foreach ($placeholders as $key => $value) {
            if (isset($loanData[$key])) {
                $mapping[$key] = (string) $loanData[$key];
            }
        }

        // Create mapping for context-based underscore placeholders
        $date = strtotime($loanData['issue_date'] ?? 'now');
        $mapping['day'] = date('j', $date); // Day of month
        $mapping['month'] = date('F', $date); // Full month name
        $mapping['lender_name'] = 'Microfinance Company'; // TODO: Get from company settings
        $mapping['lender_address'] = 'Company Address'; // TODO: Get from company settings
        $mapping['lender_nic'] = 'Company Registration No'; // TODO: Get from company settings
        $mapping['borrower_name'] = $loanData['customer_name'] ?? '';
        $mapping['borrower_address'] = $loanData['address'] ?? '';
        $mapping['borrower_nic'] = $loanData['nic'] ?? '';

        $apiKey = (string) env('OPENAI_API_KEY', '');
        if ($apiKey === '' || count($mapping) === count($loanData)) {
            return $mapping;
        }

        // Use OpenAI for any remaining standard placeholders
        $standardPlaceholders = array_filter($placeholders, function($value) {
            return is_bool($value);
        });

        if (count($standardPlaceholders) > 0) {
            $prompt = [
                'task' => 'Map document placeholder keys to values using provided loan data.',
                'rules' => [
                    'Return JSON object only, no markdown.',
                    'Use only these placeholder keys.',
                    'If value is missing, return empty string.',
                ],
                'placeholders' => array_keys($standardPlaceholders),
                'loan_data' => $loanData,
            ];

            try {
                $response = Http::withToken($apiKey)
                    ->timeout(25)
                    ->post('https://api.openai.com/v1/chat/completions', [
                        'model' => env('OPENAI_MODEL', 'gpt-4o-mini'),
                        'messages' => [
                            [
                                'role' => 'system',
                                'content' => 'You are a strict JSON mapping assistant.',
                            ],
                            [
                                'role' => 'user',
                                'content' => json_encode($prompt, JSON_UNESCAPED_UNICODE),
                            ],
                        ],
                        'temperature' => 0,
                        'response_format' => ['type' => 'json_object'],
                    ]);

                if ($response->successful()) {
                    $content = (string) data_get($response->json(), 'choices.0.message.content', '');
                    if ($content !== '') {
                        $decoded = json_decode($content, true);
                        if (is_array($decoded)) {
                            foreach ($standardPlaceholders as $placeholder => $value) {
                                if (array_key_exists($placeholder, $decoded)) {
                                    $mapping[$placeholder] = is_scalar($decoded[$placeholder]) ? (string) $decoded[$placeholder] : '';
                                }
                            }
                        }
                    }
                }
            } catch (\Throwable $e) {
                // Keep existing mapping
            }
        }

        return $mapping;
    }

    private function fillDocxTemplate(string $inputPath, string $outputPath, array $mapping): bool
    {
        if (!copy($inputPath, $outputPath)) {
            return false;
        }

        $zip = new \ZipArchive();
        if ($zip->open($outputPath) !== true) {
            return false;
        }

        for ($i = 0; $i < $zip->numFiles; $i++) {
            $entryName = $zip->getNameIndex($i);
            if (!$entryName || !str_starts_with($entryName, 'word/') || !str_ends_with($entryName, '.xml')) {
                continue;
            }

            $content = $zip->getFromIndex($i);
            if (!is_string($content) || $content === '') {
                continue;
            }

            // Replace standard {{field}} patterns first
            foreach ($mapping as $pattern => $value) {
                if (!is_string($value)) {
                    // Standard {{field}} pattern
                    $content = str_replace('{{' . $pattern . '}}', (string) $value, $content);
                    $content = str_replace('${' . $pattern . '}', (string) $value, $content);
                }
            }

            // Handle context-based underscore patterns with regex replacement
            $patterns = [
                '/(day of)\s+_{3,}/' => function($matches) use ($mapping) {
                    return $matches[1] . ' ' . ($mapping['day'] ?? '___');
                },
                '/(day of)\s+_{5,}\s+(20)/' => function($matches) use ($mapping) {
                    return $matches[1] . ' ' . ($mapping['month'] ?? '_______') . ' ' . $matches[2];
                },
                '/(Lender:)\s*(Name:)\s*_{10,}/' => function($matches) use ($mapping) {
                    return $matches[1] . ' ' . $matches[2] . ' ' . ($mapping['lender_name'] ?? '__________________________');
                },
                '/(Lender:)\s*(Address:)\s*_{10,}/' => function($matches) use ($mapping) {
                    return $matches[1] . ' ' . $matches[2] . ' ' . ($mapping['lender_address'] ?? '________________________');
                },
                '/(Lender:)\s*(NIC\/Company No:)\s*_{5,}/' => function($matches) use ($mapping) {
                    return $matches[1] . ' ' . $matches[2] . ' ' . ($mapping['lender_nic'] ?? '________________');
                },
                '/(Borrower:)\s*(Name:)\s*_{10,}/' => function($matches) use ($mapping) {
                    return $matches[1] . ' ' . $matches[2] . ' ' . ($mapping['borrower_name'] ?? '__________________________');
                },
                '/(Borrower:)\s*(Address:)\s*_{10,}/' => function($matches) use ($mapping) {
                    return $matches[1] . ' ' . $matches[2] . ' ' . ($mapping['borrower_address'] ?? '________________________');
                },
                '/(Borrower:)\s*(NIC\/Company No:)\s*_{5,}/' => function($matches) use ($mapping) {
                    return $matches[1] . ' ' . $matches[2] . ' ' . ($mapping['borrower_nic'] ?? '________________');
                },
            ];

            foreach ($patterns as $pattern => $replacementCallback) {
                $content = preg_replace_callback($pattern, $replacementCallback, $content);
            }

            $zip->addFromString($entryName, $content);
        }

        $zip->close();
        return true;
    }

    private function shiftByRefundOption(\DateTimeImmutable $date, string $refundOption, int $steps = 1): \DateTimeImmutable
    {
        $safeSteps = max($steps, 1);

        if ($refundOption === 'day') {
            return $date->modify('+' . $safeSteps . ' days');
        }

        if ($refundOption === 'week') {
            return $date->modify('+' . ($safeSteps * 7) . ' days');
        }

        return $date->modify('+' . $safeSteps . ' months');
    }

    private function canReviewLoan(?object $user): bool
    {
        if (!$user) {
            return false;
        }

        if ((string)$user->email === 'superadmin@softcodelk.com') {
            return true;
        }

        $designationName = strtolower((string)optional($user->designation)->name);

        return str_contains($designationName, 'manager');
    }

    public function index(Request $request)
    {
        $status = $request->get('status');
        $branchId = (int)$request->get('branch_id', 0);
        $fieldOfficer = trim((string)$request->get('field_officer', ''));

        $query = MicrofinanceLoanRequest::with([
            'route:id,name,code',
            'center:id,name,code',
            'group:id,name,code',
            'guarantors',
            'documents',
        ])->orderBy('id', 'desc');

        if ($status) {
            $query->where('status', $status);
        }

        if ($branchId > 0) {
            $query->where('branch_id', $branchId);
        }

        if ($fieldOfficer !== '') {
            $query->whereRaw('LOWER(TRIM(field_officer)) = ?', [mb_strtolower($fieldOfficer)]);
        }

        return response()->json($query->get());
    }

    public function meta(Request $request)
    {
        $scope = $request->get('loan_scope', 'center_loan');
        $routeId = (int)$request->get('mf_route_id');
        $centerId = (int)$request->get('mf_center_id');

        if (!in_array($scope, ['route_loan', 'center_loan', 'direct_loan'], true)) {
            return response()->json(['message' => 'Invalid loan scope.'], 422);
        }

        if ($scope === 'route_loan' && !$routeId) {
            return response()->json([
                'customer_no' => null,
                'registered_customer_count' => 0,
                'issued_loan_count' => 0,
            ]);
        }

        if ($scope === 'center_loan' && (!$routeId || !$centerId)) {
            return response()->json([
                'customer_no' => null,
                'registered_customer_count' => 0,
                'issued_loan_count' => 0,
            ]);
        }

        $query = MicrofinanceLoanRequest::query()->where('loan_scope', $scope);
        $codePrefix = 'DL';

        if ($scope === 'route_loan') {
            $route = MicrofinanceRoute::find($routeId);
            if (!$route) {
                return response()->json(['message' => 'Invalid route.'], 422);
            }

            $query->where('mf_route_id', $routeId);
            $codePrefix = sprintf('RL-%s', strtoupper($route->code));
        }

        if ($scope === 'center_loan') {
            $route = MicrofinanceRoute::find($routeId);
            $center = MicrofinanceCenter::find($centerId);

            if (!$route || !$center) {
                return response()->json(['message' => 'Invalid route or center.'], 422);
            }

            $query->where('mf_route_id', $routeId)
                ->where('mf_center_id', $centerId);

            $codePrefix = sprintf('CL-%s-%s', strtoupper($route->code), strtoupper($center->code));
        }

        $loanCount = (clone $query)->count();
        $issuedLoanCount = (clone $query)->where('status', 'released')->count();

        $customerNo = sprintf('%s-L%04d', $codePrefix, $loanCount + 1);
        $registeredCustomerCount = $loanCount;

        return response()->json([
            'customer_no' => $customerNo,
            'registered_customer_count' => $registeredCustomerCount,
            'issued_loan_count' => $issuedLoanCount,
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'branch_id' => 'nullable|exists:companies,id',
            'manager_employee_id' => 'nullable|exists:employees,id',
            'loan_scope' => 'required|in:route_loan,center_loan,direct_loan',
            'mf_route_id' => 'nullable|exists:mf_routes,id|required_if:loan_scope,route_loan,center_loan',
            'mf_center_id' => 'nullable|exists:mf_centers,id|required_if:loan_scope,center_loan',
            'mf_group_id' => 'nullable|exists:mf_groups,id|required_if:loan_scope,center_loan',
            'manager_name' => 'required|string|max:255',
            'field_officer' => 'required|string|max:255',
            'group_leader' => 'nullable|string|max:255',
            'loan_code' => 'nullable|string|max:100',
            'customer_no' => 'nullable|string|max:100',
            'customer_code' => 'required|string|max:60|unique:mf_loan_requests,customer_no',
            'customer_name' => 'required|string|max:255',
            'nick_name' => 'nullable|string|max:255',
            'nic' => 'required|string|max:100',
            'address' => 'required|string',
            'contact_no' => 'required|string|max:100',
            'loan_amount' => 'required|numeric|min:0',
            'reason' => 'nullable|string',
            'refund_option' => 'required|in:day,week,month',
            'interest_type' => 'required|in:flat,reducing',
            'interest_rate' => 'required|numeric|min:0',
            'terms_count' => 'required|integer|min:1',
            'refundable_amount' => 'required|numeric|min:0',
            'installment_amount' => 'required|numeric|min:0',
            'document_charges' => 'nullable|numeric|min:0',
            'stamp_charges' => 'nullable|numeric|min:0',
            'insurance_charges' => 'nullable|numeric|min:0',
            'charge_payment_mode' => 'required|in:deduct_from_loan,hand_cash',
            'loan_request_date' => 'required|date',
            'guarantors' => 'nullable|array',
            'guarantors.*.name' => 'required|string|max:255',
            'guarantors.*.nic' => 'nullable|string|max:100',
            'guarantors.*.address' => 'nullable|string',
            'guarantors.*.contact_no' => 'nullable|string|max:100',
            'guarantors.*.relationship' => 'nullable|string|max:100',
        ]);

        $validated['nic'] = strtoupper(trim((string)$validated['nic']));
        $validated['customer_code'] = strtoupper(trim((string)($validated['customer_code'] ?? '')));
        if ($validated['customer_code'] === '') {
            return response()->json([
                'message' => 'Customer number is required.'
            ], 422);
        }

        $validated['loan_code'] = strtoupper(trim((string)($validated['loan_code'] ?? $validated['customer_no'] ?? '')));

        // Persist customer_no from the dedicated customer number input field.
        $validated['customer_no'] = $validated['customer_code'];

        $scope = $validated['loan_scope'];
        $routeId = $validated['mf_route_id'] ?? null;
        $centerId = $validated['mf_center_id'] ?? null;
        $groupId = $validated['mf_group_id'] ?? null;

        if ($scope === 'direct_loan') {
            $routeId = null;
            $centerId = null;
            $groupId = null;
        }

        if ($scope === 'route_loan') {
            $centerId = null;
            $groupId = null;
        }

        if ($scope === 'center_loan') {
            $center = MicrofinanceCenter::findOrFail($centerId);
            $group = MicrofinanceGroup::findOrFail($groupId);

            if ((int)$center->mf_route_id !== (int)$routeId) {
                return response()->json(['message' => 'Selected center does not belong to selected route.'], 422);
            }

            if ((int)$group->mf_route_id !== (int)$routeId) {
                return response()->json(['message' => 'Selected group does not belong to selected route.'], 422);
            }

            if ((int)$group->mf_center_id !== (int)$centerId) {
                return response()->json(['message' => 'Selected group does not belong to selected center.'], 422);
            }
        }

        $loanAmount = (float)$validated['loan_amount'];
        $totalCharges = (float)($validated['document_charges'] ?? 0)
            + (float)($validated['stamp_charges'] ?? 0)
            + (float)($validated['insurance_charges'] ?? 0);

        if ($validated['charge_payment_mode'] === 'deduct_from_loan' && $totalCharges > $loanAmount) {
            return response()->json([
                'message' => 'Total charges cannot exceed loan amount when deducting charges from the loan.'
            ], 422);
        }

        $managerEmployee = null;
        if (!empty($validated['manager_employee_id'])) {
            $managerEmployee = Employee::find($validated['manager_employee_id']);
        }

        if (!$managerEmployee && !empty($validated['manager_name'])) {
            $managerEmployee = Employee::query()
                ->whereRaw("TRIM(CONCAT(first_name, ' ', last_name)) = ?", [$validated['manager_name']])
                ->orWhere('email', $validated['manager_name'])
                ->first();
        }

        $loanRequest = DB::transaction(function () use ($request, $validated, $loanAmount, $totalCharges, $managerEmployee, $scope, $routeId, $centerId, $groupId) {
            $resolvedBranchId = $validated['branch_id']
                ?? optional($managerEmployee)->branch_id
                ?? optional($request->user())->branch_id;

            $customerName = trim((string)$validated['customer_name']);
            $nameParts = preg_split('/\s+/', $customerName, 2);
            $firstName = trim($nameParts[0] ?? 'Customer');
            $lastName = trim($nameParts[1] ?? '');

            if ($lastName === '') {
                $lastName = 'Customer';
            }

            $tenantId = optional($request->user())->tenant_id ?? $resolvedBranchId ?? 1;
            $branchId = $resolvedBranchId ?? optional($request->user())->branch_id ?? 1;
            $createdBy = optional($request->user())->id ?? 1;

            $loanRequest = MicrofinanceLoanRequest::create([
                'branch_id' => $resolvedBranchId,
                'loan_scope' => $scope,
                'mf_route_id' => $routeId,
                'mf_center_id' => $centerId,
                'mf_group_id' => $groupId,
                'manager_name' => $validated['manager_name'],
                'field_officer' => $validated['field_officer'],
                'group_leader' => $validated['group_leader'] ?? '',
                'loan_code' => $validated['loan_code'] !== '' ? $validated['loan_code'] : null,
                'customer_no' => $validated['customer_no'],
                'customer_name' => $validated['customer_name'],
                'nick_name' => $validated['nick_name'] ?? null,
                'nic' => $validated['nic'],
                'address' => $validated['address'],
                'contact_no' => $validated['contact_no'],
                'loan_amount' => $validated['loan_amount'],
                'reason' => $validated['reason'] ?? null,
                'refund_option' => $validated['refund_option'],
                'interest_type' => $validated['interest_type'],
                'interest_rate' => $validated['interest_rate'],
                'terms_count' => $validated['terms_count'],
                'refundable_amount' => $validated['refundable_amount'],
                'installment_amount' => $validated['installment_amount'],
                'document_charges' => $validated['document_charges'] ?? 0,
                'stamp_charges' => $validated['stamp_charges'] ?? 0,
                'insurance_charges' => $validated['insurance_charges'] ?? 0,
                'charge_payment_mode' => $validated['charge_payment_mode'],
                'net_disbursed_amount' => $validated['charge_payment_mode'] === 'deduct_from_loan'
                    ? $loanAmount - $totalCharges
                    : $loanAmount,
                'loan_request_date' => $validated['loan_request_date'],
                'status' => 'requested',
                'created_by' => optional($request->user())->id,
            ]);

            $existingCustomer = Customer::query()
                ->where('nic_passport', $validated['nic'])
                ->first();

            if ($existingCustomer) {
                $existingCustomer->update([
                    'customer_code' => $validated['customer_code'] !== '' ? $validated['customer_code'] : $existingCustomer->customer_code,
                    'first_name' => $firstName,
                    'last_name' => $lastName,
                    'phone' => $validated['contact_no'],
                    'permanent_address' => $validated['address'],
                    'current_address' => $validated['address'],
                    'status' => 'active',
                ]);
            } else {
                $safeNic = strtolower((string)$validated['nic']);
                $safeNic = preg_replace('/[^a-z0-9]/', '', $safeNic);
                if ($safeNic === '') {
                    $safeNic = 'customer' . $loanRequest->id;
                }

                Customer::create([
                    'tenant_id' => $tenantId,
                    'branch_id' => $branchId,
                    'customer_code' => $validated['customer_code'],
                    'first_name' => $firstName,
                    'last_name' => $lastName,
                    'email' => sprintf('%s-%d@deskoffinance.local', $safeNic, (int)$loanRequest->id),
                    'phone' => $validated['contact_no'],
                    'nic_passport' => $validated['nic'],
                    'date_of_birth' => '1990-01-01',
                    'gender' => 'other',
                    'permanent_address' => $validated['address'],
                    'current_address' => $validated['address'],
                    'created_by' => $createdBy,
                    'status' => 'active',
                ]);
            }

            foreach ($validated['guarantors'] ?? [] as $guarantor) {
                $loanRequest->guarantors()->create([
                    'name' => $guarantor['name'],
                    'nic' => $guarantor['nic'] ?? null,
                    'address' => $guarantor['address'] ?? null,
                    'contact_no' => $guarantor['contact_no'] ?? null,
                    'relationship' => $guarantor['relationship'] ?? null,
                ]);
            }

            return $loanRequest;
        });

        return response()->json(
            $loanRequest->load([
                'route:id,name,code',
                'center:id,name,code',
                'group:id,name,code',
                'guarantors',
                'documents',
            ]),
            201
        );
    }

    public function update(Request $request, MicrofinanceLoanRequest $loanRequest)
    {
        $validated = $request->validate([
            'loan_scope' => 'required|in:route_loan,center_loan,direct_loan',
            'mf_route_id' => 'nullable|exists:mf_routes,id|required_if:loan_scope,route_loan,center_loan',
            'mf_center_id' => 'nullable|exists:mf_centers,id|required_if:loan_scope,center_loan',
            'mf_group_id' => 'nullable|exists:mf_groups,id|required_if:loan_scope,center_loan',
            'manager_name' => 'required|string|max:255',
            'field_officer' => 'required|string|max:255',
            'group_leader' => 'nullable|string|max:255',
            'loan_code' => 'nullable|string|max:100',
            'customer_name' => 'required|string|max:255',
            'nick_name' => 'nullable|string|max:255',
            'address' => 'required|string',
            'contact_no' => 'required|string|max:100',
            'reason' => 'nullable|string',
            'loan_amount' => 'required|numeric|min:0',
            'refund_option' => 'required|in:day,week,month',
            'interest_type' => 'required|in:flat,reducing',
            'interest_rate' => 'required|numeric|min:0',
            'terms_count' => 'required|integer|min:1',
            'refundable_amount' => 'required|numeric|min:0',
            'installment_amount' => 'required|numeric|min:0',
            'document_charges' => 'nullable|numeric|min:0',
            'stamp_charges' => 'nullable|numeric|min:0',
            'insurance_charges' => 'nullable|numeric|min:0',
            'charge_payment_mode' => 'required|in:deduct_from_loan,hand_cash',
            'loan_request_date' => 'nullable|date',
            'guarantors' => 'nullable|array',
            'guarantors.*.name' => 'required|string|max:255',
            'guarantors.*.nic' => 'nullable|string|max:100',
            'guarantors.*.address' => 'nullable|string',
            'guarantors.*.contact_no' => 'nullable|string|max:100',
            'guarantors.*.relationship' => 'nullable|string|max:100',
        ]);

        $scope = $validated['loan_scope'];
        $routeId = $validated['mf_route_id'] ?? null;
        $centerId = $validated['mf_center_id'] ?? null;
        $groupId = $validated['mf_group_id'] ?? null;

        if ($scope === 'direct_loan') {
            $routeId = null;
            $centerId = null;
            $groupId = null;
        }

        if ($scope === 'route_loan') {
            $centerId = null;
            $groupId = null;
        }

        if ($scope === 'center_loan') {
            $center = MicrofinanceCenter::findOrFail($centerId);
            $group = MicrofinanceGroup::findOrFail($groupId);

            if ((int)$center->mf_route_id !== (int)$routeId) {
                return response()->json(['message' => 'Selected center does not belong to selected route.'], 422);
            }

            if ((int)$group->mf_route_id !== (int)$routeId) {
                return response()->json(['message' => 'Selected group does not belong to selected route.'], 422);
            }

            if ((int)$group->mf_center_id !== (int)$centerId) {
                return response()->json(['message' => 'Selected group does not belong to selected center.'], 422);
            }
        }

        $loanAmount = (float) $validated['loan_amount'];
        $totalCharges = (float) ($validated['document_charges'] ?? 0)
            + (float) ($validated['stamp_charges'] ?? 0)
            + (float) ($validated['insurance_charges'] ?? 0);

        if ($validated['charge_payment_mode'] === 'deduct_from_loan' && $totalCharges > $loanAmount) {
            return response()->json([
                'message' => 'Total charges cannot exceed loan amount when deducting charges from the loan.'
            ], 422);
        }

        $loanRequest->fill([
            'loan_scope' => $scope,
            'mf_route_id' => $routeId,
            'mf_center_id' => $centerId,
            'mf_group_id' => $groupId,
            'manager_name' => $validated['manager_name'],
            'field_officer' => $validated['field_officer'],
            'group_leader' => $validated['group_leader'] ?? '',
            'loan_code' => array_key_exists('loan_code', $validated)
                ? (trim((string)$validated['loan_code']) !== '' ? strtoupper(trim((string)$validated['loan_code'])) : null)
                : $loanRequest->loan_code,
            'customer_name' => $validated['customer_name'],
            'nick_name' => $validated['nick_name'] ?? null,
            'address' => $validated['address'],
            'contact_no' => $validated['contact_no'],
            'reason' => $validated['reason'] ?? null,
            'loan_amount' => $validated['loan_amount'],
            'refund_option' => $validated['refund_option'],
            'interest_type' => $validated['interest_type'],
            'interest_rate' => $validated['interest_rate'],
            'terms_count' => $validated['terms_count'],
            'refundable_amount' => $validated['refundable_amount'],
            'installment_amount' => $validated['installment_amount'],
            'document_charges' => $validated['document_charges'] ?? 0,
            'stamp_charges' => $validated['stamp_charges'] ?? 0,
            'insurance_charges' => $validated['insurance_charges'] ?? 0,
            'charge_payment_mode' => $validated['charge_payment_mode'],
            'net_disbursed_amount' => $validated['charge_payment_mode'] === 'deduct_from_loan'
                ? max($loanAmount - $totalCharges, 0)
                : $loanAmount,
            'loan_request_date' => $validated['loan_request_date'] ?? $loanRequest->loan_request_date,
        ]);

        $loanRequest->save();

        if (array_key_exists('guarantors', $validated)) {
            $loanRequest->guarantors()->delete();

            foreach ($validated['guarantors'] ?? [] as $guarantor) {
                $loanRequest->guarantors()->create([
                    'name' => $guarantor['name'],
                    'nic' => $guarantor['nic'] ?? null,
                    'address' => $guarantor['address'] ?? null,
                    'contact_no' => $guarantor['contact_no'] ?? null,
                    'relationship' => $guarantor['relationship'] ?? null,
                ]);
            }
        }

        $customerName = trim((string) $loanRequest->customer_name);
        $nameParts = preg_split('/\s+/', $customerName, 2);
        $firstName = trim($nameParts[0] ?? 'Customer');
        $lastName = trim($nameParts[1] ?? 'Customer');

        $customer = Customer::query()
            ->where('nic_passport', $loanRequest->nic)
            ->first();

        if ($customer) {
            $customer->update([
                'first_name' => $firstName,
                'last_name' => $lastName,
                'phone' => $loanRequest->contact_no,
                'permanent_address' => $loanRequest->address,
                'current_address' => $loanRequest->address,
            ]);
        }

        return response()->json([
            'message' => 'Loan updated successfully.',
            'data' => $loanRequest->load([
                'route:id,name,code',
                'center:id,name,code',
                'group:id,name,code',
                'guarantors',
                'documents',
            ]),
        ]);
    }

    public function updateLifecycle(Request $request, MicrofinanceLoanRequest $loanRequest)
    {
        $validated = $request->validate([
            'action' => 'required|in:hold,close',
            'reason' => 'nullable|string|max:1000',
        ]);

        $action = (string) $validated['action'];
        $status = strtolower((string) $loanRequest->status);

        if ($action === 'hold') {
            if (!in_array($status, ['approved', 'released'], true)) {
                return response()->json([
                    'message' => 'Only approved or released loans can be put on hold.'
                ], 422);
            }

            $loanRequest->status = 'hold';
            $loanRequest->due_date = null;
            $loanRequest->next_payment_date = null;
            $loanRequest->penalty_starts_on = null;
            $loanRequest->arrears_balance = 0;
            $loanRequest->hold_at = now();
            $loanRequest->hold_reason = $validated['reason'] ?? null;
            $loanRequest->save();

            return response()->json([
                'message' => 'Loan has been put on hold. Due date and arrears calculations are paused.',
                'data' => $loanRequest,
            ]);
        }

        if (!in_array($status, ['requested', 'approved', 'released', 'hold'], true)) {
            return response()->json([
                'message' => 'This loan cannot be marked as closed from its current status.'
            ], 422);
        }

        $loanRequest->status = 'closed';
        $loanRequest->due_date = null;
        $loanRequest->next_payment_date = null;
        $loanRequest->penalty_starts_on = null;
        $loanRequest->arrears_balance = 0;
        $loanRequest->closed_at = now();
        $loanRequest->closed_reason = $validated['reason'] ?? null;
        $loanRequest->save();

        return response()->json([
            'message' => 'Loan has been marked as closed.',
            'data' => $loanRequest,
        ]);
    }

    public function storeDocuments(Request $request, MicrofinanceLoanRequest $loanRequest)
    {
        $validated = $request->validate([
            'document_types' => 'required|array|min:1',
            'document_types.*' => 'required|string|max:120',
            'documents' => 'required|array|min:1',
            'documents.*' => 'required|file|max:10240',
        ]);

        $documentTypes = $validated['document_types'];
        $documents = $request->file('documents', []);

        if (count($documentTypes) !== count($documents)) {
            return response()->json([
                'message' => 'Document type count and uploaded file count must be equal.'
            ], 422);
        }

        $saved = [];

        foreach ($documents as $index => $file) {
            $path = $file->store('public/microfinance/loan-requests/' . $loanRequest->id . '/documents');

            $saved[] = $loanRequest->documents()->create([
                'document_type' => $documentTypes[$index],
                'file_path' => $path,
                'original_name' => $file->getClientOriginalName(),
                'uploaded_by' => optional($request->user())->id,
            ]);
        }

        return response()->json([
            'message' => 'Documents uploaded successfully.',
            'data' => $saved,
        ], 201);
    }

    public function approve(Request $request, MicrofinanceLoanRequest $loanRequest)
    {
        if ($loanRequest->status !== 'requested') {
            return response()->json([
                'message' => 'Only requested loans can be approved.'
            ], 422);
        }

        $user = $request->user();
        $designationName = strtolower((string)optional($user->designation)->name);
        $loanAmount = (float)$loanRequest->loan_amount;

        $canApprove = false;

        // Assistant manager: must be strictly under 10000.
        if (str_contains($designationName, 'assistant manager')) {
            $canApprove = $loanAmount < 10000;
        } elseif (str_contains($designationName, 'manager')) {
            // Manager: can approve up to and including 10000.
            $canApprove = $loanAmount <= 10000;
        }

        if ((string)$user->email === 'superadmin@softcodelk.com') {
            $canApprove = true;
        }

        if (!$canApprove) {
            return response()->json([
                'message' => 'You are not allowed to approve this loan amount.'
            ], 403);
        }

        $penaltySetting = MicrofinancePenaltySetting::query()
            ->where('is_active', true)
            ->orderByDesc('id')
            ->first();

        if (!$penaltySetting) {
            return response()->json([
                'message' => 'Please configure an active penalty rate in Microfinance Settings before approving loans.'
            ], 422);
        }

        $graceDays = 2;
        $approveDate = new \DateTimeImmutable(date('Y-m-d'));
        $refundOption = (string)$loanRequest->refund_option;
        $termCount = max((int)$loanRequest->terms_count, 1);

        $nextPaymentDate = $this->shiftByRefundOption($approveDate, $refundOption, 1)->format('Y-m-d');
        $dueDate = $nextPaymentDate;
        $loanEndDate = $this->shiftByRefundOption($approveDate, $refundOption, $termCount)->format('Y-m-d');

        $penaltyStartsOn = (new \DateTimeImmutable($dueDate))
            ->modify('+' . ($graceDays + 1) . ' days')
            ->format('Y-m-d');

        $loanRequest->status = 'approved';
        $loanRequest->next_payment_date = $nextPaymentDate;
        $loanRequest->setAttribute('due_date', $dueDate);
        $loanRequest->loan_end_date = $loanEndDate;
        $loanRequest->arrears_balance = 0;
        $loanRequest->penalty_rate = $penaltySetting->penalty_rate;
        $loanRequest->penalty_grace_days = $graceDays;
        $loanRequest->penalty_starts_on = $penaltyStartsOn;
        $loanRequest->save();

        return response()->json([
            'message' => 'Loan approved successfully.',
            'data' => $loanRequest->load([
                'route:id,name,code',
                'center:id,name,code',
                'group:id,name,code',
                'guarantors',
            ]),
        ]);
    }

    public function reject(Request $request, MicrofinanceLoanRequest $loanRequest)
    {
        $validated = $request->validate([
            'rejection_reason' => 'nullable|string|max:1000',
        ]);

        if ($loanRequest->status !== 'requested') {
            return response()->json([
                'message' => 'Only requested loans can be rejected.'
            ], 422);
        }

        if (!$this->canReviewLoan($request->user())) {
            return response()->json([
                'message' => 'You are not allowed to reject this loan.'
            ], 403);
        }

        $loanRequest->status = 'rejected';
        $loanRequest->rejection_reason = $validated['rejection_reason'] ?? null;
        $loanRequest->rejected_at = now();
        $loanRequest->save();

        return response()->json([
            'message' => 'Loan rejected successfully.',
            'data' => $loanRequest,
        ]);
    }

    public function requestDocuments(Request $request, MicrofinanceLoanRequest $loanRequest)
    {
        $validated = $request->validate([
            'document_request_note' => 'nullable|string|max:1000',
        ]);

        if ($loanRequest->status !== 'requested') {
            return response()->json([
                'message' => 'Document request can be sent only for requested loans.'
            ], 422);
        }

        if (!$this->canReviewLoan($request->user())) {
            return response()->json([
                'message' => 'You are not allowed to request documents for this loan.'
            ], 403);
        }

        $loanRequest->documents_requested = true;
        $loanRequest->document_request_note = $validated['document_request_note'] ?? null;
        $loanRequest->document_requested_at = now();
        $loanRequest->save();

        return response()->json([
            'message' => 'Document request has been marked for this loan.',
            'data' => $loanRequest,
        ]);
    }

    public function downloadAgreement(Request $request, MicrofinanceLoanRequest $loanRequest)
    {
        $companyId = (int) ($loanRequest->branch_id ?: 0);
        if ($companyId <= 0) {
            Log::warning('Download agreement failed: No company ID for loan request', ['loan_id' => $loanRequest->id]);
            return response()->json([
                'message' => 'Company is not linked to this loan request.'
            ], 422);
        }

        $template = CompanyDocumentTemplate::query()
            ->where('company_id', $companyId)
            ->where('template_type', 'loan_agreement')
            ->where('is_active', true)
            ->latest('id')
            ->first();

        if (!$template) {
            Log::warning('Download agreement failed: No active template found', [
                'company_id' => $companyId,
                'loan_id' => $loanRequest->id
            ]);
            return response()->json([
                'message' => 'Active loan agreement template not found for this company.'
            ], 404);
        }

        if (!Storage::disk('public')->exists($template->file_path)) {
            Log::error('Download agreement failed: Template file not found', [
                'template_id' => $template->id,
                'file_path' => $template->file_path,
                'loan_id' => $loanRequest->id
            ]);
            return response()->json([
                'message' => 'Template file does not exist in storage.'
            ], 404);
        }

        $inputPath = Storage::disk('public')->path($template->file_path);
        $placeholderKeys = $this->extractPlaceholdersFromDocx($inputPath);

        Log::info('Download agreement processing', [
            'loan_id' => $loanRequest->id,
            'template_id' => $template->id,
            'placeholders_found' => count($placeholderKeys),
            'placeholder_keys' => $placeholderKeys
        ]);

        $loanData = $this->buildLoanAgreementVariables($loanRequest->load(['route:id,name,code', 'center:id,name,code', 'group:id,name,code']));
        $mapping = $this->mapPlaceholdersWithOpenAi($placeholderKeys, $loanData);

        Log::info('Placeholder mapping completed', [
            'loan_id' => $loanRequest->id,
            'mapping_count' => count($mapping),
            'sample_mapping' => array_slice($mapping, 0, 5)
        ]);

        $tempBase = tempnam(sys_get_temp_dir(), 'loan_agreement_');
        $outputPath = $tempBase . '.docx';
        @unlink($tempBase);

        $filled = $this->fillDocxTemplate($inputPath, $outputPath, $mapping);
        if (!$filled) {
            Log::error('Download agreement failed: Template filling failed', [
                'loan_id' => $loanRequest->id,
                'template_id' => $template->id,
                'input_path' => $inputPath,
                'output_path' => $outputPath
            ]);
            return response()->json([
                'message' => 'Failed to generate agreement document.'
            ], 500);
        }

        $downloadName = 'loan_agreement_' . ($loanRequest->customer_no ?: $loanRequest->id) . '.docx';

        Log::info('Download agreement successful', [
            'loan_id' => $loanRequest->id,
            'download_name' => $downloadName
        ]);

        return response()->download(
            $outputPath,
            $downloadName,
            ['Content-Type' => 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
        )->deleteFileAfterSend(true);
    }
}
