<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

Schedule::command('savings:apply-monthly-interest')
    ->dailyAt('23:55')
    ->withoutOverlapping()
    ->name('savings-monthly-interest');

Schedule::command('microfinance:recalculate-arrears')
    ->dailyAt('00:10')
    ->withoutOverlapping()
    ->name('microfinance-recalculate-arrears');
