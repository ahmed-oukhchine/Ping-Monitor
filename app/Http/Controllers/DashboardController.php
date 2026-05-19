<?php

namespace App\Http\Controllers;

use App\Models\AuditLog;
use App\Models\CustomDashboard;
use Illuminate\Http\Request;

class DashboardController extends Controller
{
    public function index()
    {
        return response()->json(CustomDashboard::orderBy('created_at', 'desc')->get());
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'name'        => 'required|string|max:100',
            'description' => 'nullable|string|max:500',
            'widgets'     => 'nullable|array',
        ]);

        $data['created_by'] = auth()->id();

        if (CustomDashboard::count() === 0) {
            $data['is_default'] = true;
        }

        $dashboard = CustomDashboard::create($data);
        AuditLog::log('created', 'custom_dashboard', $dashboard->id, null, $dashboard->toArray());
        return response()->json($dashboard, 201);
    }

    public function update(Request $request, CustomDashboard $customDashboard)
    {
        $data = $request->validate([
            'name'        => 'sometimes|string|max:100',
            'description' => 'nullable|string|max:500',
            'widgets'     => 'nullable|array',
            'is_default'  => 'boolean',
        ]);

        $old = $customDashboard->toArray();
        $customDashboard->update($data);
        AuditLog::log('updated', 'custom_dashboard', $customDashboard->id, $old, $customDashboard->fresh()->toArray());
        return response()->json($customDashboard);
    }

    public function destroy(CustomDashboard $customDashboard)
    {
        AuditLog::log('deleted', 'custom_dashboard', $customDashboard->id, $customDashboard->toArray());
        $customDashboard->delete();
        return response()->json(['deleted' => true]);
    }
}
