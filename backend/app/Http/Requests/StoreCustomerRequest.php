<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreCustomerRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'customer_code' => ['nullable', 'string', 'max:60', 'unique:customers,customer_code'],
            'first_name' => ['required', 'string', 'max:120'],
            'last_name' => ['required', 'string', 'max:120'],
            'email' => ['nullable', 'email', 'max:255', 'unique:customers,email'],
            'phone' => ['required', 'string', 'max:20'],
            'nic_passport' => ['required', 'string', 'max:60', 'unique:customers,nic_passport'],
            'date_of_birth' => ['required', 'date'],
            'gender' => ['required', 'in:male,female,other'],
            'marital_status' => ['nullable', 'in:single,married,divorced,widowed'],
            'nationality' => ['nullable', 'string', 'max:120'],
            'permanent_address' => ['required', 'string', 'max:1000'],
            'current_address' => ['nullable', 'string', 'max:1000'],
            'employment_type' => ['nullable', 'in:salaried,self_employed,business'],
            'employer_name' => ['nullable', 'string', 'max:255'],
            'job_title' => ['nullable', 'string', 'max:255'],
            'monthly_income' => ['nullable', 'numeric', 'min:0'],
            'other_income_sources' => ['nullable', 'string', 'max:500'],
            'existing_loans' => ['nullable', 'boolean'],
            'monthly_loan_obligations' => ['nullable', 'numeric', 'min:0'],
            'credit_score' => ['nullable', 'integer', 'min:0'],
        ];
    }
}
