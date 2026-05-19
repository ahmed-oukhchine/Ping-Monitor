<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class MaintenanceSchedule extends Model
{
    protected $fillable = [
        'name', 'target_ids', 'day_of_week', 'start_time', 'end_time', 'is_active', 'last_applied_at',
    ];

    protected $casts = [
        'target_ids'     => 'json',
        'day_of_week'    => 'integer',
        'is_active'      => 'boolean',
        'last_applied_at' => 'datetime',
    ];

    public function isCurrentlyActive(): bool
    {
        if (!$this->is_active) return false;

        $now = now();
        if ($this->day_of_week !== null && (int) $now->format('w') !== $this->day_of_week) return false;

        $start = $now->copy()->setTimeFromTimeString($this->start_time);
        $end   = $now->copy()->setTimeFromTimeString($this->end_time);

        if ($end->lessThan($start)) $end->addDay();

        return $now->between($start, $end);
    }

    public function apply(): void
    {
        Target::whereIn('id', $this->target_ids)->where('is_paused', false)->update(['is_paused' => true]);
        AuditLog::log('maintenance_apply', 'schedule', $this->id, null, ['name' => $this->name, 'target_ids' => $this->target_ids]);
        $this->update(['last_applied_at' => now()]);
    }

    public function revert(): void
    {
        Target::whereIn('id', $this->target_ids)->where('is_paused', true)->update(['is_paused' => false]);
        AuditLog::log('maintenance_revert', 'schedule', $this->id, null, ['name' => $this->name, 'target_ids' => $this->target_ids]);
        $this->update(['last_applied_at' => null]);
    }
}
