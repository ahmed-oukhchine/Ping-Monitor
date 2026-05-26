<?php

namespace App\Http\Controllers;

use App\Models\SwitchConfig;
use App\Models\AuditLog;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class SwitchConfigController extends Controller
{
    public function index()
    {
        $latestIds = DB::table('switch_configs')
            ->selectRaw('MAX(id) as id')
            ->groupBy('hostname')
            ->pluck('id');

        $configs = SwitchConfig::whereIn('id', $latestIds)
            ->with(['target:id,name', 'creator:id,name'])
            ->orderBy('created_at', 'desc')
            ->get()
            ->map(fn($c) => [
                'id'           => $c->id,
                'hostname'     => $c->hostname,
                'vendor'       => $c->vendor,
                'model'        => $c->model,
                'os_version'   => $c->os_version,
                'serial_number'=> $c->serial_number,
                'ports_count'  => $c->ports_count,
                'version'      => $c->version,
                'config_text'  => $c->config_text,
                'target'       => $c->target ? ['id' => $c->target->id, 'name' => $c->target->name] : null,
                'created_by'   => $c->creator->name ?? null,
                'created_at'   => $c->created_at,
                'updated_at'   => $c->updated_at,
            ]);

        return response()->json($configs);
    }

    public function show(SwitchConfig $switchConfig)
    {
        $switchConfig->load(['target:id,name', 'creator:id,name']);
        return response()->json([
            'id'           => $switchConfig->id,
            'hostname'     => $switchConfig->hostname,
            'vendor'       => $switchConfig->vendor,
            'model'        => $switchConfig->model,
            'os_version'   => $switchConfig->os_version,
            'serial_number'=> $switchConfig->serial_number,
            'ports_count'  => $switchConfig->ports_count,
            'version'      => $switchConfig->version,
            'config_text'  => $switchConfig->config_text,
            'target'       => $switchConfig->target ? ['id' => $switchConfig->target->id, 'name' => $switchConfig->target->name] : null,
            'created_by'   => $switchConfig->creator->name ?? null,
            'created_at'   => $switchConfig->created_at,
            'updated_at'   => $switchConfig->updated_at,
        ]);
    }

    public function versions(SwitchConfig $switchConfig)
    {
        $versions = SwitchConfig::where('hostname', $switchConfig->hostname)
            ->with('creator:id,name')
            ->orderBy('version', 'desc')
            ->get()
            ->map(fn($v) => [
                'id'          => $v->id,
                'version'     => $v->version,
                'config_text' => $v->config_text,
                'vendor'      => $v->vendor,
                'model'       => $v->model,
                'os_version'  => $v->os_version,
                'serial_number' => $v->serial_number,
                'ports_count'   => $v->ports_count,
                'created_by'  => $v->creator->name ?? null,
                'created_at'  => $v->created_at,
            ]);

        return response()->json($versions);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'target_id'     => 'nullable|exists:targets,id',
            'hostname'      => 'required|string|max:255',
            'vendor'        => 'nullable|string|max:100',
            'model'         => 'nullable|string|max:100',
            'os_version'    => 'nullable|string|max:100',
            'serial_number' => 'nullable|string|max:100',
            'ports_count'   => 'nullable|integer|min:0|max:65535',
            'config_text'   => 'nullable|string',
        ]);

        $data['version'] = 1;
        $data['created_by'] = Auth::id();

        $config = SwitchConfig::create($data);
        $config->load(['target:id,name', 'creator:id,name']);

        AuditLog::log('created', 'switch_config', $config->id, null, $config->toArray());

        return response()->json([
            'id'           => $config->id,
            'hostname'     => $config->hostname,
            'vendor'       => $config->vendor,
            'model'        => $config->model,
            'os_version'   => $config->os_version,
            'serial_number'=> $config->serial_number,
            'ports_count'  => $config->ports_count,
            'version'      => $config->version,
            'config_text'  => $config->config_text,
            'target'       => $config->target ? ['id' => $config->target->id, 'name' => $config->target->name] : null,
            'created_by'   => $config->creator->name ?? null,
            'created_at'   => $config->created_at,
            'updated_at'   => $config->updated_at,
        ], 201);
    }

    public function newVersion(Request $request, SwitchConfig $switchConfig)
    {
        $data = $request->validate([
            'target_id'     => 'nullable|exists:targets,id',
            'hostname'      => 'required|string|max:255',
            'vendor'        => 'nullable|string|max:100',
            'model'         => 'nullable|string|max:100',
            'os_version'    => 'nullable|string|max:100',
            'serial_number' => 'nullable|string|max:100',
            'ports_count'   => 'nullable|integer|min:0|max:65535',
            'config_text'   => 'nullable|string',
        ]);

        $data['version'] = $switchConfig->version + 1;
        $data['created_by'] = Auth::id();

        $config = SwitchConfig::create($data);
        $config->load(['target:id,name', 'creator:id,name']);

        AuditLog::log('updated', 'switch_config', $config->id, $switchConfig->toArray(), $config->toArray());

        return response()->json([
            'id'           => $config->id,
            'hostname'     => $config->hostname,
            'vendor'       => $config->vendor,
            'model'        => $config->model,
            'os_version'   => $config->os_version,
            'serial_number'=> $config->serial_number,
            'ports_count'  => $config->ports_count,
            'version'      => $config->version,
            'config_text'  => $config->config_text,
            'target'       => $config->target ? ['id' => $config->target->id, 'name' => $config->target->name] : null,
            'created_by'   => $config->creator->name ?? null,
            'created_at'   => $config->created_at,
            'updated_at'   => $config->updated_at,
        ]);
    }

    public function destroy(SwitchConfig $switchConfig)
    {
        $data = $switchConfig->toArray();
        $switchConfig->delete();
        AuditLog::log('deleted', 'switch_config', $switchConfig->id, $data, null);
        return response()->json(['deleted' => true]);
    }

    public function exportPdf(SwitchConfig $switchConfig)
    {
        $switchConfig->load(['target:id,name,ip_address', 'creator:id,name']);

        $data = [
            'hostname'      => $switchConfig->hostname,
            'vendor'        => $switchConfig->vendor,
            'model'         => $switchConfig->model,
            'os_version'    => $switchConfig->os_version,
            'serial_number' => $switchConfig->serial_number,
            'ports_count'   => $switchConfig->ports_count,
            'version'       => $switchConfig->version,
            'config_text'   => $switchConfig->config_text,
            'target'        => $switchConfig->target,
            'created_by'    => $switchConfig->creator->name ?? '—',
            'created_at'    => $switchConfig->created_at,
        ];

        $filename = 'config-' . str_replace(['/', '\\', ' '], '_', $switchConfig->hostname) . '-v' . $switchConfig->version . '.pdf';

        ini_set('memory_limit', '256M');
        $pdf = Pdf::loadView('pdf.switch-config', compact('data'));
        $pdf->setPaper('a4', 'portrait');

        return $pdf->download($filename);
    }
}
