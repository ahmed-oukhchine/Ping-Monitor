<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Target extends Model
{
    protected $fillable = [
        'name', 'ip_address', 'location', 'notes',
        'warn_ms', 'critical_ms', 'is_paused',
        'alert_email', 'alert_consecutive', 'alert_cooldown_minutes', 'alerted_at',
        'snmp_enabled', 'snmp_community', 'snmp_version',
    ];

    protected $casts = [
        'is_paused'    => 'boolean',
        'snmp_enabled' => 'boolean',
        'alerted_at'   => 'datetime',
    ];

    public function pingHistories()
    {
        return $this->hasMany(PingHistory::class);
    }

    public function latestPing()
    {
        return $this->hasOne(PingHistory::class)->latestOfMany();
    }

    public function groups()
    {
        return $this->belongsToMany(Group::class);
    }

    public function networkInterfaces()
    {
        return $this->hasMany(NetworkInterface::class);
    }
}
