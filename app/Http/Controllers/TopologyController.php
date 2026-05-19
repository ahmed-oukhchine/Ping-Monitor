<?php

namespace App\Http\Controllers;

use App\Models\AuditLog;
use App\Models\NetworkTopology;
use App\Models\Target;
use Illuminate\Http\Request;

class TopologyController extends Controller
{
    public function index()
    {
        $targets = Target::orderBy('name')->get(['id', 'name', 'ip_address', 'last_status', 'is_paused', 'topology_x', 'topology_y']);
        $connections = NetworkTopology::with(['source:id,name', 'destination:id,name'])->get();

        return response()->json([
            'targets'     => $targets,
            'connections' => $connections,
        ]);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'source_target_id'      => 'required|integer|exists:targets,id',
            'destination_target_id' => 'required|integer|exists:targets,id|different:source_target_id',
            'label'                 => 'nullable|string|max:100',
        ]);

        $existing = NetworkTopology::where(function ($q) use ($data) {
            $q->where(['source_target_id' => $data['source_target_id'], 'destination_target_id' => $data['destination_target_id']])
              ->orWhere(['source_target_id' => $data['destination_target_id'], 'destination_target_id' => $data['source_target_id']]);
        })->exists();

        if ($existing) {
            return response()->json(['message' => 'Connection already exists'], 409);
        }

        $connection = NetworkTopology::create($data);
        $connection->load(['source:id,name', 'destination:id,name']);
        AuditLog::log('created', 'topology_connection', $connection->id, null, $connection->toArray());

        return response()->json($connection, 201);
    }

    public function destroy(NetworkTopology $networkTopology)
    {
        AuditLog::log('deleted', 'topology_connection', $networkTopology->id, $networkTopology->toArray());
        $networkTopology->delete();
        return response()->json(['deleted' => true]);
    }

    public function savePositions(Request $request)
    {
        $data = $request->validate([
            'positions'            => 'required|array',
            'positions.*.id'       => 'required|integer|exists:targets,id',
            'positions.*.topology_x' => 'required|numeric',
            'positions.*.topology_y' => 'required|numeric',
        ]);

        foreach ($data['positions'] as $pos) {
            Target::where('id', $pos['id'])->update([
                'topology_x' => $pos['topology_x'],
                'topology_y' => $pos['topology_y'],
            ]);
        }

        AuditLog::log('topology_positions_saved', 'topology', null, null, ['count' => count($data['positions'])]);

        return response()->json(['saved' => count($data['positions'])]);
    }
}
