<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class NetworkTopology extends Model
{
    protected $table = 'network_topology';

    protected $fillable = [
        'source_target_id', 'destination_target_id', 'label', 'discovery_method',
    ];

    public function source()
    {
        return $this->belongsTo(Target::class, 'source_target_id');
    }

    public function destination()
    {
        return $this->belongsTo(Target::class, 'destination_target_id');
    }
}
