<?php

$zip = new ZipArchive();
$path = 'storage/app/public/company_document_templates/1/1775290584_1_loan_agreement_LOAN_AGREEMENT.docx';

if ($zip->open($path) === true) {
    echo "DOCX file opened successfully\n\n";

    for ($i = 0; $i < $zip->numFiles; $i++) {
        $entryName = $zip->getNameIndex($i);
        if (str_starts_with($entryName, 'word/') && str_ends_with($entryName, '.xml')) {
            $content = $zip->getFromIndex($i);

            // Look for any potential placeholders
            $patterns = [
                '/\{\{[^}]+\}\}/',  // {{anything}}
                '/\$\{[^}]+\}/',    // ${anything}
                '/\[\[[^\]]+\]\]/', // [[anything]]
                '/<<[^>]+>>/',      // <<anything>>
                '/\{[^}]*\}/',      // {anything} (broader)
            ];

            $found = false;
            foreach ($patterns as $pattern) {
                if (preg_match_all($pattern, $content, $matches)) {
                    if (!$found) {
                        echo "File: $entryName\n";
                        $found = true;
                    }
                    echo "  Pattern $pattern: " . implode(', ', $matches[0]) . "\n";
                }
            }

            if ($found) {
                echo "\n";
            }
        }
    }
    $zip->close();
} else {
    echo "Cannot open DOCX file\n";
}