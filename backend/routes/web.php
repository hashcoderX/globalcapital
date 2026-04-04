<?php

use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\Storage;
use App\Models\Candidate;
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

Route::get('/reports/loan-repayment', [LoanRepaymentReportController::class, 'index'])
    ->name('reports.loan-repayment');
