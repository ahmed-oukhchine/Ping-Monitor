<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Vlan extends Model
{
    protected $table = 'vlans';

    protected $fillable = [
        'vlan_id', 'name', 'description',
        'subnet', 'gateway', 'domain', 'notes',
    ];
}
