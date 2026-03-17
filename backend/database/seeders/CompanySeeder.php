<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use App\Models\Company;

class CompanySeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        \App\Models\Company::updateOrCreate(
            ['email' => 'admin@company.com'],
            [
                'name' => 'Default Company',
                'address' => '123 Main St',
                'phone' => '123-456-7890',
                'website' => 'https://company.com',
            ]
        );
    }
}