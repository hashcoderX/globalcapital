<?php

require_once __DIR__ . '/vendor/autoload.php';

$app = require_once __DIR__ . '/bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use App\Models\CompanyDocumentTemplate;
use Illuminate\Support\Facades\Storage;

$template = CompanyDocumentTemplate::where('template_type', 'loan_agreement')->where('is_active', true)->first();

if (!$template) {
    echo "No active template found\n";
    exit(1);
}

echo "Template found: {$template->file_path}\n";
echo "File exists: " . (Storage::disk('public')->exists($template->file_path) ? 'YES' : 'NO') . "\n";
echo "Full path: " . Storage::disk('public')->path($template->file_path) . "\n";

if (Storage::disk('public')->exists($template->file_path)) {
    $inputPath = Storage::disk('public')->path($template->file_path);

    // Test placeholder extraction
    $zip = new \ZipArchive();
    if ($zip->open($inputPath) === true) {
        $placeholders = [];
        for ($i = 0; $i < $zip->numFiles; $i++) {
            $entryName = $zip->getNameIndex($i);
            if (!str_starts_with($entryName, 'word/') || !str_ends_with($entryName, '.xml')) {
                continue;
            }

            $content = $zip->getFromIndex($i);
            if (preg_match_all('/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}|\$\{\s*([a-zA-Z0-9_]+)\s*\}/', $content, $matches, PREG_SET_ORDER)) {
                foreach ($matches as $match) {
                    $key = $match[1] !== '' ? $match[1] : $match[2];
                    $placeholders[$key] = true;
                }
            }
        }
        $zip->close();

        echo "Found placeholders: " . implode(', ', array_keys($placeholders)) . "\n";
    } else {
        echo "Cannot open DOCX file\n";
    }
}