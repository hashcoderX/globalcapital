<?php

namespace App\Http\Controllers\Api\Microfinance;

use Barryvdh\DomPDF\Facade\Pdf;
use App\Http\Controllers\Controller;
use App\Models\Company;
use App\Models\CompanyDocumentTemplate;
use App\Models\Customer;
use App\Models\Employee;
use App\Models\EmployeeWallet;
use App\Models\MicrofinanceCenter;
use App\Models\MicrofinanceGroup;
use App\Models\MicrofinanceLoanRequest;
use App\Models\MicrofinancePenaltySetting;
use App\Models\MicrofinanceRoute;
use App\Models\Role;
use App\Models\User;
use App\Models\UserNotification;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class LoanRequestController extends Controller
{
    /**
     * @return array<int>
     */
    private function approvalNotificationRecipientIds(?int $branchId, int $actorUserId): array
    {
        $users = User::query()
            ->with(['designation:id,name', 'roles:id,name'])
            ->where('id', '!=', $actorUserId)
            ->get();

        $recipientIds = [];

        foreach ($users as $user) {
            if (!$this->hasLoanApprovalAccess($user)) {
                continue;
            }

            $isSystemAdmin = method_exists($user, 'isSystemAdmin') && $user->isSystemAdmin();
            if (!$isSystemAdmin && $branchId !== null && (int) ($user->branch_id ?? 0) !== (int) $branchId) {
                continue;
            }

            $recipientIds[] = (int) $user->id;
        }

        return array_values(array_unique($recipientIds));
    }

    private function notifyLoanRequestCreated(MicrofinanceLoanRequest $loanRequest, Request $request): void
    {
        $actorUserId = (int) ($request->user()?->id ?? 0);
        if ($actorUserId <= 0) {
            return;
        }

        $recipientIds = $this->approvalNotificationRecipientIds(
            $loanRequest->branch_id !== null ? (int) $loanRequest->branch_id : null,
            $actorUserId
        );

        if (empty($recipientIds)) {
            return;
        }

        $customerName = trim((string) ($loanRequest->customer_name ?? 'Customer'));
        $loanCode = trim((string) ($loanRequest->loan_code ?? ''));
        $reference = $loanCode !== '' ? $loanCode : ('MF-' . (int) $loanRequest->id);
        $requestedAmount = number_format((float) ($loanRequest->loan_amount ?? 0), 2, '.', ',');

        foreach ($recipientIds as $recipientId) {
            UserNotification::query()->create([
                'user_id' => $recipientId,
                'title' => 'New Microfinance Loan Request',
                'message' => sprintf('%s submitted %s for %s LKR. Review approval queue.', $customerName, $reference, $requestedAmount),
                'type' => 'microfinance_loan_request',
                'is_read' => false,
                'is_important' => true,
                'action_url' => '/dashboard/microfinance/loans/approvals',
                'meta' => [
                    'loan_request_id' => (int) $loanRequest->id,
                    'loan_code' => $reference,
                    'customer_no' => (string) ($loanRequest->customer_no ?? ''),
                    'status' => (string) ($loanRequest->status ?? 'requested'),
                ],
            ]);
        }
    }

    private function buildBaseWalletNo(int $employeeId): string
    {
        return 'EW' . str_pad((string) $employeeId, 6, '0', STR_PAD_LEFT);
    }

    private function generateUniqueWalletNo(int $employeeId): string
    {
        $baseWalletNo = $this->buildBaseWalletNo($employeeId);
        $walletNo = $baseWalletNo;
        $suffix = 1;

        while (EmployeeWallet::query()->where('wallet_no', $walletNo)->exists()) {
            $walletNo = $baseWalletNo . '-' . $suffix;
            $suffix++;
        }

        return $walletNo;
    }

    private function ensureCollectorWallet(User $collectorUser, int $fallbackBranchId): ?EmployeeWallet
    {
        $employeeId = (int) ($collectorUser->employee_id ?? 0);
        if ($employeeId <= 0) {
            return null;
        }

        $existing = EmployeeWallet::query()
            ->where('employee_id', $employeeId)
            ->lockForUpdate()
            ->first();

        if ($existing) {
            return $existing;
        }

        $employee = $collectorUser->employee;
        if (!$employee || (int) $employee->id !== $employeeId) {
            return null;
        }

        $resolvedBranchId = (int) ($employee->branch_id ?? $fallbackBranchId ?: 1);
        $resolvedTenantId = (int) ($employee->tenant_id ?? $resolvedBranchId ?: 1);

        return EmployeeWallet::create([
            'tenant_id' => $resolvedTenantId,
            'branch_id' => $resolvedBranchId,
            'employee_id' => $employeeId,
            'wallet_no' => $this->generateUniqueWalletNo($employeeId),
            'opening_balance' => 0,
            'current_balance' => 0,
            'status' => 'active',
        ]);
    }

    private function creditCollectorWalletForCharges(MicrofinanceLoanRequest $loanRequest, float $chargeAmount): bool
    {
        if ($chargeAmount <= 0) {
            return false;
        }

        if (!empty($loanRequest->charges_wallet_credited_at)) {
            return false;
        }

        $createdByUserId = (int) ($loanRequest->created_by ?? 0);
        if ($createdByUserId <= 0) {
            return false;
        }

        $collectorUser = User::query()->with('employee')->find($createdByUserId);
        if (!$collectorUser) {
            return false;
        }

        $wallet = $this->ensureCollectorWallet($collectorUser, (int) ($loanRequest->branch_id ?? 0));
        if (!$wallet) {
            return false;
        }

        $wallet->current_balance = round((float) ($wallet->current_balance ?? 0) + $chargeAmount, 2);
        $wallet->save();

        $loanRequest->charges_wallet_credited_at = now();
        $loanRequest->save();

        return true;
    }

    private function refundCollectorWalletForCharges(MicrofinanceLoanRequest $loanRequest, float $chargeAmount): bool
    {
        if ($chargeAmount <= 0) {
            return false;
        }

        if (empty($loanRequest->charges_wallet_credited_at)) {
            return false;
        }

        $createdByUserId = (int) ($loanRequest->created_by ?? 0);
        if ($createdByUserId <= 0) {
            return false;
        }

        $collectorUser = User::query()->with('employee')->find($createdByUserId);
        if (!$collectorUser) {
            return false;
        }

        $employeeId = (int) ($collectorUser->employee_id ?? 0);
        if ($employeeId <= 0) {
            return false;
        }

        $wallet = EmployeeWallet::query()
            ->where('employee_id', $employeeId)
            ->lockForUpdate()
            ->first();

        if (!$wallet) {
            return false;
        }

        $wallet->current_balance = round((float) ($wallet->current_balance ?? 0) - $chargeAmount, 2);
        $wallet->save();

        // Mark as reversed to avoid duplicate refund attempts.
        $loanRequest->charges_wallet_credited_at = null;
        $loanRequest->save();

        return true;
    }

    private function extractTemplateTextFromDocx(string $docxPath): string
    {
        $zip = new \ZipArchive();
        if ($zip->open($docxPath) !== true) {
            return '';
        }

        $textChunks = [];

        for ($i = 0; $i < $zip->numFiles; $i++) {
            $entryName = $zip->getNameIndex($i);
            if (!$entryName || !str_starts_with($entryName, 'word/') || !str_ends_with($entryName, '.xml')) {
                continue;
            }

            $content = $zip->getFromIndex($i);
            if (!is_string($content) || $content === '') {
                continue;
            }

            // Preserve basic paragraph/line structure before removing XML tags.
            $normalized = str_replace(['</w:p>', '</w:tr>', '</w:tc>', '<w:br/>', '<w:br />'], ["\n", "\n", ' ', "\n", "\n"], $content);
            $plain = preg_replace('/<[^>]+>/', '', $normalized);
            $plain = html_entity_decode((string) $plain, ENT_QUOTES | ENT_XML1, 'UTF-8');
            $plain = preg_replace('/\s+\n/', "\n", (string) $plain);

            if (trim((string) $plain) !== '') {
                $textChunks[] = trim((string) $plain);
            }
        }

        $zip->close();

        return trim(implode("\n\n", $textChunks));
    }

    private function generateAgreementHtmlWithOpenAi(string $filledTemplateText, array $loanData, array $companyDetails = []): string
    {
        $apiKey = (string) env('OPENAI_API_KEY', '');
        if ($apiKey === '') {
            return '';
        }

        $templateExcerpt = mb_substr($filledTemplateText, 0, 15000);

        $promptPayload = [
            'task' => 'Convert the provided FILLED loan agreement text into print-ready HTML while preserving original sequence and wording.',
            'rules' => [
                'Return JSON only with one key: html.',
                'Return only inner HTML fragments (no html/head/body tags).',
                'Do not add new legal clauses, sections, or extra pages.',
                'Keep the same order and wording from filled_template_text.',
                'Keep all loan values exactly as provided in filled_template_text.',
                'Use clean legal formatting with paragraphs, numbered lists, and spacing only.',
            ],
            'filled_template_text' => $templateExcerpt,
            'loan_data' => $loanData,
            'company_details' => $companyDetails,
        ];

        $requests = [
            [
                'model' => env('OPENAI_MODEL', 'gpt-4o-mini'),
                'messages' => [
                    [
                        'role' => 'system',
                        'content' => 'You produce strict JSON output and expert legal-document HTML formatting.',
                    ],
                    [
                        'role' => 'user',
                        'content' => json_encode($promptPayload, JSON_UNESCAPED_UNICODE),
                    ],
                ],
                'temperature' => 0,
                'response_format' => ['type' => 'json_object'],
            ],
            [
                'model' => env('OPENAI_MODEL', 'gpt-4o-mini'),
                'messages' => [
                    [
                        'role' => 'system',
                        'content' => 'Return only JSON: {"html":"..."}. Do not include markdown fences.',
                    ],
                    [
                        'role' => 'user',
                        'content' => json_encode($promptPayload, JSON_UNESCAPED_UNICODE),
                    ],
                ],
                'temperature' => 0,
            ],
        ];

        foreach ($requests as $index => $payload) {
            try {
                $response = Http::withToken($apiKey)
                    ->timeout(40)
                    ->post('https://api.openai.com/v1/chat/completions', $payload);

                if (!$response->successful()) {
                    Log::warning('OpenAI agreement generation request failed', [
                        'attempt' => $index + 1,
                        'status' => $response->status(),
                        'body' => mb_substr((string) $response->body(), 0, 500),
                    ]);
                    continue;
                }

                $content = (string) data_get($response->json(), 'choices.0.message.content', '');
                if ($content === '') {
                    continue;
                }

                $decoded = json_decode($content, true);
                $html = '';

                if (is_array($decoded) && array_key_exists('html', $decoded)) {
                    $html = (string) $decoded['html'];
                } elseif (str_contains($content, '<') && str_contains($content, '>')) {
                    // Some models may return HTML directly.
                    $html = $content;
                }

                $html = trim((string) $html);
                $html = preg_replace('/^```(?:html|json)?\s*/i', '', $html);
                $html = preg_replace('/\s*```$/', '', (string) $html);
                $html = preg_replace('/<\/?(?:html|head|body)[^>]*>/i', '', (string) $html);

                if (trim((string) $html) !== '') {
                    return trim((string) $html);
                }
            } catch (\Throwable $e) {
                Log::error('OpenAI agreement HTML generation failed', [
                    'attempt' => $index + 1,
                    'message' => $e->getMessage(),
                ]);
            }
        }

        return '';
    }

    private function applyMappingToTemplateText(string $templateText, array $mapping): string
    {
        $filledText = $templateText;

        foreach ($mapping as $key => $value) {
            if (!is_string($value)) {
                continue;
            }

            $escapedKey = preg_quote((string) $key, '/');
            $filledText = preg_replace('/\{\{\s*' . $escapedKey . '\s*\}\}/', $value, (string) $filledText);
            $filledText = preg_replace('/\$\{\s*' . $escapedKey . '\s*\}/', $value, (string) $filledText);
        }

        // Fill common underscore placeholders while preserving template appearance.
        $labelPatterns = [
            '/(Lender\s*:\s*Name\s*:\s*)_{3,}/i' => ($mapping['lender_name'] ?? '__________'),
            '/(Lender\s*:\s*Address\s*:\s*)_{3,}/i' => ($mapping['lender_address'] ?? '__________'),
            '/(Lender\s*:\s*(?:NIC\/Company\s*No\s*:|NIC\s*:)\s*)_{3,}/i' => ($mapping['lender_nic'] ?? '__________'),
            '/(Borrower\s*:\s*Name\s*:\s*)_{3,}/i' => ($mapping['borrower_name'] ?? '__________'),
            '/(Borrower\s*:\s*Address\s*:\s*)_{3,}/i' => ($mapping['borrower_address'] ?? '__________'),
            '/(Borrower\s*:\s*(?:NIC\/Company\s*No\s*:|NIC\s*:)\s*)_{3,}/i' => ($mapping['borrower_nic'] ?? '__________'),
            '/(Customer\s*Name\s*:\s*)_{3,}/i' => ($mapping['customer_name'] ?? '__________'),
            '/(Customer\s*No\s*:\s*)_{3,}/i' => ($mapping['customer_no'] ?? '__________'),
            '/(Address\s*:\s*)_{3,}/i' => ($mapping['address'] ?? '__________'),
            '/(Contact\s*:\s*)_{3,}/i' => ($mapping['contact_no'] ?? '__________'),
        ];

        foreach ($labelPatterns as $pattern => $replacementValue) {
            $filledText = preg_replace($pattern, '$1' . (string) $replacementValue, (string) $filledText);
        }

        // Handle templates that use plain labels + blanks (no {{placeholders}}).
        $lines = preg_split('/\R/', (string) $filledText) ?: [];
        $context = '';

        foreach ($lines as $index => $line) {
            $trimmed = trim((string) $line);

            if (preg_match('/^Lender\s*:/i', $trimmed)) {
                $context = 'lender';
                continue;
            }

            if (preg_match('/^Borrower\s*:/i', $trimmed)) {
                $context = 'borrower';
                continue;
            }

            if (preg_match('/^This\s+Loan\s+Agreement\s+is\s+made\s+on\s+this\s*$/i', $trimmed)) {
                $lines[$index] = 'This Loan Agreement is made on this ' . (string) ($mapping['issue_date'] ?? '__________');
                continue;
            }

            if (preg_match('/^Date\s*:\s*$/i', $trimmed)) {
                $lines[$index] = 'Date: ' . (string) ($mapping['today_date'] ?? $mapping['issue_date'] ?? '');
                continue;
            }

            if (preg_match('/^To\s*:\s*$/i', $trimmed)) {
                $toValue = trim(((string) ($mapping['customer_name'] ?? '')) . ' - ' . ((string) ($mapping['address'] ?? '')));
                $lines[$index] = 'To: ' . trim($toValue, ' -');
                continue;
            }

            if (preg_match('/^Subject\s*:\s*Reminder\s+for\s+Loan\s+Payment\s*$/i', $trimmed)) {
                $subjectLoanRef = (string) ($mapping['loan_code'] ?? $mapping['customer_no'] ?? '');
                $lines[$index] = 'Subject: Reminder for Loan Payment' . ($subjectLoanRef !== '' ? ' - ' . $subjectLoanRef : '');
                continue;
            }

            if (preg_match('/^Name\s*:\s*$/i', $trimmed)) {
                $name = $context === 'lender'
                    ? (string) ($mapping['lender_name'] ?? '')
                    : (string) ($mapping['borrower_name'] ?? $mapping['customer_name'] ?? '');
                if (trim($name) !== '') {
                    $lines[$index] = 'Name: ' . $name;
                }
                continue;
            }

            if (preg_match('/^Address\s*:?\s*$/i', $trimmed)) {
                $address = $context === 'lender'
                    ? (string) ($mapping['lender_address'] ?? '')
                    : (string) ($mapping['borrower_address'] ?? $mapping['address'] ?? '');
                if (trim($address) !== '') {
                    $lines[$index] = str_ends_with($trimmed, ':') ? 'Address: ' . $address : 'Address ' . $address;
                }
                continue;
            }

            if (preg_match('/^(NIC\/Company\s*No\s*:|NIC\s*:)\s*$/i', $trimmed, $m)) {
                $nic = $context === 'lender'
                    ? (string) ($mapping['lender_nic'] ?? '')
                    : (string) ($mapping['borrower_nic'] ?? $mapping['nic'] ?? '');
                if (trim($nic) !== '') {
                    $lines[$index] = $m[1] . ' ' . $nic;
                }
                continue;
            }

            if (preg_match('/^Amount\s*:\s*LKR/i', $trimmed)) {
                $lines[$index] = 'Amount: LKR ' . (string) ($mapping['loan_amount'] ?? $mapping['principal'] ?? '0.00');
                continue;
            }

            if (preg_match('/^(Loan\s*(No|Number|Code)\s*:)\s*$/i', $trimmed, $m)) {
                $lines[$index] = $m[1] . ' ' . (string) ($mapping['loan_code'] ?? $mapping['customer_no'] ?? '');
                continue;
            }

            if (preg_match('/^(Customer\s*Name\s*:)\s*$/i', $trimmed, $m)) {
                $lines[$index] = $m[1] . ' ' . (string) ($mapping['customer_name'] ?? '');
                continue;
            }

            if (preg_match('/^(Customer\s*No\s*:)\s*$/i', $trimmed, $m)) {
                $lines[$index] = $m[1] . ' ' . (string) ($mapping['customer_no'] ?? '');
                continue;
            }

            if (preg_match('/^(Issue\s*Date\s*:)\s*$/i', $trimmed, $m)) {
                $lines[$index] = $m[1] . ' ' . (string) ($mapping['issue_date'] ?? '');
                continue;
            }

            if (preg_match('/^(Due\s*Date\s*:)\s*$/i', $trimmed, $m)) {
                $lines[$index] = $m[1] . ' ' . (string) ($mapping['due_date'] ?? '');
                continue;
            }

            if (preg_match('/^(Next\s*Payment\s*Date\s*:)\s*$/i', $trimmed, $m)) {
                $lines[$index] = $m[1] . ' ' . (string) ($mapping['next_payment_date'] ?? '');
                continue;
            }

            if (preg_match('/^(Outstanding\s*Amount\s*:)\s*$/i', $trimmed, $m)) {
                $lines[$index] = $m[1] . ' LKR ' . (string) ($mapping['outstanding_amount'] ?? $mapping['total_payable'] ?? '0.00');
                continue;
            }

            if (preg_match('/^(Arrears\s*(Amount|Balance)\s*:)\s*$/i', $trimmed, $m)) {
                $lines[$index] = $m[1] . ' LKR ' . (string) ($mapping['arrears_balance'] ?? '0.00');
                continue;
            }

            if (preg_match('/^(Field\s*Officer\s*:)\s*$/i', $trimmed, $m)) {
                $lines[$index] = $m[1] . ' ' . (string) ($mapping['field_officer'] ?? '');
                continue;
            }

            if (preg_match('/^(Manager\s*Name\s*:)\s*$/i', $trimmed, $m)) {
                $lines[$index] = $m[1] . ' ' . (string) ($mapping['manager_name'] ?? '');
                continue;
            }

            if (preg_match('/^Installment\s+Amount\s*:\s*LKR/i', $trimmed)) {
                $lines[$index] = 'Installment Amount: LKR ' . (string) ($mapping['installment'] ?? '0.00');
                continue;
            }

            if (preg_match('/^Payment\s+Frequency\s*:\s*$/i', $trimmed)) {
                $lines[$index] = 'Payment Frequency: ' . (string) ($mapping['refund_option'] ?? '');
                continue;
            }

            if (preg_match('/^Number\s+of\s+Installments\s*:\s*$/i', $trimmed)) {
                $lines[$index] = 'Number of Installments: ' . (string) ($mapping['terms_count'] ?? '');
                continue;
            }

            if (preg_match('/^Start\s+Date\s*:/i', $trimmed)) {
                $issueDate = (string) ($mapping['issue_date'] ?? '');
                $formattedDate = $issueDate;
                if ($issueDate !== '' && strtotime($issueDate) !== false) {
                    $formattedDate = date('d / m / Y', strtotime($issueDate));
                }
                $lines[$index] = 'Start Date: ' . ($formattedDate !== '' ? $formattedDate : '___ / ___ / ______');
                continue;
            }

            if (preg_match('/^Payments\s+shall\s+be\s+made\s+to\s*:\s*$/i', $trimmed)) {
                $lines[$index] = 'Payments shall be made to: ' . (string) ($mapping['lender_name'] ?? '');
                continue;
            }

            if (preg_match('/^A\s+late\s+fee\s+of\s+LKR/i', $trimmed)) {
                $lines[$index] = 'A late fee of LKR 0.00 or 0% will be charged.';
                continue;
            }

            if (str_contains(mb_strtolower($trimmed), 'installment of lkr') && str_contains(mb_strtolower($trimmed), 'was due on')) {
                $lines[$index] = 'According to our agreement, your installment of LKR ' . (string) ($mapping['installment'] ?? '0.00') . ' was due on ' . (string) ($mapping['due_date'] ?? $mapping['next_payment_date'] ?? '') . '.';
                continue;
            }

            if (preg_match('/^Please\s+contact\s+us\s+at\s*:?\s*$/i', $trimmed)) {
                $contactBits = array_filter([
                    (string) ($mapping['company_phone'] ?? $mapping['lender_phone'] ?? ''),
                    (string) ($mapping['company_email'] ?? ''),
                ], fn ($v) => trim((string) $v) !== '');
                $lines[$index] = 'Please contact us at: ' . (count($contactBits) > 0 ? implode(' | ', $contactBits) : '');
                continue;
            }

            if (preg_match('/^Branch\s*:\s*$/i', $trimmed)) {
                $lines[$index] = 'Branch: ' . (string) ($mapping['center_name'] ?? $mapping['route_name'] ?? '');
                continue;
            }

            if (str_contains($trimmed, '[Due / Overdue by days]')) {
                $statusText = (string) ($mapping['payment_status_text'] ?? 'Due');
                $lines[$index] = str_replace('[Due / Overdue by days]', $statusText, $trimmed);
                continue;
            }
        }

        $filledText = implode("\n", $lines);
        $filledText = str_replace('[Due / Overdue by days]', (string) ($mapping['payment_status_text'] ?? 'Due'), $filledText);

        return (string) $filledText;
    }

    private function applyMappingToHtml(string $html, array $mapping): string
    {
        $updated = $html;

        foreach ($mapping as $key => $value) {
            if (!is_string($value)) {
                continue;
            }

            $escapedKey = preg_quote((string) $key, '/');
            $updated = preg_replace('/\{\{\s*' . $escapedKey . '\s*\}\}/', $value, (string) $updated);
            $updated = preg_replace('/\$\{\s*' . $escapedKey . '\s*\}/', $value, (string) $updated);
        }

        // Apply the same underscore-based replacements to AI HTML just before PDF rendering.
        $updated = $this->applyMappingToTemplateText((string) $updated, $mapping);

        return (string) $updated;
    }

    private function buildTemplateFaithfulPdfHtml(string $filledTemplateText, string $aiInnerHtml): string
    {
        $lines = preg_split('/\R/', (string) $filledTemplateText) ?: [];
        $chunks = [];

        foreach ($lines as $line) {
            $trimmed = trim((string) $line);

            if ($trimmed === '') {
                $chunks[] = '<div class="spacer"></div>';
                continue;
            }

            if (preg_match('/^LOAN\s+AGREEMENT$/i', $trimmed)) {
                $chunks[] = '<h1 class="title">' . e($trimmed) . '</h1>';
                continue;
            }

            if (preg_match('/^BETWEEN\s*:?$/i', $trimmed)) {
                $chunks[] = '<h2 class="section-title">' . e($trimmed) . '</h2>';
                continue;
            }

            if (preg_match('/^\d+\./', $trimmed)) {
                $chunks[] = '<h3 class="clause-title">' . e($trimmed) . '</h3>';
                continue;
            }

            if (preg_match('/^(Lender|Borrower)\s*:\s*$/i', $trimmed)) {
                $chunks[] = '<p class="party-label"><strong>' . e($trimmed) . '</strong></p>';
                continue;
            }

            if (preg_match('/^(Name|Address|NIC\/Company\s*No|Customer\s*No|Loan\s*Code|Amount|Installment\s*Amount|Payment\s*Frequency|Number\s*of\s*Installments|Start\s*Date|Date|Witness\s*\d+|Lender\s*Signature|Borrower\s*Signature)\s*:/i', $trimmed)) {
                $chunks[] = '<p class="label-line">' . e($trimmed) . '</p>';
                continue;
            }

            $chunks[] = '<p class="body-line">' . e($trimmed) . '</p>';
        }

        $docLikeContent = implode("\n", $chunks);
        $bodyContent = trim($aiInnerHtml) !== '' ? $aiInnerHtml : $docLikeContent;

        return '<!doctype html><html><head><meta charset="UTF-8"><style>@page{margin:26px 34px;}body{font-family:"Times New Roman", DejaVu Serif, serif;font-size:12pt;line-height:1.5;color:#000;} .title{text-align:center;font-size:24pt;font-weight:700;margin:0 0 16px 0;letter-spacing:0.3px;} .section-title{font-size:15pt;font-weight:700;margin:16px 0 8px 0;text-transform:uppercase;} .clause-title{font-size:13.2pt;font-weight:700;margin:14px 0 6px 0;} .party-label{margin:8px 0 2px 0;} .label-line{margin:2px 0 6px 0;} .body-line{margin:0 0 7px 0;text-align:justify;} .spacer{height:9px;} p{orphans:3;widows:3;} h1,h2,h3{page-break-after:avoid;} </style></head><body>' . $bodyContent . '</body></html>';
    }

    private function buildFallbackAgreementHtml(string $templateText, array $mapping): string
    {
        $filledText = $templateText;

        foreach ($mapping as $key => $value) {
            if (!is_string($value)) {
                continue;
            }

            $escapedKey = preg_quote((string) $key, '/');
            $filledText = preg_replace('/\{\{\s*' . $escapedKey . '\s*\}\}/', $value, (string) $filledText);
            $filledText = preg_replace('/\$\{\s*' . $escapedKey . '\s*\}/', $value, (string) $filledText);
        }

        $safeText = nl2br(e((string) $filledText));

        return '<!doctype html><html><head><meta charset="UTF-8"><style>body{font-family: DejaVu Sans, sans-serif; font-size: 12px; line-height: 1.5; margin: 28px; color:#111;} h1{font-size:18px; margin-bottom:16px;} p{margin:0 0 8px;}</style></head><body>' . $safeText . '</body></html>';
    }

        private function buildProfessionalAgreementHtml(array $loanData, ?Company $company, string $templateText, string $aiClauseHtml): string
        {
                $value = function (string $key, string $fallback = 'N/A') use ($loanData): string {
                        $raw = isset($loanData[$key]) ? (string) $loanData[$key] : '';
                        $trimmed = trim($raw);
                        return $trimmed !== '' ? e($trimmed) : e($fallback);
                };

                $companyName = $company ? (string) ($company->name ?? '') : '';
                $companyAddress = $company ? (string) ($company->address ?? '') : '';
                $companyPhone = $company ? (string) ($company->phone ?? '') : '';

                $lenderName = trim($companyName) !== '' ? e($companyName) : 'Microfinance Company';
                $lenderAddress = trim($companyAddress) !== '' ? e($companyAddress) : 'Company Address';
                $lenderPhone = trim($companyPhone) !== '' ? e($companyPhone) : 'N/A';

                $safeAiClauseHtml = trim($aiClauseHtml);
                if ($safeAiClauseHtml === '') {
                        $safeAiClauseHtml = '<p>The Borrower agrees to repay the loan in scheduled installments, and the Lender may apply applicable charges for late payments as per policy.</p>';
                }

                $templateSnapshot = trim($templateText) !== ''
                        ? nl2br(e(mb_substr($templateText, 0, 2500)))
                        : 'N/A';

                return '<!doctype html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        @page { margin: 26px 30px; }
        body { font-family: DejaVu Sans, sans-serif; font-size: 12px; color: #111827; line-height: 1.55; }
        .header { border-bottom: 2px solid #0f766e; padding-bottom: 10px; margin-bottom: 16px; }
        .title { font-size: 20px; font-weight: 700; color: #0f172a; margin: 0 0 6px 0; }
        .subtitle { font-size: 11px; color: #475569; margin: 0; }
        .section { margin-top: 14px; }
        .section h2 { font-size: 14px; margin: 0 0 8px 0; color: #0f172a; border-left: 4px solid #0f766e; padding-left: 8px; }
        table { width: 100%; border-collapse: collapse; margin-top: 6px; }
        th, td { border: 1px solid #cbd5e1; padding: 7px 8px; vertical-align: top; }
        th { background: #f1f5f9; text-align: left; width: 34%; font-weight: 700; }
        .note { font-size: 10px; color: #64748b; }
        .signature-wrap { margin-top: 28px; }
        .signature-table td { border: none; width: 50%; padding: 18px 10px 0 0; }
        .line { border-top: 1px solid #1f2937; margin-top: 30px; padding-top: 4px; font-size: 11px; }
    </style>
</head>
<body>
    <div class="header">
        <p class="title">Loan Agreement</p>
        <p class="subtitle">This agreement is made on ' . $value('issue_date') . ' between the Lender and Borrower named below.</p>
    </div>

    <div class="section">
        <h2>1. Parties</h2>
        <table>
            <tr><th>Lender Name</th><td>' . $lenderName . '</td></tr>
            <tr><th>Lender Address</th><td>' . $lenderAddress . '</td></tr>
            <tr><th>Lender Contact</th><td>' . $lenderPhone . '</td></tr>
            <tr><th>Borrower Name</th><td>' . $value('customer_name') . '</td></tr>
            <tr><th>Borrower NIC</th><td>' . $value('nic') . '</td></tr>
            <tr><th>Borrower Address</th><td>' . $value('address') . '</td></tr>
            <tr><th>Borrower Contact</th><td>' . $value('contact_no') . '</td></tr>
        </table>
    </div>

    <div class="section">
        <h2>2. Loan Details</h2>
        <table>
            <tr><th>Request No</th><td>' . $value('request_no') . '</td></tr>
            <tr><th>Customer No</th><td>' . $value('customer_no') . '</td></tr>
            <tr><th>Loan Code</th><td>' . $value('loan_code') . '</td></tr>
            <tr><th>Principal Amount</th><td>' . $value('principal') . '</td></tr>
            <tr><th>Total Payable</th><td>' . $value('total_payable') . '</td></tr>
            <tr><th>Installment Amount</th><td>' . $value('installment') . '</td></tr>
            <tr><th>Interest Rate</th><td>' . $value('interest_rate') . '% (' . $value('interest_type') . ')</td></tr>
            <tr><th>Terms</th><td>' . $value('terms_count') . ' installments (' . $value('refund_option') . ' basis)</td></tr>
            <tr><th>Route / Center / Group</th><td>' . $value('route_name') . ' / ' . $value('center_name') . ' / ' . $value('group_name') . '</td></tr>
        </table>
    </div>

    <div class="section">
        <h2>3. Agreement Clauses</h2>
        ' . $safeAiClauseHtml . '
    </div>

    <div class="section">
        <h2>4. Template Reference Snapshot</h2>
        <p class="note">For traceability, the source template text excerpt used for AI processing is included below.</p>
        <p>' . $templateSnapshot . '</p>
    </div>

    <div class="signature-wrap">
        <table class="signature-table">
            <tr>
                <td>
                    <div class="line">Authorized Signatory (Lender)</div>
                </td>
                <td>
                    <div class="line">Borrower Signature</div>
                </td>
            </tr>
            <tr>
                <td>
                    <div class="line">Witness 1</div>
                </td>
                <td>
                    <div class="line">Witness 2</div>
                </td>
            </tr>
        </table>
    </div>
</body>
</html>';
        }

    public function buildLoanAgreementVariables(MicrofinanceLoanRequest $loanRequest): array
    {
        $issueDate = $loanRequest->loan_request_date ?: date('Y-m-d');
        $todayDate = date('Y-m-d');
        $routeName = optional($loanRequest->route)->name ?: '-';
        $centerName = optional($loanRequest->center)->name ?: '-';
        $groupName = optional($loanRequest->group)->name ?: '-';
        $totalCollected = (float) $loanRequest->collections()->sum('collected_amount');
        $totalPayable = (float) ($loanRequest->refundable_amount ?: 0);
        $outstandingAmount = max($totalPayable - $totalCollected, 0);

        $dueDate = (string) ($loanRequest->due_date ?: '');
        $overdueDays = 0;
        if ($dueDate !== '' && strtotime($dueDate) !== false) {
            $todayTs = strtotime($todayDate);
            $dueTs = strtotime($dueDate);
            if ($todayTs !== false && $dueTs !== false && $todayTs > $dueTs) {
                $overdueDays = (int) floor(($todayTs - $dueTs) / 86400);
            }
        }

        $paymentStatusText = $overdueDays > 0 ? ('Overdue by ' . $overdueDays . ' days') : 'Due';

        return [
            'customer_name' => (string) ($loanRequest->customer_name ?: ''),
            'customer_no' => (string) ($loanRequest->customer_no ?: ''),
            'loan_code' => (string) ($loanRequest->loan_code ?: ''),
            'nic' => (string) ($loanRequest->nic ?: ''),
            'issue_date' => (string) $issueDate,
            'today_date' => (string) $todayDate,
            'loan_amount' => number_format((float) ($loanRequest->loan_amount ?: 0), 2, '.', ''),
            'principal' => number_format((float) ($loanRequest->loan_amount ?: 0), 2, '.', ''),
            'refundable_amount' => number_format((float) ($loanRequest->refundable_amount ?: 0), 2, '.', ''),
            'total_payable' => number_format($totalPayable, 2, '.', ''),
            'total_collected' => number_format($totalCollected, 2, '.', ''),
            'installment' => number_format((float) ($loanRequest->installment_amount ?: 0), 2, '.', ''),
            'interest_rate' => number_format((float) ($loanRequest->interest_rate ?: 0), 2, '.', ''),
            'interest_type' => (string) ($loanRequest->interest_type ?: ''),
            'terms_count' => (string) ($loanRequest->terms_count ?: ''),
            'refund_option' => (string) ($loanRequest->refund_option ?: ''),
            'address' => (string) ($loanRequest->address ?: ''),
            'contact_no' => (string) ($loanRequest->contact_no ?: ''),
            'manager_name' => (string) ($loanRequest->manager_name ?: ''),
            'field_officer' => (string) ($loanRequest->field_officer ?: ''),
            'group_leader' => (string) ($loanRequest->group_leader ?: ''),
            'route_name' => (string) $routeName,
            'center_name' => (string) $centerName,
            'group_name' => (string) $groupName,
            'request_no' => (string) ($loanRequest->id ?: ''),
            'reason' => (string) ($loanRequest->reason ?: ''),
            'status' => (string) ($loanRequest->status ?: ''),
            'due_date' => (string) ($loanRequest->due_date ?: ''),
            'next_payment_date' => (string) ($loanRequest->next_payment_date ?: ''),
            'loan_end_date' => (string) ($loanRequest->loan_end_date ?: ''),
            'arrears_balance' => number_format((float) ($loanRequest->arrears_balance ?: 0), 2, '.', ''),
            'outstanding_amount' => number_format($outstandingAmount, 2, '.', ''),
            'overdue_days' => (string) $overdueDays,
            'payment_status_text' => (string) $paymentStatusText,
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

        // Seed mapping from all available loan data so replacement works even if placeholder extraction is incomplete.
        foreach ($loanData as $key => $value) {
            $mapping[$key] = is_scalar($value) ? (string) $value : '';
        }

        // Create mapping for context-based underscore placeholders
        $date = strtotime($loanData['issue_date'] ?? 'now');
        $mapping['day'] = date('j', $date); // Day of month
        $mapping['month'] = date('F', $date); // Full month name
        $mapping['lender_name'] = trim((string) ($mapping['lender_name'] ?? '')) !== ''
            ? (string) $mapping['lender_name']
            : 'Microfinance Company';
        $mapping['lender_address'] = trim((string) ($mapping['lender_address'] ?? '')) !== ''
            ? (string) $mapping['lender_address']
            : 'Company Address';
        $mapping['lender_nic'] = trim((string) ($mapping['lender_nic'] ?? '')) !== ''
            ? (string) $mapping['lender_nic']
            : 'Company Registration No';
        $mapping['borrower_name'] = trim((string) ($mapping['borrower_name'] ?? '')) !== ''
            ? (string) $mapping['borrower_name']
            : (string) ($loanData['customer_name'] ?? '');
        $mapping['borrower_address'] = trim((string) ($mapping['borrower_address'] ?? '')) !== ''
            ? (string) $mapping['borrower_address']
            : (string) ($loanData['address'] ?? '');
        $mapping['borrower_nic'] = trim((string) ($mapping['borrower_nic'] ?? '')) !== ''
            ? (string) $mapping['borrower_nic']
            : (string) ($loanData['nic'] ?? '');

        $apiKey = (string) env('OPENAI_API_KEY', '');
        if ($apiKey === '') {
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

            // Replace standard {{field}} and ${field} patterns first.
            foreach ($mapping as $pattern => $value) {
                if (!is_string($value)) {
                    continue;
                }

                $escapedPattern = preg_quote((string) $pattern, '/');
                $content = preg_replace('/\{\{\s*' . $escapedPattern . '\s*\}\}/', $value, $content);
                $content = preg_replace('/\$\{\s*' . $escapedPattern . '\s*\}/', $value, $content);
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
        $safeSteps = max($steps, 0);
        if ($safeSteps === 0) {
            return $date;
        }

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

        return $this->hasLoanApprovalAccess($user);
    }

    private function hasLoanApprovalAccess(?object $user): bool
    {
        if (!$user) {
            return false;
        }

        if (method_exists($user, 'isSystemAdmin') && $user->isSystemAdmin()) {
            return true;
        }

        $allowedKeywords = ['loan approver', 'finance manager', 'branch manager', 'admin'];

        $designationName = strtolower((string) optional($user->designation)->name);
        foreach ($allowedKeywords as $keyword) {
            if ($designationName !== '' && str_contains($designationName, $keyword)) {
                return true;
            }
        }

        if (!method_exists($user, 'roles')) {
            return false;
        }

        $roleNames = $user->roles()->pluck('name')->map(function ($name) {
            return strtolower((string) $name);
        });

        foreach ($roleNames as $roleName) {
            foreach ($allowedKeywords as $keyword) {
                if ($roleName !== '' && str_contains($roleName, $keyword)) {
                    return true;
                }
            }
        }

        return false;
    }

    private function hasReleasedLoanActionAccess(?object $user): bool
    {
        if (!$user) {
            return false;
        }

        if (method_exists($user, 'isSystemAdmin') && $user->isSystemAdmin()) {
            return true;
        }

        $allowedKeywords = ['finance manager', 'branch manager', 'admin'];

        $designationName = strtolower((string) optional($user->designation)->name);
        foreach ($allowedKeywords as $keyword) {
            if ($designationName !== '' && str_contains($designationName, $keyword)) {
                return true;
            }
        }

        if (!method_exists($user, 'roles')) {
            return false;
        }

        $roleNames = $user->roles()->pluck('name')->map(function ($name) {
            return strtolower((string) $name);
        });

        foreach ($roleNames as $roleName) {
            foreach ($allowedKeywords as $keyword) {
                if ($roleName !== '' && str_contains($roleName, $keyword)) {
                    return true;
                }
            }
        }

        return false;
    }

    private function canRemoveLoan(?object $user): bool
    {
        return $user !== null
            && method_exists($user, 'isSystemAdmin')
            && $user->isSystemAdmin();
    }

    private function isAdminUser(?object $user): bool
    {
        if (!$user) {
            return false;
        }

        if (method_exists($user, 'isSystemAdmin') && $user->isSystemAdmin()) {
            return true;
        }

        $designationName = strtolower(trim((string) optional($user->designation)->name));
        if ($designationName !== '' && str_contains($designationName, 'admin')) {
            return true;
        }

        if (!method_exists($user, 'roles')) {
            return false;
        }

        foreach ($user->roles()->pluck('name') as $roleName) {
            $normalized = strtolower(trim((string) $roleName));
            if ($normalized !== '' && str_contains($normalized, 'admin')) {
                return true;
            }
        }

        return false;
    }

    private function scopedBranchId(Request $request): ?int
    {
        if ($this->isAdminUser($request->user())) {
            return null;
        }

        $branchId = (int) ($request->user()?->branch_id ?? 0);
        return $branchId > 0 ? $branchId : null;
    }

    public function index(Request $request)
    {
        $status = $request->get('status');
        $branchId = (int)$request->get('branch_id', 0);
        $fieldOfficer = trim((string)$request->get('field_officer', ''));

        $query = MicrofinanceLoanRequest::with([
            'branch:id,name',
            'route:id,name,code',
            'center:id,name,code,meeting_day',
            'group:id,name,code',
            'guarantors',
            'documents',
        ])
            ->withMax('collections as last_pay_date', 'collection_date')
            ->orderBy('id', 'desc');

        if ($status) {
            $query->where('status', $status);
        }

        $scopedBranchId = $this->scopedBranchId($request);
        if ($scopedBranchId !== null) {
            $query->where('branch_id', $scopedBranchId);
        } elseif ($branchId > 0) {
            $query->where('branch_id', $branchId);
        }

        if ($fieldOfficer !== '') {
            $query->whereRaw('LOWER(TRIM(field_officer)) = ?', [mb_strtolower($fieldOfficer)]);
        }

        $loans = $query->get();
        $this->attachCustomerPhotoUrls($loans);

        return response()->json($loans);
    }

    private function attachCustomerPhotoUrls($loans): void
    {
        if ($loans->isEmpty()) {
            return;
        }

        $customerCodes = $loans
            ->map(fn ($loan) => strtoupper(trim((string) $loan->customer_no)))
            ->filter()
            ->unique()
            ->values();

        $nics = $loans
            ->map(fn ($loan) => trim((string) $loan->nic))
            ->filter()
            ->unique()
            ->values();

        $customersByCode = collect();
        if ($customerCodes->isNotEmpty()) {
            $customersByCode = Customer::query()
                ->whereIn(DB::raw('UPPER(customer_code)'), $customerCodes->all())
                ->whereNotNull('photo_path')
                ->orderByDesc('id')
                ->get()
                ->unique(fn (Customer $customer) => strtoupper((string) $customer->customer_code))
                ->keyBy(fn (Customer $customer) => strtoupper((string) $customer->customer_code));
        }

        $customersByNic = collect();
        if ($nics->isNotEmpty()) {
            $customersByNic = Customer::query()
                ->whereIn('nic_passport', $nics->all())
                ->whereNotNull('photo_path')
                ->orderByDesc('id')
                ->get()
                ->unique('nic_passport')
                ->keyBy('nic_passport');
        }

        foreach ($loans as $loan) {
            $loan->setAttribute(
                'customer_photo_url',
                $this->resolveLoanCustomerPhotoUrl($loan, $customersByCode, $customersByNic)
            );
        }
    }

    private function resolveLoanCustomerPhotoUrl(
        MicrofinanceLoanRequest $loan,
        $customersByCode,
        $customersByNic
    ): ?string {
        foreach ($loan->documents as $document) {
            if (stripos((string) $document->document_type, 'customer photo') === false) {
                continue;
            }

            if (!$document->file_path) {
                continue;
            }

            return $document->file_url;
        }

        $customerCode = strtoupper(trim((string) $loan->customer_no));
        if ($customerCode !== '' && $customersByCode->has($customerCode)) {
            return $customersByCode->get($customerCode)?->photo_url;
        }

        $nic = trim((string) $loan->nic);
        if ($nic !== '' && $customersByNic->has($nic)) {
            return $customersByNic->get($nic)?->photo_url;
        }

        return null;
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

        $scopedBranchId = $this->scopedBranchId($request);
        if ($scopedBranchId !== null) {
            $query->where('branch_id', $scopedBranchId);
        }

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

    private function buildCustomerPortalEmail(string $customerCode, int $customerId): string
    {
        $base = strtolower(trim($customerCode));
        $base = preg_replace('/[^a-z0-9]+/', '.', $base ?? '') ?? '';
        $base = trim($base, '.');
        if ($base === '') {
            $base = 'customer.' . $customerId;
        }

        $domain = 'customers.globalcapital.local';
        $email = $base . '@' . $domain;
        $suffix = 1;

        while (User::query()->whereRaw('LOWER(email) = ?', [strtolower($email)])->exists()) {
            $email = $base . '.' . $suffix . '@' . $domain;
            $suffix++;
        }

        return $email;
    }

    /**
     * @return array{is_new_account:bool,email:string,password:?string,linked_user_id:int}|null
     */
    private function ensureCustomerPortalAccess(Customer $customer, int $assignedByUserId): ?array
    {
        $hasCustomerUserColumn = Schema::hasColumn('customers', 'user_id');
        if ($hasCustomerUserColumn && (int) ($customer->user_id ?? 0) > 0) {
            $existingLinkedUser = User::query()->find((int) $customer->user_id);
            if ($existingLinkedUser) {
                return null;
            }
        }

        $existingByEmail = null;
        if (!empty($customer->email)) {
            $existingByEmail = User::query()
                ->whereRaw('LOWER(email) = ?', [strtolower((string) $customer->email)])
                ->first();
        }

        if ($existingByEmail) {
            if ($hasCustomerUserColumn) {
                $customer->user_id = (int) $existingByEmail->id;
            }
            $customer->save();

            return [
                'is_new_account' => false,
                'email' => (string) $existingByEmail->email,
                'password' => null,
                'linked_user_id' => (int) $existingByEmail->id,
            ];
        }

        $email = $this->buildCustomerPortalEmail((string) ($customer->customer_code ?? ''), (int) $customer->id);
        $phoneDigits = preg_replace('/\D+/', '', (string) ($customer->phone ?? '')) ?? '';
        $passwordPlain = 'Cus@' . ($phoneDigits !== '' ? substr($phoneDigits, -6) : Str::upper(Str::random(6)));

        $userName = trim(((string) $customer->first_name) . ' ' . ((string) $customer->last_name));
        if ($userName === '') {
            $userName = 'Customer ' . (string) ($customer->customer_code ?: $customer->id);
        }

        $portalUser = User::query()->create([
            'name' => $userName,
            'email' => $email,
            'password' => Hash::make($passwordPlain),
            'branch_id' => (int) ($customer->branch_id ?? 0) ?: null,
        ]);

        if (Schema::hasTable('roles') && Schema::hasTable('user_roles')) {
            $customerRole = Role::query()->firstOrCreate(
                ['name' => 'Customer Portal'],
                ['description' => 'Customer login access for loan and savings visibility']
            );

            if ($assignedByUserId > 0) {
                $portalUser->roles()->syncWithoutDetaching([
                    $customerRole->id => [
                        'assigned_at' => now(),
                        'assigned_by' => $assignedByUserId,
                    ],
                ]);
            }
        }

        if (empty($customer->email)) {
            $customer->email = $email;
        }
        if ($hasCustomerUserColumn) {
            $customer->user_id = (int) $portalUser->id;
        }
        $customer->save();

        return [
            'is_new_account' => true,
            'email' => $email,
            'password' => $passwordPlain,
            'linked_user_id' => (int) $portalUser->id,
        ];
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
            'customer_code' => 'required|string|max:60',
            'customer_name' => 'required|string|max:255',
            'nick_name' => 'nullable|string|max:255',
            'nic' => 'required|string|max:100',
            'address' => 'required|string',
            'contact_no' => 'required|string|max:100',
            'bank_name' => 'nullable|string|max:190',
            'bank_branch' => 'nullable|string|max:190',
            'bank_account_no' => 'nullable|string|max:80',
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
            'charges_collection_status' => 'nullable|in:pending,done',
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
        $hasBankNameColumn = Schema::hasColumn('mf_loan_requests', 'bank_name');
        $hasBankBranchColumn = Schema::hasColumn('mf_loan_requests', 'bank_branch');
        $hasBankAccountNoColumn = Schema::hasColumn('mf_loan_requests', 'bank_account_no');

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

        $customerPortalCredentials = null;
        $loanRequest = DB::transaction(function () use ($request, $validated, $loanAmount, $totalCharges, $managerEmployee, $scope, $routeId, $centerId, $groupId, &$customerPortalCredentials, $hasBankNameColumn, $hasBankBranchColumn, $hasBankAccountNoColumn) {
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

            $loanPayload = [
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
                'charges_collection_status' => $validated['charges_collection_status'] ?? 'pending',
                'net_disbursed_amount' => $validated['charge_payment_mode'] === 'deduct_from_loan'
                    ? $loanAmount - $totalCharges
                    : $loanAmount,
                'loan_request_date' => $validated['loan_request_date'],
                'status' => 'requested',
                'created_by' => optional($request->user())->id,
            ];
            if ($hasBankNameColumn) {
                $loanPayload['bank_name'] = !empty($validated['bank_name']) ? $validated['bank_name'] : null;
            }
            if ($hasBankBranchColumn) {
                $loanPayload['bank_branch'] = !empty($validated['bank_branch']) ? $validated['bank_branch'] : null;
            }
            if ($hasBankAccountNoColumn) {
                $loanPayload['bank_account_no'] = !empty($validated['bank_account_no']) ? $validated['bank_account_no'] : null;
            }
            $loanRequest = MicrofinanceLoanRequest::create($loanPayload);

            $existingCustomer = Customer::query()
                ->where('nic_passport', $validated['nic'])
                ->first();

            $customerRecord = null;
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
                $customerRecord = $existingCustomer->fresh();
            } else {
                $safeNic = strtolower((string)$validated['nic']);
                $safeNic = preg_replace('/[^a-z0-9]/', '', $safeNic);
                if ($safeNic === '') {
                    $safeNic = 'customer' . $loanRequest->id;
                }

                $customerRecord = Customer::create([
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

            if ($customerRecord) {
                $customerPortalCredentials = $this->ensureCustomerPortalAccess($customerRecord, (int) $createdBy);
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

            if (
                ($validated['charge_payment_mode'] ?? '') === 'hand_cash'
                && ($validated['charges_collection_status'] ?? 'pending') === 'done'
            ) {
                $this->creditCollectorWalletForCharges($loanRequest, $totalCharges);
            }

            return $loanRequest;
        });

        try {
            $this->notifyLoanRequestCreated($loanRequest, $request);
        } catch (\Throwable $exception) {
            Log::warning('Failed to create microfinance approval notifications', [
                'loan_request_id' => (int) $loanRequest->id,
                'error' => $exception->getMessage(),
            ]);
        }

        $payload = $loanRequest->load([
            'route:id,name,code',
            'center:id,name,code',
            'group:id,name,code',
            'guarantors',
            'documents',
        ])->toArray();
        $payload['customer_portal_credentials'] = $customerPortalCredentials;

        return response()->json($payload, 201);
    }

    public function update(Request $request, MicrofinanceLoanRequest $loanRequest)
    {
        if (!$this->hasReleasedLoanActionAccess($request->user())) {
            return response()->json([
                'message' => 'Only Finance Manager, Branch Manager, and Admin can edit loan details.'
            ], 403);
        }

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
            'bank_name' => 'nullable|string|max:190',
            'bank_branch' => 'nullable|string|max:190',
            'bank_account_no' => 'nullable|string|max:80',
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
            'charges_collection_status' => 'nullable|in:pending,done',
            'loan_request_date' => 'nullable|date',
            'loan_end_date' => 'nullable|date',
            'next_payment_date' => 'nullable|date',
            'due_date' => 'nullable|date',
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
        $hasBankNameColumn = Schema::hasColumn('mf_loan_requests', 'bank_name');
        $hasBankBranchColumn = Schema::hasColumn('mf_loan_requests', 'bank_branch');
        $hasBankAccountNoColumn = Schema::hasColumn('mf_loan_requests', 'bank_account_no');

        if ($validated['charge_payment_mode'] === 'deduct_from_loan' && $totalCharges > $loanAmount) {
            return response()->json([
                'message' => 'Total charges cannot exceed loan amount when deducting charges from the loan.'
            ], 422);
        }

        $updatePayload = [
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
            'charges_collection_status' => $validated['charges_collection_status'] ?? $loanRequest->charges_collection_status ?? 'pending',
            'net_disbursed_amount' => $validated['charge_payment_mode'] === 'deduct_from_loan'
                ? max($loanAmount - $totalCharges, 0)
                : $loanAmount,
            'loan_request_date' => $validated['loan_request_date'] ?? $loanRequest->loan_request_date,
        ];
        if ($hasBankNameColumn) {
            $updatePayload['bank_name'] = array_key_exists('bank_name', $validated) ? ($validated['bank_name'] ?? null) : $loanRequest->bank_name;
        }
        if ($hasBankBranchColumn) {
            $updatePayload['bank_branch'] = array_key_exists('bank_branch', $validated) ? ($validated['bank_branch'] ?? null) : $loanRequest->bank_branch;
        }
        if ($hasBankAccountNoColumn) {
            $updatePayload['bank_account_no'] = array_key_exists('bank_account_no', $validated) ? ($validated['bank_account_no'] ?? null) : $loanRequest->bank_account_no;
        }
        $loanRequest->fill($updatePayload);

        if (array_key_exists('loan_end_date', $validated)) {
            $loanRequest->loan_end_date = $validated['loan_end_date'] ?? null;
        }

        $collectionDate = $validated['due_date'] ?? $validated['next_payment_date'] ?? null;
        if ($collectionDate !== null && $collectionDate !== '') {
            $loanRequest->next_payment_date = $collectionDate;
            $loanRequest->setAttribute('due_date', $collectionDate);

            $graceDays = max((int) ($loanRequest->penalty_grace_days ?? 2), 0);
            $loanRequest->penalty_starts_on = (new \DateTimeImmutable((string) $collectionDate))
                ->modify('+' . ($graceDays + 1) . ' days')
                ->format('Y-m-d');
        }

        $loanRequest->save();

        if (
            ($loanRequest->charge_payment_mode ?? '') === 'hand_cash'
            && ($loanRequest->charges_collection_status ?? 'pending') === 'done'
        ) {
            $this->creditCollectorWalletForCharges($loanRequest, $totalCharges);
        }

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
            $path = $file->store(
                'microfinance/loan-requests/' . $loanRequest->id . '/documents',
                'public'
            );

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

        if (!$this->hasLoanApprovalAccess($request->user())) {
            return response()->json([
                'message' => 'Only Loan Approver, Finance Manager, Branch Manager, and Admin can approve loans.'
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

        $validated = $request->validate([
            'approval_date' => ['nullable', 'date'],
            'next_payment_date' => ['nullable', 'date'],
            'loan_end_date' => ['nullable', 'date'],
        ]);

        $graceDays = 2;
        $approveDate = !empty($validated['approval_date'])
            ? new \DateTimeImmutable((string) $validated['approval_date'])
            : new \DateTimeImmutable(date('Y-m-d'));
        $refundOption = (string)$loanRequest->refund_option;
        $termCount = max((int)$loanRequest->terms_count, 1);

        $meetingDay = (string) optional($loanRequest->center)->meeting_day;
        $approvalBaseDate = $approveDate->format('Y-m-d');
        if (!empty($loanRequest->loan_request_date)) {
            try {
                $requestDate = new \DateTimeImmutable((string) $loanRequest->loan_request_date);
                if ($requestDate > $approveDate) {
                    $approvalBaseDate = $requestDate->format('Y-m-d');
                }
            } catch (\Throwable $e) {
                // keep approval date fallback
            }
        }
        $nextPaymentDate = !empty($validated['next_payment_date'])
            ? (string) $validated['next_payment_date']
            : $approvalBaseDate;
        $nextPaymentDate = $this->alignDateToUpcomingMeetingDay($nextPaymentDate, $meetingDay);

        $dueDate = $nextPaymentDate;
        $loanEndDate = !empty($validated['loan_end_date'])
            ? (string) $validated['loan_end_date']
            : $this->shiftByRefundOption(
                new \DateTimeImmutable($nextPaymentDate),
                $refundOption,
                max($termCount - 1, 0)
            )->format('Y-m-d');
        $loanEndDate = $this->alignDateToMeetingDay($loanEndDate, $meetingDay);

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
                'center:id,name,code,meeting_day',
                'group:id,name,code',
                'guarantors',
            ]),
        ]);
    }

    private function alignDateToMeetingDay(string $date, string $meetingDay): string
    {
        $normalizedDay = strtolower(trim($meetingDay));
        if ($normalizedDay === '') {
            return $date;
        }

        $dayMap = [
            'sunday' => 0,
            'monday' => 1,
            'tuesday' => 2,
            'wednesday' => 3,
            'thursday' => 4,
            'friday' => 5,
            'saturday' => 6,
        ];

        if (!array_key_exists($normalizedDay, $dayMap)) {
            return $date;
        }

        try {
            $cursor = new \DateTimeImmutable($date);
        } catch (\Throwable $e) {
            return $date;
        }

        $targetDow = $dayMap[$normalizedDay];
        $currentDow = (int) $cursor->format('w');
        $delta = ($targetDow - $currentDow + 7) % 7;

        return $cursor->modify('+' . $delta . ' days')->format('Y-m-d');
    }

    private function alignDateToUpcomingMeetingDay(string $date, string $meetingDay): string
    {
        $aligned = $this->alignDateToMeetingDay($date, $meetingDay);

        try {
            $original = new \DateTimeImmutable($date);
            $next = new \DateTimeImmutable($aligned);
        } catch (\Throwable $e) {
            return $aligned;
        }

        if ($next <= $original) {
            return $next->modify('+7 days')->format('Y-m-d');
        }

        return $aligned;
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
                'message' => 'Only Loan Approver, Finance Manager, Branch Manager, and Admin can reject loans.'
            ], 403);
        }

        $result = DB::transaction(function () use ($loanRequest, $validated) {
            $lockedLoanRequest = MicrofinanceLoanRequest::query()
                ->where('id', (int) $loanRequest->id)
                ->lockForUpdate()
                ->firstOrFail();

            if ($lockedLoanRequest->status !== 'requested') {
                return [
                    'ok' => false,
                    'message' => 'Only requested loans can be rejected.',
                    'status' => 422,
                ];
            }

            $lockedLoanRequest->status = 'rejected';
            $lockedLoanRequest->rejection_reason = $validated['rejection_reason'] ?? null;
            $lockedLoanRequest->rejected_at = now();
            $lockedLoanRequest->save();

            $totalCharges = (float) ($lockedLoanRequest->document_charges ?? 0)
                + (float) ($lockedLoanRequest->stamp_charges ?? 0)
                + (float) ($lockedLoanRequest->insurance_charges ?? 0);

            $refunded = false;
            if (
                (string) ($lockedLoanRequest->charge_payment_mode ?? '') === 'hand_cash'
                && (string) ($lockedLoanRequest->charges_collection_status ?? 'pending') === 'done'
            ) {
                $refunded = $this->refundCollectorWalletForCharges($lockedLoanRequest, $totalCharges);
            }

            return [
                'ok' => true,
                'message' => $refunded
                    ? 'Loan rejected successfully. Charges refunded to collector wallet.'
                    : 'Loan rejected successfully.',
                'data' => $lockedLoanRequest,
                'refund' => [
                    'attempted' => $totalCharges > 0,
                    'refunded' => $refunded,
                    'amount' => round($totalCharges, 2),
                ],
            ];
        });

        if (empty($result['ok'])) {
            return response()->json([
                'message' => $result['message'] ?? 'Unable to reject loan.',
            ], (int) ($result['status'] ?? 422));
        }

        return response()->json([
            'message' => $result['message'],
            'data' => $result['data'],
            'refund' => $result['refund'],
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

    private function downloadLoanDocumentByTemplate(MicrofinanceLoanRequest $loanRequest, string $templateType, string $filePrefix)
    {
        $companyId = (int) ($loanRequest->branch_id ?: 0);
        if ($companyId <= 0) {
            Log::warning('Download loan document failed: No company ID for loan request', [
                'loan_id' => $loanRequest->id,
                'template_type' => $templateType,
            ]);
            return response()->json([
                'message' => 'Company is not linked to this loan request.'
            ], 422);
        }

        $template = CompanyDocumentTemplate::query()
            ->where('company_id', $companyId)
            ->where('template_type', $templateType)
            ->where('is_active', true)
            ->latest('id')
            ->first();

        if (!$template) {
            Log::warning('Download loan document failed: No active template found', [
                'company_id' => $companyId,
                'loan_id' => $loanRequest->id,
                'template_type' => $templateType,
            ]);
            return response()->json([
                'message' => 'Active template not found for this company.'
            ], 404);
        }

        if (!Storage::disk('public')->exists($template->file_path)) {
            Log::error('Download loan document failed: Template file not found', [
                'template_id' => $template->id,
                'file_path' => $template->file_path,
                'loan_id' => $loanRequest->id,
                'template_type' => $templateType,
            ]);
            return response()->json([
                'message' => 'Template file does not exist in storage.'
            ], 404);
        }

        $inputPath = Storage::disk('public')->path($template->file_path);
        $placeholderKeys = $this->extractPlaceholdersFromDocx($inputPath);
        $templateText = $this->extractTemplateTextFromDocx($inputPath);

        Log::info('Download loan document processing', [
            'loan_id' => $loanRequest->id,
            'template_id' => $template->id,
            'template_type' => $templateType,
            'placeholders_found' => count($placeholderKeys),
            'placeholder_keys' => $placeholderKeys,
            'template_text_length' => strlen($templateText),
        ]);

        if ($templateText === '') {
            return response()->json([
                'message' => 'Template text could not be extracted for AI processing.'
            ], 422);
        }

        $loanData = $this->buildLoanAgreementVariables($loanRequest->load(['route:id,name,code', 'center:id,name,code', 'group:id,name,code']));
        $company = Company::query()->find($companyId);

        if ($company) {
            $loanData['lender_name'] = (string) ($company->name ?? '');
            $loanData['lender_address'] = (string) ($company->address ?? '');
            $loanData['lender_phone'] = (string) ($company->phone ?? '');
            $loanData['company_name'] = (string) ($company->name ?? '');
            $loanData['company_address'] = (string) ($company->address ?? '');
            $loanData['company_phone'] = (string) ($company->phone ?? '');
            $loanData['company_email'] = (string) ($company->email ?? '');
            $loanData['company_website'] = (string) ($company->website ?? '');
            $loanData['company_country'] = (string) ($company->country ?? '');
            $loanData['company_currency'] = (string) ($company->currency ?? '');
        }

        $companyDetails = [
            'name' => (string) ($company?->name ?? ''),
            'address' => (string) ($company?->address ?? ''),
            'phone' => (string) ($company?->phone ?? ''),
            'email' => (string) ($company?->email ?? ''),
            'website' => (string) ($company?->website ?? ''),
            'country' => (string) ($company?->country ?? ''),
            'currency' => (string) ($company?->currency ?? ''),
        ];

        $mapping = $this->mapPlaceholdersWithOpenAi($placeholderKeys, $loanData);
        $filledTemplateText = $this->applyMappingToTemplateText($templateText, $mapping);
        $aiHtml = $this->generateAgreementHtmlWithOpenAi($filledTemplateText, $loanData, $companyDetails);

        if (trim($aiHtml) === '') {
            Log::warning('AI generation unavailable, falling back to deterministic filled content', [
                'loan_id' => $loanRequest->id,
                'template_type' => $templateType,
                'template_text_length' => strlen($templateText),
                'filled_text_length' => strlen($filledTemplateText),
            ]);
        }

        $safeAiHtml = $this->applyMappingToHtml($aiHtml, $mapping);
        $safeFilledTemplateText = $this->applyMappingToTemplateText($filledTemplateText, $mapping);
        $finalHtml = $this->buildTemplateFaithfulPdfHtml($safeFilledTemplateText, $safeAiHtml);

        Log::info('Loan document mapping completed', [
            'loan_id' => $loanRequest->id,
            'template_type' => $templateType,
            'mapping_count' => count($mapping),
            'sample_mapping' => array_slice($mapping, 0, 5),
            'used_ai_html' => $aiHtml !== '',
            'filled_text_length' => strlen($safeFilledTemplateText),
            'filled_text_preview' => mb_substr(preg_replace('/\s+/', ' ', $safeFilledTemplateText), 0, 300),
            'final_html_length' => strlen($finalHtml),
        ]);

        $downloadName = $filePrefix . '_' . ($loanRequest->customer_no ?: $loanRequest->id) . '.pdf';

        Log::info('Download loan document successful', [
            'loan_id' => $loanRequest->id,
            'template_type' => $templateType,
            'download_name' => $downloadName
        ]);

        return Pdf::loadHTML($finalHtml)
            ->setPaper('a4', 'portrait')
            ->download($downloadName);
    }

    public function downloadAgreement(Request $request, MicrofinanceLoanRequest $loanRequest)
    {
        if (!$this->hasReleasedLoanActionAccess($request->user())) {
            return response()->json([
                'message' => 'Only Finance Manager, Branch Manager, and Admin can download agreements.'
            ], 403);
        }

        return $this->downloadLoanDocumentByTemplate($loanRequest, 'loan_agreement', 'loan_agreement');
    }

    public function downloadReminderLetter(Request $request, MicrofinanceLoanRequest $loanRequest)
    {
        if (!$this->hasReleasedLoanActionAccess($request->user())) {
            return response()->json([
                'message' => 'Only Finance Manager, Branch Manager, and Admin can download reminder letters.'
            ], 403);
        }

        return $this->downloadLoanDocumentByTemplate($loanRequest, 'reminder_letter', 'reminder_letter');
    }

    public function downloadLegalLetter(Request $request, MicrofinanceLoanRequest $loanRequest)
    {
        if (!$this->hasReleasedLoanActionAccess($request->user())) {
            return response()->json([
                'message' => 'Only Finance Manager, Branch Manager, and Admin can download legal letters.'
            ], 403);
        }

        return $this->downloadLoanDocumentByTemplate($loanRequest, 'arrears_letter', 'legal_letter');
    }

    public function destroy(Request $request, MicrofinanceLoanRequest $loanRequest)
    {
        if (!$this->canRemoveLoan($request->user())) {
            return response()->json([
                'message' => 'Only Super Admin can remove loans.',
            ], 403);
        }

        DB::transaction(function () use ($loanRequest): void {
            foreach ($loanRequest->documents()->get() as $document) {
                $path = trim((string) $document->file_path);
                if ($path !== '' && Storage::disk('public')->exists($path)) {
                    Storage::disk('public')->delete($path);
                }
            }

            $loanRequest->collections()->withTrashed()->forceDelete();
            $loanRequest->delete();
        });

        return response()->json([
            'message' => 'Loan removed successfully.',
        ]);
    }
}
