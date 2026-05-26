<?php

namespace App\Http\Controllers;

use App\Models\AuditLog;
use App\Models\Vlan;
use Illuminate\Http\Request;

class VlanController extends Controller
{
    public function index()
    {
        return response()->json(Vlan::orderBy('vlan_id')->get());
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'vlan_id'     => 'required|integer|min:1|max:4094|unique:vlans,vlan_id',
            'name'        => 'required|string|max:100',
            'description' => 'nullable|string|max:500',
            'subnet'      => 'nullable|string|max:45',
            'gateway'     => 'nullable|string|max:45',
            'domain'      => 'nullable|string|max:100',
            'notes'       => 'nullable|string',
        ]);

        $vlan = Vlan::create($data);
        AuditLog::log('created', 'vlan', $vlan->id, null, $vlan->toArray());

        return response()->json($vlan, 201);
    }

    public function update(Request $request, Vlan $vlan)
    {
        $data = $request->validate([
            'vlan_id'     => 'required|integer|min:1|max:4094|unique:vlans,vlan_id,' . $vlan->id,
            'name'        => 'required|string|max:100',
            'description' => 'nullable|string|max:500',
            'subnet'      => 'nullable|string|max:45',
            'gateway'     => 'nullable|string|max:45',
            'domain'      => 'nullable|string|max:100',
            'notes'       => 'nullable|string',
        ]);

        $old = $vlan->fresh()->toArray();
        $vlan->update($data);
        AuditLog::log('updated', 'vlan', $vlan->id, $old, $vlan->fresh()->toArray());

        return response()->json($vlan->fresh());
    }

    public function destroy(Vlan $vlan)
    {
        $data = $vlan->toArray();
        $vlan->delete();
        AuditLog::log('deleted', 'vlan', $vlan->id, $data, null);
        return response()->json(['deleted' => true]);
    }
}
