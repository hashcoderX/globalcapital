<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class MicrofinanceCenter extends Model
{
    use HasFactory;

    protected $table = 'mf_centers';

    protected $fillable = [
        'mf_route_id',
        'name',
        'code',
        'meeting_day',
        'is_active',
    ];

    public function route()
    {
        return $this->belongsTo(MicrofinanceRoute::class, 'mf_route_id');
    }
}
