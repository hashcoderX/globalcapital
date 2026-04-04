<?php

require_once __DIR__ . '/vendor/autoload.php';

$app = require_once __DIR__ . '/bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use App\Models\MicrofinanceLoanRequest;
use Illuminate\Support\Facades\Storage;
use App\Http\Controllers\Api\Microfinance\LoanRequestController;

// Get controller instance through Laravel's container
$controller = app(LoanRequestController::class);
$templatePath = Storage::disk('public')->path('company_document_templates/1/1775290584_1_loan_agreement_LOAN_AGREEMENT.docx');

echo "Testing placeholder extraction...\n";
$placeholders = $controller->extractPlaceholdersFromDocx($templatePath);
echo "Placeholders found: " . count($placeholders) . "\n";
if (count($placeholders) > 0) {
    echo "Placeholders: " . implode(', ', array_keys($placeholders)) . "\n";
} else {
    echo "No placeholders found in template!\n";
}

echo "\nTesting loan data building...\n";
$loan = MicrofinanceLoanRequest::where('status', 'requested')->first();
if ($loan) {
    $loanData = $controller->buildLoanAgreementVariables($loan->load(['route:id,name,code', 'center:id,name,code', 'group:id,name,code']));
    echo "Loan data keys: " . implode(', ', array_keys($loanData)) . "\n";
    echo "Sample data:\n";
    foreach (array_slice($loanData, 0, 5) as $key => $value) {
        echo "  $key: $value\n";
    }
} else {
    echo "No loan request found!\n";
}