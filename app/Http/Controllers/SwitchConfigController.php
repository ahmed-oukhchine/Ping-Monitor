<?php

namespace App\Http\Controllers;

use App\Models\SwitchConfig;
use App\Models\AuditLog;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

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
                'ssh_host'     => $c->ssh_host,
                'ssh_port'     => $c->ssh_port,
                'ssh_username' => $c->ssh_username,
                'ssh_password' => $c->ssh_password,
                'ssh_protocol' => $c->ssh_protocol ?? 'ssh',
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
            'ssh_host'     => $switchConfig->ssh_host,
            'ssh_port'     => $switchConfig->ssh_port,
            'ssh_username' => $switchConfig->ssh_username,
            'ssh_password' => $switchConfig->ssh_password,
            'ssh_protocol' => $switchConfig->ssh_protocol ?? 'ssh',
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
            'ssh_host'      => 'nullable|string|max:255',
            'ssh_port'      => 'nullable|integer|min:1|max:65535',
            'ssh_username'  => 'nullable|string|max:255',
            'ssh_password'  => 'nullable|string|max:255',
            'ssh_protocol'  => 'nullable|string|in:ssh,telnet',
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
            'ssh_host'     => $config->ssh_host,
            'ssh_port'     => $config->ssh_port,
            'ssh_username' => $config->ssh_username,
            'ssh_password' => $config->ssh_password,
            'ssh_protocol' => $config->ssh_protocol ?? 'ssh',
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
            'ssh_host'      => 'nullable|string|max:255',
            'ssh_port'      => 'nullable|integer|min:1|max:65535',
            'ssh_username'  => 'nullable|string|max:255',
            'ssh_password'  => 'nullable|string|max:255',
            'ssh_protocol'  => 'nullable|string|in:ssh,telnet',
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
            'ssh_host'     => $config->ssh_host,
            'ssh_port'     => $config->ssh_port,
            'ssh_username' => $config->ssh_username,
            'ssh_password' => $config->ssh_password,
            'ssh_protocol' => $config->ssh_protocol ?? 'ssh',
            'created_at'   => $config->created_at,
            'updated_at'   => $config->updated_at,
        ]);
    }

    public function destroy(Request $request, SwitchConfig $switchConfig)
    {
        $request->validate([
            'admin_password' => 'required|string',
        ]);

        $admin = Auth::user();
        if (!Hash::check($request->admin_password, $admin->password)) {
            throw ValidationException::withMessages([
                'admin_password' => ['Your password is incorrect.'],
            ]);
        }

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

        ini_set('memory_limit', '512M');
        $pdf = Pdf::loadView('pdf.switch-config', compact('data'));
        $pdf->setPaper('a4', 'portrait');

        return $pdf->download($filename);
    }
}
