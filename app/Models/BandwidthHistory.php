<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class BandwidthHistory extends Model
{
    protected $table = 'bandwidth_history';

    public $timestamps = false;

    protected $fillable = [
        'network_interface_id', 'in_octets', 'out_octets', 'created_at',
    ];

    protected $casts = [
        'in_octets' => 'integer',
        'out_octets' => 'integer',
        'created_at' => 'datetime',
    ];

    public function networkInterface()
    {
        return $this->belongsTo(NetworkInterface::class);
    }
}
