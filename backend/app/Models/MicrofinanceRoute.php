<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class MicrofinanceRoute extends Model
{
    use HasFactory;

    protected $table = 'mf_routes';

    protected $fillable = [
        'name',
        'code',
        'is_active',
    ];

    public function groups()
    {
        return $this->hasMany(MicrofinanceGroup::class, 'mf_route_id');
    }
}
