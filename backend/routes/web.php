<?php

use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\Storage;
use App\Models\Candidate;
use App\Models\Company;
use App\Models\Customer;
use App\Models\MicrofinanceLoanRequestDocument;
use App\Support\StoredFile;
use App\Http\Controllers\Reports\LoanRepaymentReportController;

Route::get('/', function () {
    return view('welcome');
});

// Public media route for candidate photos, avoids symlink issues on some Windows setups
Route::get('/media/candidates/{candidate}/photo', function (Candidate $candidate) {
    if (!$candidate->photo_path) {
        abort(404);
    }
    if (!Storage::disk('public')->exists($candidate->photo_path)) {
        abort(404);
    }
    return response()->file(Storage::disk('public')->path($candidate->photo_path));
})->name('candidate.photo');

Route::get('/media/customers/{customer}/photo', function (Customer $customer) {
    if (!$customer->photo_path) {
        abort(404);
    }

    return StoredFile::response($customer->photo_path);
})->name('customer.photo');

Route::get('/media/companies/{company}/logo', function (Company $company) {
    if (!$company->logo_path) {
        abort(404);
    }

    return StoredFile::response($company->logo_path);
})->name('company.logo');

Route::get('/media/loan-documents/{document}', function (MicrofinanceLoanRequestDocument $document) {
    if (!$document->file_path) {
        abort(404);
    }

    return StoredFile::response($document->file_path);
})->name('loan-document.media');

Route::get('/reports/loan-repayment', [LoanRepaymentReportController::class, 'index'])
    ->name('reports.loan-repayment');
