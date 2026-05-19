<?php

namespace App\Http\Controllers;

use App\Models\AuditLog;
use App\Models\MaintenanceSchedule;
use App\Models\Target;
use Illuminate\Http\Request;

class MaintenanceScheduleController extends Controller
{
    public function index()
    {
        $schedules = MaintenanceSchedule::orderBy('created_at', 'desc')->get()->map(function ($s) {
            $s->target_names = Target::whereIn('id', $s->target_ids)->pluck('name');
            return $s;
        });
        return response()->json($schedules);
    }

    public function targets()
    {
        return response()->json(Target::orderBy('name')->get(['id', 'name']));
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'name'         => 'required|string|max:100',
            'target_ids'   => 'required|array',
            'target_ids.*'  => 'integer|exists:targets,id',
            'day_of_week'  => 'nullable|integer|between:0,6',
            'days_of_week' => 'nullable|array',
            'days_of_week.*' => 'integer|between:0,6',
            'start_time'   => 'required|date_format:H:i',
            'end_time'     => 'required|date_format:H:i',
        ]);

        $schedule = MaintenanceSchedule::create($data);
        AuditLog::log('created', 'maintenance_schedule', $schedule->id, null, $schedule->toArray());
        return response()->json($schedule, 201);
    }

    public function update(Request $request, MaintenanceSchedule $maintenanceSchedule)
    {
        $data = $request->validate([
            'name'         => 'required|string|max:100',
            'target_ids'   => 'required|array',
            'target_ids.*'  => 'integer|exists:targets,id',
            'day_of_week'  => 'nullable|integer|between:0,6',
            'days_of_week' => 'nullable|array',
            'days_of_week.*' => 'integer|between:0,6',
            'start_time'   => 'required|date_format:H:i',
            'end_time'     => 'required|date_format:H:i',
        ]);

        $old = $maintenanceSchedule->toArray();
        $maintenanceSchedule->update($data);
        AuditLog::log('updated', 'maintenance_schedule', $maintenanceSchedule->id, $old, $maintenanceSchedule->fresh()->toArray());
        return response()->json($maintenanceSchedule);
    }

    public function destroy(MaintenanceSchedule $maintenanceSchedule)
    {
        if ($maintenanceSchedule->isCurrentlyActive()) {
            $maintenanceSchedule->revert();
        }
        AuditLog::log('deleted', 'maintenance_schedule', $maintenanceSchedule->id, $maintenanceSchedule->toArray());
        $maintenanceSchedule->delete();
        return response()->json(['deleted' => true]);
    }

    public function toggle(MaintenanceSchedule $maintenanceSchedule)
    {
        $maintenanceSchedule->update(['is_active' => !$maintenanceSchedule->is_active]);
        if (!$maintenanceSchedule->is_active && $maintenanceSchedule->last_applied_at) {
            $maintenanceSchedule->revert();
        }
        return response()->json($maintenanceSchedule);
    }
}
