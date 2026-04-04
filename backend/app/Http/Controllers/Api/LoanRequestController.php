<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Company;
use App\Models\CompanyDocumentTemplate;
use App\Models\LoanRequest;
use App\Models\LoanRequestDocument;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use ZipArchive;

class LoanRequestController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $perPage = (int) $request->get('per_page', 20);

        $query = LoanRequest::query()->withCount('documents')->orderByDesc('id');

        if ($request->filled('status')) {
            $query->where('status', (string) $request->get('status'));
        }

        if ($request->filled('approval_level')) {
            $query->where('approval_level', (int) $request->get('approval_level'));
        }

        return response()->json($query->paginate($perPage));
    }

    public function show(int $id): JsonResponse
    {
        return response()->json(LoanRequest::with('documents')->findOrFail($id));
    }

    public function store(Request $request): JsonResponse
    {
        // Multipart submissions send nested objects as JSON strings.
        $customerDetails = $request->input('customer_details');
        if (is_string($customerDetails)) {
            $decodedCustomer = json_decode($customerDetails, true);
            if (json_last_error() === JSON_ERROR_NONE && is_array($decodedCustomer)) {
                $request->merge(['customer_details' => $decodedCustomer]);
            }
        }

        $guarantorDetails = $request->input('guarantor_details');
        if (is_string($guarantorDetails)) {
            $decodedGuarantor = json_decode($guarantorDetails, true);
            if (json_last_error() === JSON_ERROR_NONE && is_array($decodedGuarantor)) {
                $request->merge(['guarantor_details' => $decodedGuarantor]);
            }
        }

        $validated = $request->validate([
            'branch_id' => ['nullable', 'integer', 'min:1'],
            'loan_product' => ['required', 'string', 'max:120'],
            'principal' => ['required', 'numeric', 'min:0.01'],
            'annual_rate' => ['required', 'numeric', 'min:0'],
            'tenure_months' => ['required', 'integer', 'min:1'],
            'installment_frequency' => ['required', 'in:weekly,monthly'],
            'installments' => ['required', 'integer', 'min:1'],
            'installment_amount' => ['required', 'numeric', 'min:0.01'],
            'total_payable' => ['required', 'numeric', 'min:0.01'],

            'customer_details' => ['required', 'array'],
            'customer_details.customerNo' => ['required', 'string', 'max:60'],
            'customer_details.fullName' => ['required', 'string', 'max:190'],
            'customer_details.nic' => ['required', 'string', 'max:80'],
            'customer_details.mobile' => ['required', 'string', 'max:40'],
            'customer_details.address' => ['required', 'string'],
            'customer_details.monthlyIncome' => ['required', 'numeric', 'min:0.01'],
            'customer_details.incomeSource' => ['required', 'string', 'max:120'],
            'customer_details.businessName' => ['nullable', 'string', 'max:190'],
            'customer_details.additionalIncome' => ['nullable', 'numeric', 'min:0'],

            'guarantor_details' => ['nullable', 'array'],
            'guarantor_details.*.fullName' => ['nullable', 'string', 'max:190'],
            'guarantor_details.*.nic' => ['nullable', 'string', 'max:80'],
            'guarantor_details.*.mobile' => ['nullable', 'string', 'max:40'],
            'guarantor_details.*.relation' => ['nullable', 'string', 'max:120'],
            'guarantor_details.*.address' => ['nullable', 'string'],
            'guarantor_details.*.monthlyIncome' => ['nullable', 'numeric', 'min:0'],

            'required_approval_level' => ['nullable', 'integer', 'min:1', 'max:5'],

            'documents' => ['nullable', 'array', 'max:10'],
            'documents.*' => ['file', 'mimes:pdf,doc,docx,jpg,jpeg,png', 'max:10240'],
        ]);

        $user = $request->user();
        $customer = $validated['customer_details'];
        $requiredApprovalLevel = (int) ($validated['required_approval_level'] ?? 2);
        $resolvedBranchId = (int) ($user?->branch_id ?? $validated['branch_id'] ?? 1);

        $loanRequest = LoanRequest::create([
            'tenant_id' => 1,
            'branch_id' => $resolvedBranchId,
            'loan_product' => (string) $validated['loan_product'],
            'customer_no' => (string) $customer['customerNo'],
            'customer_full_name' => (string) $customer['fullName'],
            'customer_nic' => (string) $customer['nic'],
            'customer_mobile' => (string) $customer['mobile'],
            'customer_address' => (string) $customer['address'],
            'principal' => (float) $validated['principal'],
            'annual_rate' => (float) $validated['annual_rate'],
            'tenure_months' => (int) $validated['tenure_months'],
            'installment_frequency' => (string) $validated['installment_frequency'],
            'installments' => (int) $validated['installments'],
            'installment_amount' => (float) $validated['installment_amount'],
            'total_payable' => (float) $validated['total_payable'],
            'customer_details' => $customer,
            'guarantor_details' => $validated['guarantor_details'] ?? null,
            'status' => 'pending_approval',
            'approval_level' => 1,
            'required_approval_level' => $requiredApprovalLevel,
            'created_by' => $user?->id,
        ]);

        $loanRequest->request_no = 'LREQ-' . str_pad((string) $loanRequest->id, 6, '0', STR_PAD_LEFT);
        $loanRequest->save();

        if ($request->hasFile('documents')) {
            $uploadedDocuments = $request->file('documents', []);
            if (!is_array($uploadedDocuments)) {
                $uploadedDocuments = [$uploadedDocuments];
            }

            foreach ($uploadedDocuments as $index => $file) {
                if ($file === null) {
                    continue;
                }

                $originalName = $file->getClientOriginalName();
                $safeOriginalName = preg_replace('/\s+/', '_', $originalName);
                $fileName = time() . '_' . $loanRequest->id . '_' . $index . '_' . $safeOriginalName;
                $filePath = $file->storeAs('loan_request_documents', $fileName, 'public');

                LoanRequestDocument::create([
                    'loan_request_id' => $loanRequest->id,
                    'document_type' => 'supporting',
                    'file_path' => $filePath,
                    'original_name' => $originalName,
                    'uploaded_by' => $user?->id,
                ]);
            }
        }

        $loanRequest->load('documents');

        return response()->json([
            'message' => 'Loan request submitted successfully.',
            'data' => $loanRequest,
        ], 201);
    }

    public function updateStatus(Request $request, int $id): JsonResponse
    {
        $validated = $request->validate([
            'action' => ['required', 'in:approve,reject'],
            'note' => ['nullable', 'string', 'max:1000'],
        ]);

        $loanRequest = LoanRequest::findOrFail($id);

        if ($loanRequest->status !== 'pending_approval') {
            return response()->json([
                'message' => 'Only pending loan requests can be approved or rejected.',
            ], 422);
        }

        if ($validated['action'] === 'reject' && empty(trim((string) ($validated['note'] ?? '')))) {
            return response()->json([
                'message' => 'Rejection note is required.',
            ], 422);
        }

        if ($validated['action'] === 'reject') {
            $loanRequest->status = 'rejected';
        } else {
            if ($loanRequest->approval_level < $loanRequest->required_approval_level) {
                $loanRequest->approval_level += 1;
                $loanRequest->status = $loanRequest->approval_level >= $loanRequest->required_approval_level
                    ? 'approved'
                    : 'pending_approval';
            } else {
                $loanRequest->status = 'approved';
            }
        }

        $loanRequest->approval_note = $validated['note'] ?? null;
        $loanRequest->last_action_by = $request->user()?->id;
        $loanRequest->last_action_at = now();
        $loanRequest->save();

        $documentMessage = null;
        if ($validated['action'] === 'approve' && $loanRequest->status === 'approved') {
            $documentMessage = $this->generateLoanAgreementIfTemplateExists($loanRequest, $request->user()?->id);
        }

        return response()->json([
            'message' => 'Loan request status updated successfully.',
            'data' => $loanRequest,
            'document_message' => $documentMessage,
        ]);
    }

    private function generateLoanAgreementIfTemplateExists(LoanRequest $loanRequest, ?int $userId): ?string
    {
        $company = Company::find($loanRequest->branch_id);
        if (!$company) {
            return 'Company not found for branch; loan agreement template generation skipped.';
        }

        $template = CompanyDocumentTemplate::query()
            ->where('company_id', $company->id)
            ->where('template_type', 'loan_agreement')
            ->where('is_active', true)
            ->latest('id')
            ->first();

        if (!$template) {
            return 'No active loan agreement template configured for this company.';
        }

        $templateAbsolutePath = Storage::disk('public')->path($template->file_path);
        if (!file_exists($templateAbsolutePath)) {
            return 'Loan agreement template file is missing; generation skipped.';
        }

        $generatedDirectory = 'loan_generated_documents';
        $generatedName = 'loan_agreement_' . ($loanRequest->request_no ?: $loanRequest->id) . '_' . time() . '.docx';
        $generatedRelativePath = $generatedDirectory . '/' . $generatedName;
        $generatedAbsolutePath = Storage::disk('public')->path($generatedRelativePath);

        $this->ensureDirectoryExists(dirname($generatedAbsolutePath));
        copy($templateAbsolutePath, $generatedAbsolutePath);

        $replacements = [
            'company_name' => (string) ($company->name ?? ''),
            'customer_name' => (string) $loanRequest->customer_full_name,
            'customer_no' => (string) $loanRequest->customer_no,
            'issue_date' => now()->format('Y-m-d'),
            'installment' => number_format((float) $loanRequest->installment_amount, 2, '.', ''),
            'principal' => number_format((float) $loanRequest->principal, 2, '.', ''),
            'total_payable' => number_format((float) $loanRequest->total_payable, 2, '.', ''),
            'loan_product' => (string) $loanRequest->loan_product,
            'request_no' => (string) $loanRequest->request_no,
        ];

        $this->replaceDocxPlaceholders($generatedAbsolutePath, $replacements);

        LoanRequestDocument::create([
            'loan_request_id' => $loanRequest->id,
            'document_type' => 'loan_agreement_generated',
            'file_path' => $generatedRelativePath,
            'original_name' => 'Loan_Agreement_' . ($loanRequest->request_no ?: $loanRequest->id) . '.docx',
            'uploaded_by' => $userId,
        ]);

        return 'Loan agreement generated from template successfully.';
    }

    private function replaceDocxPlaceholders(string $docxPath, array $replacements): void
    {
        $zip = new ZipArchive();
        $opened = $zip->open($docxPath);
        if ($opened !== true) {
            return;
        }

        for ($i = 0; $i < $zip->numFiles; $i++) {
            $name = $zip->getNameIndex($i);
            if (!is_string($name)) {
                continue;
            }

            if (!(str_starts_with($name, 'word/') && str_ends_with($name, '.xml'))) {
                continue;
            }

            $xml = $zip->getFromIndex($i);
            if (!is_string($xml)) {
                continue;
            }

            foreach ($replacements as $key => $value) {
                $safeValue = htmlspecialchars((string) $value, ENT_QUOTES | ENT_XML1);
                $xml = str_replace('{{' . $key . '}}', $safeValue, $xml);
                $xml = str_replace('${' . $key . '}', $safeValue, $xml);
            }

            $zip->addFromString($name, $xml);
        }

        $zip->close();
    }

    private function ensureDirectoryExists(string $directory): void
    {
        if (!is_dir($directory)) {
            mkdir($directory, 0775, true);
        }
    }
}
