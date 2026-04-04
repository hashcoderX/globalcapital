<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Company;
use App\Models\CompanyDocumentTemplate;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class CompanyDocumentTemplateController extends Controller
{
    public function index(Company $company): JsonResponse
    {
        $templates = CompanyDocumentTemplate::query()
            ->where('company_id', $company->id)
            ->orderByDesc('is_active')
            ->orderByDesc('id')
            ->get()
            ->map(function (CompanyDocumentTemplate $template) {
                return [
                    'id' => $template->id,
                    'template_type' => $template->template_type,
                    'file_path' => $template->file_path,
                    'original_name' => $template->original_name,
                    'is_active' => (bool) $template->is_active,
                    'uploaded_by' => $template->uploaded_by,
                    'created_at' => $template->created_at,
                    'updated_at' => $template->updated_at,
                    'file_url' => asset('storage/' . ltrim($template->file_path, '/')),
                ];
            });

        return response()->json($templates);
    }

    public function store(Request $request, Company $company): JsonResponse
    {
        $validated = $request->validate([
            'template_type' => ['required', 'in:loan_agreement,reminder_letter,arrears_letter,mortgage_agreement,mortgage_reminder,mortgage_legal_letter'],
            'template' => ['required', 'file', 'mimes:doc,docx', 'max:20480'],
        ]);

        $templateFile = $request->file('template');
        $templateType = (string) $validated['template_type'];

        CompanyDocumentTemplate::query()
            ->where('company_id', $company->id)
            ->where('template_type', $templateType)
            ->where('is_active', true)
            ->update(['is_active' => false]);

        $originalName = $templateFile->getClientOriginalName();
        $safeOriginalName = preg_replace('/\s+/', '_', $originalName);
        $fileName = time() . '_' . $company->id . '_' . $templateType . '_' . $safeOriginalName;
        $storedPath = $templateFile->storeAs('company_document_templates/' . $company->id, $fileName, 'public');

        $template = CompanyDocumentTemplate::create([
            'company_id' => $company->id,
            'template_type' => $templateType,
            'file_path' => $storedPath,
            'original_name' => $originalName,
            'uploaded_by' => $request->user()?->id,
            'is_active' => true,
        ]);

        return response()->json([
            'message' => 'Template uploaded successfully.',
            'data' => [
                'id' => $template->id,
                'template_type' => $template->template_type,
                'file_path' => $template->file_path,
                'original_name' => $template->original_name,
                'is_active' => (bool) $template->is_active,
                'uploaded_by' => $template->uploaded_by,
                'created_at' => $template->created_at,
                'updated_at' => $template->updated_at,
                'file_url' => asset('storage/' . ltrim($template->file_path, '/')),
            ],
        ], 201);
    }

    public function view(Company $company, CompanyDocumentTemplate $template)
    {
        if ((int) $template->company_id !== (int) $company->id) {
            return response()->json(['message' => 'Template not found for this company.'], 404);
        }

        if (!Storage::disk('public')->exists($template->file_path)) {
            return response()->json(['message' => 'Template file not found.'], 404);
        }

        $absolutePath = Storage::disk('public')->path($template->file_path);
        $mimeType = mime_content_type($absolutePath) ?: 'application/octet-stream';

        return response()->file($absolutePath, [
            'Content-Type' => $mimeType,
            'Content-Disposition' => 'inline; filename="' . $template->original_name . '"',
        ]);
    }

    public function destroy(Company $company, CompanyDocumentTemplate $template): JsonResponse
    {
        if ((int) $template->company_id !== (int) $company->id) {
            return response()->json(['message' => 'Template not found for this company.'], 404);
        }

        // Delete the file from storage if it exists
        if (Storage::disk('public')->exists($template->file_path)) {
            Storage::disk('public')->delete($template->file_path);
        }

        // Delete the database record
        $template->delete();

        return response()->json([
            'message' => 'Template deleted successfully.',
        ]);
    }
}
