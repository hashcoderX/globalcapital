<?php

namespace App\Http\Controllers\Api\Microfinance;

use App\Http\Controllers\Controller;
use App\Models\MicrofinanceLoanProduct;
use Illuminate\Http\Request;

class LoanProductController extends Controller
{
    public function index()
    {
        return response()->json(
            MicrofinanceLoanProduct::orderBy('id', 'desc')->get()
        );
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255|unique:mf_loan_products,name',
            'interest_rate' => 'required|numeric|min:0',
            'interest_type' => 'required|in:flat,reducing',
            'terms_count' => 'required|integer|min:1|max:10000',
            'refund_option' => 'required|in:day,week,month',
            'is_active' => 'nullable|boolean',
        ]);

        $product = MicrofinanceLoanProduct::create([
            'name' => $validated['name'],
            'interest_rate' => $validated['interest_rate'],
            'interest_type' => $validated['interest_type'],
            'terms_count' => (int) $validated['terms_count'],
            'refund_option' => $validated['refund_option'],
            'is_active' => $validated['is_active'] ?? true,
        ]);

        return response()->json($product, 201);
    }

    public function show(MicrofinanceLoanProduct $loanProduct)
    {
        return response()->json($loanProduct);
    }

    public function update(Request $request, MicrofinanceLoanProduct $loanProduct)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255|unique:mf_loan_products,name,' . $loanProduct->id,
            'interest_rate' => 'required|numeric|min:0',
            'interest_type' => 'required|in:flat,reducing',
            'terms_count' => 'required|integer|min:1|max:10000',
            'refund_option' => 'required|in:day,week,month',
            'is_active' => 'nullable|boolean',
        ]);

        $loanProduct->update([
            'name' => $validated['name'],
            'interest_rate' => $validated['interest_rate'],
            'interest_type' => $validated['interest_type'],
            'terms_count' => (int) $validated['terms_count'],
            'refund_option' => $validated['refund_option'],
            'is_active' => $validated['is_active'] ?? true,
        ]);

        return response()->json($loanProduct);
    }

    public function destroy(MicrofinanceLoanProduct $loanProduct)
    {
        $loanProduct->delete();

        return response()->json(['message' => 'Loan product deleted successfully']);
    }
}
