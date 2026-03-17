<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;
use App\Models\User;
use Laravel\Sanctum\Sanctum;

class MortgageFlowTest extends TestCase
{
    use RefreshDatabase;

    public function test_customer_and_mortgage_creation_flow(): void
    {
        // Create and authenticate a test user
        $user = User::factory()->create();
        Sanctum::actingAs($user);

        // Step 1: Create a customer
        $customerPayload = [
            'first_name' => 'John',
            'last_name' => 'Doe',
            'email' => 'john.doe@example.com',
            'phone' => '0771234567',
            'nic_passport' => '902345678V',
            'date_of_birth' => '1990-02-15',
            'gender' => 'male',
            'marital_status' => 'single',
            'nationality' => 'Sri Lankan',
            'permanent_address' => '123, Main Street, City',
            'current_address' => '456, Second Street, City',
            'employment_type' => 'salaried',
            'employer_name' => 'ACME Corp',
            'job_title' => 'Engineer',
            'monthly_income' => 150000,
            'other_income_sources' => 'Freelance',
            'existing_loans' => false,
            'monthly_loan_obligations' => 0,
            'credit_score' => 650,
        ];

        $customerRes = $this->postJson('/api/customers', $customerPayload);
        $customerRes->assertStatus(201);
        $customerId = $customerRes->json('id');
        $this->assertNotEmpty($customerId, 'Customer ID should be present');

        // Step 2: Create a mortgage (stubbed controller should accept the payload)
        $mortgagePayload = [
            'customer_id' => $customerId,
            'mortgage_type' => 'land',
            'requested_amount' => 500000,
            'interest_rate' => 12.5,
            'interest_type' => 'fixed',
            'tenure_months' => 60,
            'processing_fee' => 1000,
            'penalty_rate' => 2.5,
            'asset' => [
                'description' => 'Residential land parcel',
                'ownership_type' => 'single',
                'asset_type' => 'land',
            ],
            'valuation' => [
                'market_value' => 700000,
                'forced_sale_value' => 600000,
                'valuation_date' => '2025-12-20',
                'valuer_name' => 'System',
            ],
        ];

        $mortgageRes = $this->postJson('/api/mortgages', $mortgagePayload);
        $mortgageRes->assertStatus(201)->assertJsonStructure(['id']);
    }
}
