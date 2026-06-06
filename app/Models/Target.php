<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Target extends Model
{
    use HasFactory;
    protected $fillable = [
        'name', 'ip_address', 'location', 'notes',
        'warn_ms', 'critical_ms', 'is_paused',
        'alert_email', 'alert_consecutive', 'alert_cooldown_minutes', 'alerted_at',
        'escalation_email', 'escalation_after_minutes',
        'snmp_enabled', 'snmp_community', 'snmp_version',
    ];

    protected $casts = [
        'is_paused'                => 'boolean',
        'snmp_enabled'             => 'boolean',
        'alerted_at'               => 'datetime',
        'escalation_after_minutes' => 'integer',
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

    public function dependencies()
    {
        return $this->belongsToMany(Target::class, 'target_dependencies', 'target_id', 'depends_on_target_id');
    }

    public function dependedBy()
    {
        return $this->belongsToMany(Target::class, 'target_dependencies', 'depends_on_target_id', 'target_id');
    }

    public function switchConfigs()
    {
        return $this->hasMany(SwitchConfig::class);
    }
}
