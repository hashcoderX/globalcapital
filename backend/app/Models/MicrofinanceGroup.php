<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class MicrofinanceGroup extends Model
{
    use HasFactory;

    protected $table = 'mf_groups';

    protected $fillable = [
        'mf_route_id',
        'mf_center_id',
        'name',
        'code',
        'is_active',
    ];

    public function route()
    {
        return $this->belongsTo(MicrofinanceRoute::class, 'mf_route_id');
    }

    public function center()
    {
        return $this->belongsTo(MicrofinanceCenter::class, 'mf_center_id');
    }

    public function loans()
    {
        return $this->hasMany(MicrofinanceLoanRequest::class, 'mf_group_id');
    }
}
