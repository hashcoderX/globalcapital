<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AccountingExpense;
use App\Models\Company;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Schema;

class AiAssistantController extends Controller
{
    public function chat(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'message' => 'required|string|max:2000',
            'skill' => 'nullable|string|in:overview,hr,finance,microfinance,operations',
        ]);

        $apiKey = trim((string) env('OPENAI_API_KEY', ''));
        if ($apiKey === '') {
            return response()->json([
                'message' => 'AI assistant is not configured. Add OPENAI_API_KEY in backend .env file.',
            ], 503);
        }

        $skill = (string) ($validated['skill'] ?? 'overview');
        $question = (string) $validated['message'];
        $model = trim((string) env('OPENAI_MODEL', 'gpt-4o-mini'));
        $user = $request->user();

        $expenseCreation = $this->tryCreateExpenseFromPrompt($request, $question);
        if ($expenseCreation !== null) {
            return response()->json($expenseCreation);
        }

        $systemContext = $this->buildSystemContext($skill, $user ? [
            'id' => (int) $user->id,
            'name' => (string) ($user->name ?? ''),
            'email' => (string) ($user->email ?? ''),
            'designation_id' => $user->designation_id ? (int) $user->designation_id : null,
            'branch_id' => $user->branch_id ? (int) $user->branch_id : null,
        ] : null, $question);

        $payload = [
            'model' => $model,
            'temperature' => 0.2,
            'messages' => [
                [
                    'role' => 'system',
                    'content' => 'You are the internal GlobalCapital AI assistant. Use only provided system_context for factual claims. If data is missing, say so clearly. Never reveal secrets, API keys, tokens, or credentials. Keep responses practical and concise.',
                ],
                [
                    'role' => 'user',
                    'content' => json_encode([
                        'skill' => $skill,
                        'system_context' => $systemContext,
                        'question' => $question,
                    ], JSON_UNESCAPED_UNICODE),
                ],
            ],
        ];

        try {
            $response = Http::withToken($apiKey)
                ->timeout(40)
                ->post('https://api.openai.com/v1/chat/completions', $payload);

            if (!$response->successful()) {
                $providerError = (string) data_get($response->json(), 'error.message', '');
                $providerCode = (string) data_get($response->json(), 'error.code', '');
                $status = (int) $response->status();

                $userMessage = 'AI provider request failed. Please try again.';
                if ($status === 401) {
                    $userMessage = 'AI provider authentication failed. Please verify OPENAI_API_KEY.';
                } elseif ($status === 429 || $providerCode === 'insufficient_quota') {
                    $userMessage = 'AI provider quota exceeded. Please check OpenAI billing and usage limits.';
                } elseif ($status >= 500) {
                    $userMessage = 'AI provider is temporarily unavailable. Please try again shortly.';
                } elseif ($providerError !== '') {
                    $userMessage = $providerError;
                }

                Log::warning('AI assistant request failed', [
                    'status' => $status,
                    'provider_code' => $providerCode,
                    'provider_message' => $providerError,
                    'body' => mb_substr((string) $response->body(), 0, 500),
                ]);

                return response()->json([
                    'message' => $userMessage,
                ], 502);
            }

            $answer = trim((string) data_get($response->json(), 'choices.0.message.content', ''));
            if ($answer === '') {
                return response()->json([
                    'message' => 'AI provider returned an empty response. Please try again.',
                ], 502);
            }

            return response()->json([
                'answer' => $answer,
                'skill' => $skill,
                'model' => $model,
                'context_snapshot' => [
                    'generated_at' => now()->toIso8601String(),
                    'counts' => data_get($systemContext, 'counts', []),
                ],
            ]);
        } catch (\Throwable $e) {
            Log::error('AI assistant chat failed', [
                'message' => $e->getMessage(),
            ]);

            return response()->json([
                'message' => 'AI assistant is temporarily unavailable.',
            ], 500);
        }
    }

    private function buildSystemContext(string $skill, ?array $authUser, string $question = ''): array
    {
        $branchId = (int) ($authUser['branch_id'] ?? 0);

        $counts = [
            'users' => $this->tableCountIfExists('users'),
            'companies' => $this->tableCountIfExists('companies'),
            'employees' => $this->tableCountIfExists('employees'),
            'customers' => $this->tableCountIfExists('customers'),
            'notifications' => $this->tableCountIfExists('user_notifications'),
            'savings_accounts' => $this->tableCountIfExists('savings_accounts'),
            'microfinance_loan_requests' => $this->tableCountIfExists('mf_loan_requests'),
            'mortgages' => $this->tableCountIfExists('mortgages'),
        ];

        $microfinance = $this->buildMicrofinanceContext($branchId > 0 ? $branchId : null);
        $companyOverview = $this->buildCompanyOverviewContext($branchId > 0 ? $branchId : null, $question);
        $accountingExpenses = $this->buildAccountingExpenseContext($branchId > 0 ? $branchId : null);
        $customers = $this->buildCustomerContext($branchId > 0 ? $branchId : null, $question);
        $hr = $this->buildHrContext($branchId > 0 ? $branchId : null, $question);

        $skillFocus = [
            'overview' => 'Cross-module high-level system overview.',
            'hr' => 'Employee and organization related insights.',
            'finance' => 'Accounting and finance related insights.',
            'microfinance' => 'Microfinance requests and collections insights.',
            'operations' => 'Operational status and usage overview.',
        ];

        return [
            'app_name' => (string) config('app.name', 'GlobalCapital'),
            'generated_at' => now()->toIso8601String(),
            'timezone' => (string) config('app.timezone', 'UTC'),
            'skill' => $skill,
            'skill_focus' => (string) ($skillFocus[$skill] ?? $skillFocus['overview']),
            'auth_user' => $authUser,
            'counts' => $counts,
            'company' => $companyOverview,
            'accounting_expenses' => $accountingExpenses,
            'customers' => $customers,
            'hr' => $hr,
            'microfinance' => $microfinance,
        ];
    }

    private function buildCustomerContext(?int $branchId = null, string $question = ''): array
    {
        $tables = [
            'customers' => 'customers',
            'customer_documents' => 'customer_documents',
            'savings_accounts' => 'savings_accounts',
        ];

        $tableAvailability = [];
        $counts = [];
        foreach ($tables as $key => $table) {
            $exists = Schema::hasTable($table);
            $tableAvailability[$key] = $exists;
            $counts[$key] = $exists ? (int) DB::table($table)->count() : null;
        }

        if (!Schema::hasTable('customers')) {
            return [
                'table_availability' => $tableAvailability,
                'counts' => $counts,
                'summary' => null,
                'recent_customers' => [],
                'customer_detail_lookup' => null,
            ];
        }

        $baseQuery = DB::table('customers');
        if ($branchId && Schema::hasColumn('customers', 'branch_id')) {
            $baseQuery->where('branch_id', $branchId);
        }

        $statusExists = Schema::hasColumn('customers', 'status');
        $summary = [
            'total' => (int) (clone $baseQuery)->count(),
            'active' => $statusExists ? (int) (clone $baseQuery)->where('status', 'active')->count() : null,
            'inactive' => $statusExists ? (int) (clone $baseQuery)->where('status', 'inactive')->count() : null,
            'sample_generated_code' => 'CUS-' . now()->format('ymd') . '-00001',
        ];

        $recentCols = array_values(array_filter([
            'id',
            Schema::hasColumn('customers', 'customer_code') ? 'customer_code' : null,
            Schema::hasColumn('customers', 'first_name') ? 'first_name' : null,
            Schema::hasColumn('customers', 'last_name') ? 'last_name' : null,
            Schema::hasColumn('customers', 'email') ? 'email' : null,
            Schema::hasColumn('customers', 'phone') ? 'phone' : null,
            Schema::hasColumn('customers', 'nic_passport') ? 'nic_passport' : null,
            Schema::hasColumn('customers', 'status') ? 'status' : null,
            Schema::hasColumn('customers', 'created_at') ? 'created_at' : null,
        ]));

        $recentCustomers = (clone $baseQuery)
            ->select($recentCols)
            ->orderByDesc('id')
            ->limit(12)
            ->get()
            ->map(function ($row) {
                return [
                    'id' => (int) ($row->id ?? 0),
                    'customer_code' => (string) ($row->customer_code ?? ''),
                    'name' => trim((string) (($row->first_name ?? '') . ' ' . ($row->last_name ?? ''))),
                    'email' => (string) ($row->email ?? ''),
                    'phone' => (string) ($row->phone ?? ''),
                    'nic_passport' => (string) ($row->nic_passport ?? ''),
                    'status' => (string) ($row->status ?? ''),
                ];
            })
            ->values()
            ->all();

        $lookup = $this->buildCustomerDetailLookup($question, $branchId);

        return [
            'table_availability' => $tableAvailability,
            'counts' => $counts,
            'summary' => $summary,
            'recent_customers' => $recentCustomers,
            'customer_detail_lookup' => $lookup,
        ];
    }

    private function buildCustomerDetailLookup(string $question, ?int $branchId = null): ?array
    {
        if (!Schema::hasTable('customers')) {
            return null;
        }

        $normalized = trim(mb_strtolower($question));
        if ($normalized === '' || !str_contains($normalized, 'customer')) {
            return null;
        }

        $searchTerm = $this->extractCustomerSearchTerm($question);
        $query = DB::table('customers');

        if ($branchId && Schema::hasColumn('customers', 'branch_id')) {
            $query->where('branch_id', $branchId);
        }

        if ($searchTerm !== '') {
            $upper = strtoupper(trim($searchTerm));

            $query->where(function ($q) use ($upper, $searchTerm) {
                if (ctype_digit($upper) && strlen($upper) <= 5 && Schema::hasColumn('customers', 'customer_code')) {
                    $serial = str_pad($upper, 5, '0', STR_PAD_LEFT);
                    $q->orWhere('customer_code', 'like', '%-' . $serial);
                }

                if (Schema::hasColumn('customers', 'customer_code')) {
                    $q->orWhereRaw('UPPER(customer_code) = ?', [$upper]);
                }

                if (Schema::hasColumn('customers', 'nic_passport')) {
                    $q->orWhereRaw('UPPER(nic_passport) = ?', [$upper]);
                }

                $like = '%' . str_replace(['%', '_'], ['\\%', '\\_'], trim($searchTerm)) . '%';
                if (Schema::hasColumn('customers', 'first_name')) {
                    $q->orWhere('first_name', 'like', $like);
                }
                if (Schema::hasColumn('customers', 'last_name')) {
                    $q->orWhere('last_name', 'like', $like);
                }
                if (Schema::hasColumn('customers', 'email')) {
                    $q->orWhere('email', 'like', $like);
                }
                if (Schema::hasColumn('customers', 'phone')) {
                    $q->orWhere('phone', 'like', $like);
                }
            });
        }

        $cols = array_values(array_filter([
            'id',
            Schema::hasColumn('customers', 'customer_code') ? 'customer_code' : null,
            Schema::hasColumn('customers', 'first_name') ? 'first_name' : null,
            Schema::hasColumn('customers', 'last_name') ? 'last_name' : null,
            Schema::hasColumn('customers', 'email') ? 'email' : null,
            Schema::hasColumn('customers', 'phone') ? 'phone' : null,
            Schema::hasColumn('customers', 'nic_passport') ? 'nic_passport' : null,
            Schema::hasColumn('customers', 'status') ? 'status' : null,
            Schema::hasColumn('customers', 'monthly_income') ? 'monthly_income' : null,
            Schema::hasColumn('customers', 'credit_score') ? 'credit_score' : null,
            Schema::hasColumn('customers', 'existing_loans') ? 'existing_loans' : null,
            Schema::hasColumn('customers', 'branch_id') ? 'branch_id' : null,
        ]));

        $customer = $query->select($cols)->orderByDesc('id')->first();
        if (!$customer) {
            return [
                'search_term' => $searchTerm !== '' ? $searchTerm : null,
                'matched' => false,
            ];
        }

        $customerId = (int) ($customer->id ?? 0);
        $documentsCount = Schema::hasTable('customer_documents')
            ? (int) DB::table('customer_documents')->where('customer_id', $customerId)->count()
            : null;
        $savingsAccountsCount = Schema::hasTable('savings_accounts')
            ? (int) DB::table('savings_accounts')->where('customer_id', $customerId)->count()
            : null;

        return [
            'search_term' => $searchTerm !== '' ? $searchTerm : null,
            'matched' => true,
            'customer' => [
                'id' => $customerId,
                'customer_code' => (string) ($customer->customer_code ?? ''),
                'name' => trim((string) (($customer->first_name ?? '') . ' ' . ($customer->last_name ?? ''))),
                'email' => (string) ($customer->email ?? ''),
                'phone' => (string) ($customer->phone ?? ''),
                'nic_passport' => (string) ($customer->nic_passport ?? ''),
                'status' => (string) ($customer->status ?? ''),
                'monthly_income' => isset($customer->monthly_income) ? (float) $customer->monthly_income : null,
                'credit_score' => isset($customer->credit_score) ? (int) $customer->credit_score : null,
                'existing_loans' => isset($customer->existing_loans) ? (bool) $customer->existing_loans : null,
                'branch_id' => isset($customer->branch_id) ? (int) $customer->branch_id : null,
            ],
            'modules' => [
                'customer_documents_count' => $documentsCount,
                'savings_accounts_count' => $savingsAccountsCount,
            ],
        ];
    }

    private function extractCustomerSearchTerm(string $question): string
    {
        $text = trim($question);
        if ($text === '') {
            return '';
        }

        if (preg_match('/customer\s+(?:details?|detail|info|information|profile)?\s*(?:of|for|by)?\s*([a-zA-Z0-9@._\-\s]{2,80})/i', $text, $matches)) {
            return trim((string) ($matches[1] ?? ''));
        }

        return '';
    }

    private function buildAccountingExpenseContext(?int $branchId = null): array
    {
        if (!Schema::hasTable('accounting_expenses')) {
            return [
                'table_available' => false,
                'scope_company_id' => $branchId,
                'allowed_categories' => AccountingExpense::categories(),
                'allowed_payment_methods' => AccountingExpense::paymentMethods(),
                'summary' => null,
                'today' => null,
                'this_month' => null,
                'by_category' => [],
                'by_payment_method' => [],
                'recent_expenses' => [],
            ];
        }

        $baseQuery = DB::table('accounting_expenses');
        if ($branchId && Schema::hasColumn('accounting_expenses', 'company_id')) {
            $baseQuery->where('company_id', $branchId);
        }

        $today = now()->toDateString();
        $monthStart = now()->startOfMonth()->toDateString();
        $monthEnd = now()->endOfMonth()->toDateString();

        $summaryCount = (int) (clone $baseQuery)->count();
        $summaryAmount = round((float) ((clone $baseQuery)->sum('amount') ?? 0), 2);

        $todayQuery = clone $baseQuery;
        if (Schema::hasColumn('accounting_expenses', 'expense_date')) {
            $todayQuery->whereDate('expense_date', $today);
        }
        $todayCount = (int) (clone $todayQuery)->count();
        $todayAmount = round((float) ((clone $todayQuery)->sum('amount') ?? 0), 2);

        $monthQuery = clone $baseQuery;
        if (Schema::hasColumn('accounting_expenses', 'expense_date')) {
            $monthQuery
                ->whereDate('expense_date', '>=', $monthStart)
                ->whereDate('expense_date', '<=', $monthEnd);
        }
        $monthCount = (int) (clone $monthQuery)->count();
        $monthAmount = round((float) ((clone $monthQuery)->sum('amount') ?? 0), 2);

        $byCategory = (clone $baseQuery)
            ->selectRaw('category, COUNT(*) as total_count, SUM(amount) as total_amount')
            ->groupBy('category')
            ->orderByDesc('total_amount')
            ->get()
            ->map(function ($row) {
                return [
                    'category' => (string) ($row->category ?? ''),
                    'count' => (int) ($row->total_count ?? 0),
                    'total_amount' => round((float) ($row->total_amount ?? 0), 2),
                ];
            })
            ->values()
            ->all();

        $byPaymentMethod = (clone $baseQuery)
            ->selectRaw('payment_method, COUNT(*) as total_count, SUM(amount) as total_amount')
            ->groupBy('payment_method')
            ->orderByDesc('total_amount')
            ->get()
            ->map(function ($row) {
                return [
                    'payment_method' => (string) ($row->payment_method ?? ''),
                    'count' => (int) ($row->total_count ?? 0),
                    'total_amount' => round((float) ($row->total_amount ?? 0), 2),
                ];
            })
            ->values()
            ->all();

        $recentExpenseCols = array_values(array_filter([
            'id',
            Schema::hasColumn('accounting_expenses', 'company_id') ? 'company_id' : null,
            Schema::hasColumn('accounting_expenses', 'expense_date') ? 'expense_date' : null,
            Schema::hasColumn('accounting_expenses', 'category') ? 'category' : null,
            Schema::hasColumn('accounting_expenses', 'title') ? 'title' : null,
            Schema::hasColumn('accounting_expenses', 'amount') ? 'amount' : null,
            Schema::hasColumn('accounting_expenses', 'payment_method') ? 'payment_method' : null,
            Schema::hasColumn('accounting_expenses', 'reference_no') ? 'reference_no' : null,
        ]));

        $recentExpenses = (clone $baseQuery)
            ->select($recentExpenseCols)
            ->orderByDesc('expense_date')
            ->orderByDesc('id')
            ->limit(12)
            ->get()
            ->map(function ($row) {
                return [
                    'id' => (int) ($row->id ?? 0),
                    'company_id' => isset($row->company_id) ? (int) $row->company_id : null,
                    'expense_date' => $row->expense_date ? (string) $row->expense_date : null,
                    'category' => (string) ($row->category ?? ''),
                    'title' => (string) ($row->title ?? ''),
                    'amount' => round((float) ($row->amount ?? 0), 2),
                    'payment_method' => (string) ($row->payment_method ?? ''),
                    'reference_no' => (string) ($row->reference_no ?? ''),
                ];
            })
            ->values()
            ->all();

        return [
            'table_available' => true,
            'scope_company_id' => $branchId,
            'allowed_categories' => AccountingExpense::categories(),
            'allowed_payment_methods' => AccountingExpense::paymentMethods(),
            'summary' => [
                'count' => $summaryCount,
                'total_amount' => $summaryAmount,
            ],
            'today' => [
                'date' => $today,
                'count' => $todayCount,
                'total_amount' => $todayAmount,
            ],
            'this_month' => [
                'from' => $monthStart,
                'to' => $monthEnd,
                'count' => $monthCount,
                'total_amount' => $monthAmount,
            ],
            'by_category' => $byCategory,
            'by_payment_method' => $byPaymentMethod,
            'recent_expenses' => $recentExpenses,
        ];
    }

    private function buildCompanyOverviewContext(?int $branchId = null, string $question = ''): array
    {
        $tables = [
            'companies' => 'companies',
            'company_accounts' => 'company_accounts',
            'company_document_templates' => 'company_document_templates',
            'departments' => 'departments',
            'designations' => 'designations',
        ];

        $tableAvailability = [];
        $counts = [];
        foreach ($tables as $key => $table) {
            $exists = Schema::hasTable($table);
            $tableAvailability[$key] = $exists;
            $counts[$key] = $exists ? (int) DB::table($table)->count() : null;
        }

        if (!Schema::hasTable('companies')) {
            return [
                'table_availability' => $tableAvailability,
                'counts' => $counts,
                'summary' => null,
                'recent_branches' => [],
                'branch_detail_lookup' => null,
            ];
        }

        $summary = [
            'total_branches' => (int) DB::table('companies')->count(),
            'total_accounts' => $counts['company_accounts'],
            'total_document_templates' => $counts['company_document_templates'],
            'total_departments' => $counts['departments'],
            'total_designations' => $counts['designations'],
        ];

        $branchCols = array_values(array_filter([
            'id',
            Schema::hasColumn('companies', 'name') ? 'name' : null,
            Schema::hasColumn('companies', 'email') ? 'email' : null,
            Schema::hasColumn('companies', 'phone') ? 'phone' : null,
            Schema::hasColumn('companies', 'currency') ? 'currency' : null,
            Schema::hasColumn('companies', 'opening_asset') ? 'opening_asset' : null,
            Schema::hasColumn('companies', 'created_at') ? 'created_at' : null,
        ]));

        $recentBranches = DB::table('companies')
            ->select($branchCols)
            ->orderByDesc('id')
            ->limit(10)
            ->get()
            ->map(function ($row) {
                return [
                    'id' => (int) ($row->id ?? 0),
                    'name' => (string) ($row->name ?? ''),
                    'email' => (string) ($row->email ?? ''),
                    'phone' => (string) ($row->phone ?? ''),
                    'currency' => (string) ($row->currency ?? ''),
                    'opening_asset' => isset($row->opening_asset) ? (float) $row->opening_asset : null,
                ];
            })
            ->values()
            ->all();

        $branchDetailLookup = $this->buildBranchDetailLookup($question, $branchId);

        return [
            'table_availability' => $tableAvailability,
            'counts' => $counts,
            'summary' => $summary,
            'recent_branches' => $recentBranches,
            'branch_detail_lookup' => $branchDetailLookup,
        ];
    }

    private function buildBranchDetailLookup(string $question, ?int $currentBranchId = null): ?array
    {
        if (!Schema::hasTable('companies')) {
            return null;
        }

        $normalized = mb_strtolower(trim($question));
        if (
            $normalized === '' ||
            (!str_contains($normalized, 'branch') && !str_contains($normalized, 'company') && !str_contains($normalized, 'overview'))
        ) {
            return null;
        }

        $searchTerm = $this->extractBranchSearchTerm($question);
        $query = DB::table('companies');

        if ($searchTerm !== '') {
            $searchLike = '%' . str_replace(['%', '_'], ['\\%', '\\_'], $searchTerm) . '%';
            $query->where(function ($q) use ($searchLike) {
                if (Schema::hasColumn('companies', 'name')) {
                    $q->orWhere('name', 'like', $searchLike);
                }
                if (Schema::hasColumn('companies', 'email')) {
                    $q->orWhere('email', 'like', $searchLike);
                }
            });
        } elseif ($currentBranchId) {
            $query->where('id', $currentBranchId);
        }

        $selectCols = array_values(array_filter([
            'id',
            Schema::hasColumn('companies', 'name') ? 'name' : null,
            Schema::hasColumn('companies', 'email') ? 'email' : null,
            Schema::hasColumn('companies', 'phone') ? 'phone' : null,
            Schema::hasColumn('companies', 'address') ? 'address' : null,
            Schema::hasColumn('companies', 'currency') ? 'currency' : null,
            Schema::hasColumn('companies', 'website') ? 'website' : null,
            Schema::hasColumn('companies', 'opening_asset') ? 'opening_asset' : null,
        ]));

        $company = $query->select($selectCols)->orderByDesc('id')->first();
        if (!$company) {
            return [
                'search_term' => $searchTerm !== '' ? $searchTerm : null,
                'matched' => false,
            ];
        }

        $companyId = (int) ($company->id ?? 0);

        $accountsByType = null;
        if (Schema::hasTable('company_accounts') && Schema::hasColumn('company_accounts', 'company_id')) {
            $accountsByType = DB::table('company_accounts')
                ->selectRaw('account_type, COUNT(*) as total')
                ->where('company_id', $companyId)
                ->groupBy('account_type')
                ->get()
                ->mapWithKeys(function ($row) {
                    return [
                        (string) ($row->account_type ?? 'unknown') => (int) ($row->total ?? 0),
                    ];
                })
                ->toArray();
        }

        $documentTemplateCount = (Schema::hasTable('company_document_templates') && Schema::hasColumn('company_document_templates', 'company_id'))
            ? (int) DB::table('company_document_templates')->where('company_id', $companyId)->count()
            : null;

        $departmentCount = (Schema::hasTable('departments') && Schema::hasColumn('departments', 'branch_id'))
            ? (int) DB::table('departments')->where('branch_id', $companyId)->count()
            : null;

        $designationCount = (Schema::hasTable('designations') && Schema::hasColumn('designations', 'branch_id'))
            ? (int) DB::table('designations')->where('branch_id', $companyId)->count()
            : null;

        return [
            'search_term' => $searchTerm !== '' ? $searchTerm : null,
            'matched' => true,
            'company' => [
                'id' => $companyId,
                'name' => (string) ($company->name ?? ''),
                'email' => (string) ($company->email ?? ''),
                'phone' => (string) ($company->phone ?? ''),
                'address' => (string) ($company->address ?? ''),
                'currency' => (string) ($company->currency ?? ''),
                'website' => (string) ($company->website ?? ''),
                'opening_asset' => isset($company->opening_asset) ? (float) $company->opening_asset : null,
            ],
            'modules' => [
                'accounts_by_type' => $accountsByType,
                'document_templates_count' => $documentTemplateCount,
                'departments_count' => $departmentCount,
                'designations_count' => $designationCount,
            ],
        ];
    }

    private function extractBranchSearchTerm(string $question): string
    {
        $text = trim($question);
        if ($text === '') {
            return '';
        }

        if (preg_match('/(?:branch|company)\s+(?:details?|detail|overview|info|information)?\s*(?:of|for)?\s*([a-zA-Z0-9@._\-\s]{2,80})/i', $text, $matches)) {
            return trim((string) ($matches[1] ?? ''));
        }

        return '';
    }

    private function tryCreateExpenseFromPrompt(Request $request, string $question): ?array
    {
        $normalized = mb_strtolower(trim($question));
        if ($normalized === '') {
            return null;
        }

        $hasActionWord = str_contains($normalized, 'add') || str_contains($normalized, 'create') || str_contains($normalized, 'record');
        $hasExpenseWord = str_contains($normalized, 'expense') || str_contains($normalized, 'expenses') || str_contains($normalized, 'rent');
        if (!$hasActionWord || !$hasExpenseWord) {
            return null;
        }

        $companyId = (int) ($request->user()?->branch_id ?? 0);
        if ($companyId <= 0 || !Company::query()->where('id', $companyId)->exists()) {
            return [
                'message' => 'Cannot add expense: your user is not linked to a valid branch/company.',
                'action' => 'create_expense',
                'success' => false,
            ];
        }

        $category = $this->resolveExpenseCategory($normalized);
        if ($category === null) {
            $category = AccountingExpense::CATEGORY_OTHER;
        }

        $amount = $this->extractExpenseAmount($question);
        if ($amount === null || $amount <= 0) {
            return [
                'message' => 'Cannot add expense: valid amount was not found in your message.',
                'action' => 'create_expense',
                'success' => false,
            ];
        }

        $paymentMethod = $this->resolveExpensePaymentMethod($normalized) ?? AccountingExpense::PAYMENT_CASH;
        $expenseDate = $this->resolveExpenseDate($normalized);
        $title = $this->resolveExpenseTitle($question, $category);

        $expense = AccountingExpense::create([
            'company_id' => $companyId,
            'expense_date' => $expenseDate,
            'category' => $category,
            'title' => $title,
            'amount' => round($amount, 2),
            'payment_method' => $paymentMethod,
            'notes' => 'Created by AI assistant from user prompt.',
            'created_by' => $request->user()?->id,
        ]);

        return [
            'message' => 'Expense recorded successfully via assistant.',
            'action' => 'create_expense',
            'success' => true,
            'expense' => [
                'id' => (int) $expense->id,
                'company_id' => (int) $expense->company_id,
                'expense_date' => optional($expense->expense_date)->format('Y-m-d') ?: (string) $expense->expense_date,
                'category' => (string) $expense->category,
                'title' => (string) $expense->title,
                'amount' => round((float) $expense->amount, 2),
                'payment_method' => (string) $expense->payment_method,
            ],
        ];
    }

    private function resolveExpenseCategory(string $normalized): ?string
    {
        $map = [
            AccountingExpense::CATEGORY_RENT => ['rent'],
            AccountingExpense::CATEGORY_UTILITIES => ['utility', 'utilities', 'electricity', 'water', 'internet'],
            AccountingExpense::CATEGORY_SALARIES => ['salary', 'salaries', 'payroll', 'wage', 'wages'],
            AccountingExpense::CATEGORY_TRANSPORT => ['transport', 'travel', 'fuel'],
            AccountingExpense::CATEGORY_OFFICE_SUPPLIES => ['office supplies', 'stationery', 'office expense', 'supplies'],
            AccountingExpense::CATEGORY_MAINTENANCE => ['maintenance', 'repair'],
            AccountingExpense::CATEGORY_MARKETING => ['marketing', 'advertising', 'promotion'],
            AccountingExpense::CATEGORY_OTHER => ['other', 'misc', 'miscellaneous'],
        ];

        foreach ($map as $category => $keywords) {
            foreach ($keywords as $keyword) {
                if (str_contains($normalized, $keyword)) {
                    return $category;
                }
            }
        }

        return null;
    }

    private function resolveExpensePaymentMethod(string $normalized): ?string
    {
        if (str_contains($normalized, 'bank')) {
            return AccountingExpense::PAYMENT_BANK;
        }
        if (str_contains($normalized, 'main')) {
            return AccountingExpense::PAYMENT_MAIN;
        }
        if (str_contains($normalized, 'cash')) {
            return AccountingExpense::PAYMENT_CASH;
        }

        return null;
    }

    private function extractExpenseAmount(string $question): ?float
    {
        if (preg_match('/(?:is|amount|for|=)\s*([0-9][0-9,]*(?:\.[0-9]{1,2})?)/i', $question, $matches)) {
            $value = (float) str_replace(',', '', (string) ($matches[1] ?? '0'));
            return $value > 0 ? $value : null;
        }

        if (preg_match_all('/([0-9][0-9,]*(?:\.[0-9]{1,2})?)/', $question, $matches)) {
            $numbers = array_map(static function ($value) {
                return (float) str_replace(',', '', (string) $value);
            }, $matches[1] ?? []);

            foreach ($numbers as $number) {
                if ($number > 0 && $number < 100000000) {
                    return $number;
                }
            }
        }

        return null;
    }

    private function resolveExpenseDate(string $normalized): string
    {
        if (str_contains($normalized, 'today')) {
            return now()->toDateString();
        }
        if (str_contains($normalized, 'yesterday')) {
            return now()->subDay()->toDateString();
        }

        $monthMap = [
            'january' => 1, 'jan' => 1,
            'february' => 2, 'feb' => 2,
            'march' => 3, 'mar' => 3,
            'april' => 4, 'apr' => 4,
            'may' => 5,
            'june' => 6, 'jun' => 6,
            'july' => 7, 'jul' => 7,
            'august' => 8, 'aug' => 8,
            'september' => 9, 'sep' => 9, 'sept' => 9,
            'october' => 10, 'oct' => 10,
            'november' => 11, 'nov' => 11,
            'december' => 12, 'dec' => 12,
        ];

        $targetMonth = null;
        foreach ($monthMap as $name => $monthNumber) {
            if (preg_match('/\\b' . preg_quote($name, '/') . '\\b/i', $normalized)) {
                $targetMonth = $monthNumber;
                break;
            }
        }

        $targetYear = (int) now()->year;
        if (preg_match('/\b(20[0-9]{2})\b/', $normalized, $matches)) {
            $targetYear = (int) ($matches[1] ?? $targetYear);
        } elseif (str_contains($normalized, 'last year')) {
            $targetYear = (int) now()->subYear()->year;
        } elseif (str_contains($normalized, 'next year')) {
            $targetYear = (int) now()->addYear()->year;
        }

        if ($targetMonth !== null) {
            return now()
                ->setDate($targetYear, $targetMonth, 1)
                ->startOfDay()
                ->toDateString();
        }

        return now()->toDateString();
    }

    private function resolveExpenseTitle(string $question, string $category): string
    {
        if (preg_match('/^\s*([a-zA-Z][a-zA-Z\s]{1,80})\s+is\s+[0-9]/i', $question, $matches)) {
            $candidate = trim((string) ($matches[1] ?? ''));
            if ($candidate !== '') {
                return ucfirst($candidate);
            }
        }

        return ucfirst(str_replace('_', ' ', $category)) . ' expense';
    }

    private function buildHrContext(?int $branchId = null, string $question = ''): array
    {
        $tables = [
            'employees' => 'employees',
            'employee_allowances_deductions' => 'employee_allowances_deductions',
            'employee_documents' => 'employee_documents',
            'employee_educations' => 'employee_educations',
            'employee_experiences' => 'employee_experiences',
            'employee_wallets' => 'employee_wallets',
            'employee_wallet_bank_deposits' => 'employee_wallet_bank_deposits',
            'employee_wallet_cash_handovers' => 'employee_wallet_cash_handovers',
        ];

        $tableAvailability = [];
        $counts = [];
        foreach ($tables as $key => $table) {
            $exists = Schema::hasTable($table);
            $tableAvailability[$key] = $exists;
            $counts[$key] = $exists ? (int) DB::table($table)->count() : null;
        }

        if (!Schema::hasTable('employees')) {
            return [
                'table_availability' => $tableAvailability,
                'counts' => $counts,
                'summary' => null,
                'recent_employees' => [],
                'employee_detail_lookup' => null,
            ];
        }

        $employeesBase = DB::table('employees');
        if ($branchId && Schema::hasColumn('employees', 'branch_id')) {
            $employeesBase->where('branch_id', $branchId);
        }

        $statusCol = Schema::hasColumn('employees', 'status');

        $summary = [
            'total' => (int) (clone $employeesBase)->count(),
            'active' => $statusCol ? (int) (clone $employeesBase)->where('status', 'active')->count() : null,
            'inactive' => $statusCol ? (int) (clone $employeesBase)->where('status', 'inactive')->count() : null,
        ];

        $recentCols = array_values(array_filter([
            'id',
            Schema::hasColumn('employees', 'employee_code') ? 'employee_code' : null,
            Schema::hasColumn('employees', 'first_name') ? 'first_name' : null,
            Schema::hasColumn('employees', 'last_name') ? 'last_name' : null,
            Schema::hasColumn('employees', 'email') ? 'email' : null,
            Schema::hasColumn('employees', 'status') ? 'status' : null,
            Schema::hasColumn('employees', 'join_date') ? 'join_date' : null,
            Schema::hasColumn('employees', 'created_at') ? 'created_at' : null,
        ]));

        $recentEmployees = (clone $employeesBase)
            ->select($recentCols)
            ->orderByDesc('id')
            ->limit(10)
            ->get()
            ->map(function ($row) {
                return [
                    'id' => (int) ($row->id ?? 0),
                    'employee_code' => (string) ($row->employee_code ?? ''),
                    'name' => trim((string) (($row->first_name ?? '') . ' ' . ($row->last_name ?? ''))),
                    'email' => (string) ($row->email ?? ''),
                    'status' => (string) ($row->status ?? ''),
                    'join_date' => $row->join_date ? (string) $row->join_date : null,
                ];
            })
            ->values()
            ->all();

        $employeeDetailLookup = $this->buildEmployeeDetailLookup($question, $branchId);

        return [
            'table_availability' => $tableAvailability,
            'counts' => $counts,
            'summary' => $summary,
            'recent_employees' => $recentEmployees,
            'employee_detail_lookup' => $employeeDetailLookup,
        ];
    }

    private function buildEmployeeDetailLookup(string $question, ?int $branchId = null): ?array
    {
        $normalized = trim(mb_strtolower($question));
        if ($normalized === '' || !str_contains($normalized, 'employee')) {
            return null;
        }

        if (!Schema::hasTable('employees')) {
            return null;
        }

        $searchTerm = $this->extractEmployeeSearchTerm($question);

        $query = DB::table('employees');
        if ($branchId && Schema::hasColumn('employees', 'branch_id')) {
            $query->where('branch_id', $branchId);
        }

        if ($searchTerm !== '') {
            $searchLike = '%' . str_replace(['%', '_'], ['\\%', '\\_'], $searchTerm) . '%';
            $query->where(function ($q) use ($searchLike) {
                if (Schema::hasColumn('employees', 'employee_code')) {
                    $q->orWhere('employee_code', 'like', $searchLike);
                }
                if (Schema::hasColumn('employees', 'first_name')) {
                    $q->orWhere('first_name', 'like', $searchLike);
                }
                if (Schema::hasColumn('employees', 'last_name')) {
                    $q->orWhere('last_name', 'like', $searchLike);
                }
                if (Schema::hasColumn('employees', 'email')) {
                    $q->orWhere('email', 'like', $searchLike);
                }
            });
        }

        $selectCols = array_values(array_filter([
            'id',
            Schema::hasColumn('employees', 'employee_code') ? 'employee_code' : null,
            Schema::hasColumn('employees', 'first_name') ? 'first_name' : null,
            Schema::hasColumn('employees', 'last_name') ? 'last_name' : null,
            Schema::hasColumn('employees', 'email') ? 'email' : null,
            Schema::hasColumn('employees', 'status') ? 'status' : null,
            Schema::hasColumn('employees', 'join_date') ? 'join_date' : null,
        ]));

        $employee = $query->select($selectCols)->orderByDesc('id')->first();
        if (!$employee) {
            return [
                'search_term' => $searchTerm !== '' ? $searchTerm : null,
                'matched' => false,
            ];
        }

        $employeeId = (int) ($employee->id ?? 0);

        $allowanceDeductionCount = Schema::hasTable('employee_allowances_deductions')
            ? (int) DB::table('employee_allowances_deductions')->where('employee_id', $employeeId)->count()
            : null;

        $documentCount = Schema::hasTable('employee_documents')
            ? (int) DB::table('employee_documents')->where('employee_id', $employeeId)->count()
            : null;

        $educationCount = Schema::hasTable('employee_educations')
            ? (int) DB::table('employee_educations')->where('employee_id', $employeeId)->count()
            : null;

        $experienceCount = Schema::hasTable('employee_experiences')
            ? (int) DB::table('employee_experiences')->where('employee_id', $employeeId)->count()
            : null;

        $wallet = null;
        if (Schema::hasTable('employee_wallets')) {
            $walletCols = array_values(array_filter([
                'id',
                Schema::hasColumn('employee_wallets', 'wallet_no') ? 'wallet_no' : null,
                Schema::hasColumn('employee_wallets', 'current_balance') ? 'current_balance' : null,
                Schema::hasColumn('employee_wallets', 'status') ? 'status' : null,
            ]));
            $wallet = DB::table('employee_wallets')
                ->select($walletCols)
                ->where('employee_id', $employeeId)
                ->orderByDesc('id')
                ->first();
        }

        $walletId = (int) ($wallet->id ?? 0);

        $walletDepositCount = ($walletId > 0 && Schema::hasTable('employee_wallet_bank_deposits'))
            ? (int) DB::table('employee_wallet_bank_deposits')->where('employee_wallet_id', $walletId)->count()
            : null;

        $walletHandoverCount = ($walletId > 0 && Schema::hasTable('employee_wallet_cash_handovers'))
            ? (int) DB::table('employee_wallet_cash_handovers')->where('employee_wallet_id', $walletId)->count()
            : null;

        return [
            'search_term' => $searchTerm !== '' ? $searchTerm : null,
            'matched' => true,
            'employee' => [
                'id' => $employeeId,
                'employee_code' => (string) ($employee->employee_code ?? ''),
                'name' => trim((string) (($employee->first_name ?? '') . ' ' . ($employee->last_name ?? ''))),
                'email' => (string) ($employee->email ?? ''),
                'status' => (string) ($employee->status ?? ''),
                'join_date' => $employee->join_date ? (string) $employee->join_date : null,
            ],
            'modules' => [
                'allowances_deductions_count' => $allowanceDeductionCount,
                'documents_count' => $documentCount,
                'education_count' => $educationCount,
                'experience_count' => $experienceCount,
                'wallet' => $wallet ? [
                    'wallet_no' => (string) ($wallet->wallet_no ?? ''),
                    'current_balance' => (float) ($wallet->current_balance ?? 0),
                    'status' => (string) ($wallet->status ?? ''),
                    'bank_deposits_count' => $walletDepositCount,
                    'cash_handovers_count' => $walletHandoverCount,
                ] : null,
            ],
        ];
    }

    private function extractEmployeeSearchTerm(string $question): string
    {
        $text = trim($question);
        if ($text === '') {
            return '';
        }

        if (preg_match('/employee\s+(?:details?|detail|info|information)?\s*(?:of|for)?\s*([a-zA-Z0-9@._\-\s]{2,80})/i', $text, $matches)) {
            return trim((string) ($matches[1] ?? ''));
        }

        return '';
    }

    private function buildMicrofinanceContext(?int $branchId = null): array
    {
        if (!Schema::hasTable('mf_loan_requests')) {
            return [
                'table_available' => false,
                'today_entered_count' => null,
                'today_entered_total_amount' => null,
                'today_entered_loans' => [],
            ];
        }

        $baseQuery = DB::table('mf_loan_requests');
        if ($branchId && Schema::hasColumn('mf_loan_requests', 'branch_id')) {
            $baseQuery->where('branch_id', $branchId);
        }

        $dateColumn = Schema::hasColumn('mf_loan_requests', 'loan_request_date')
            ? 'loan_request_date'
            : (Schema::hasColumn('mf_loan_requests', 'created_at') ? 'created_at' : null);

        $todayQuery = clone $baseQuery;
        if ($dateColumn !== null) {
            $todayQuery->whereDate($dateColumn, now()->toDateString());
        }

        $todayEnteredCount = (int) (clone $todayQuery)->count();
        $todayEnteredTotalAmount = (float) ((clone $todayQuery)->sum('loan_amount') ?? 0);

        $todayEnteredLoans = (clone $todayQuery)
            ->select([
                'id',
                'loan_code',
                'customer_name',
                'loan_amount',
                'status',
                'loan_request_date',
                'created_at',
            ])
            ->orderByDesc('id')
            ->limit(10)
            ->get()
            ->map(function ($row) {
                return [
                    'id' => (int) ($row->id ?? 0),
                    'loan_code' => (string) ($row->loan_code ?? ''),
                    'customer_name' => (string) ($row->customer_name ?? ''),
                    'loan_amount' => (float) ($row->loan_amount ?? 0),
                    'status' => (string) ($row->status ?? ''),
                    'loan_request_date' => $row->loan_request_date ? (string) $row->loan_request_date : null,
                    'created_at' => $row->created_at ? (string) $row->created_at : null,
                ];
            })
            ->values()
            ->all();

        return [
            'table_available' => true,
            'branch_scope' => $branchId,
            'date_basis' => $dateColumn,
            'today_entered_count' => $todayEnteredCount,
            'today_entered_total_amount' => round($todayEnteredTotalAmount, 2),
            'today_entered_loans' => $todayEnteredLoans,
        ];
    }

    private function tableCountIfExists(string $table): ?int
    {
        try {
            if (!Schema::hasTable($table)) {
                return null;
            }

            return (int) DB::table($table)->count();
        } catch (\Throwable) {
            return null;
        }
    }
}
