<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class NetworkInterface extends Model
{
    protected $table = 'network_interfaces';

    protected $fillable = [
        'target_id', 'snmp_index', 'name', 'description', 'type',
        'speed', 'mac_address', 'is_up', 'in_octets', 'out_octets', 'last_polled_at',
    ];

    protected $casts = [
        'is_up' => 'boolean',
        'speed' => 'integer',
        'in_octets' => 'integer',
        'out_octets' => 'integer',
        'last_polled_at' => 'datetime',
    ];

    public function target()
    {
        return $this->belongsTo(Target::class);
    }
}
