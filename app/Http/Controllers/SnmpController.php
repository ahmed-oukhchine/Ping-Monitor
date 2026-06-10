<?php

namespace App\Http\Controllers;

use App\Models\Target;
use App\Models\NetworkInterface;
use App\Models\BandwidthHistory;
use App\Services\SnmpService;
use Illuminate\Http\Request;

class SnmpController extends Controller
{
    public function __construct(
        private SnmpService $snmp
    ) {}

    public function interfaces(Request $request, Target $target)
    {
        $ifaces = NetworkInterface::where('target_id', $target->id)
            ->orderBy('snmp_index')
            ->get();

        return response()->json($ifaces);
    }

    public function discover(Target $target)
    {
        $interfaces = $this->snmp->discoverInterfaces($target);
        if (empty($interfaces)) {
            return response()->json(['message' => 'No interfaces found or SNMP unreachable'], 422);
        }

        foreach ($interfaces as $data) {
            NetworkInterface::updateOrCreate(
                ['target_id' => $target->id, 'snmp_index' => $data['snmp_index']],
                $data
            );
        }

        $count = count($interfaces);
        return response()->json(['message' => "Discovered {$count} interfaces", 'count' => $count]);
    }

    public function poll(Target $target)
    {
        $results = $this->snmp->pollInterfaces($target);
        if (empty($results)) {
            return response()->json(['message' => 'No interfaces to poll'], 422);
        }

        $now = now();
        foreach ($results as $index => $data) {
            NetworkInterface::where('target_id', $target->id)
                ->where('snmp_index', $index)
                ->update([
                    'is_up'          => $data['is_up'],
                    'in_octets'      => $data['in_octets'],
                    'out_octets'     => $data['out_octets'],
                    'last_polled_at' => $now,
                ]);
        }

        $system = $this->snmp->pollSystem($target);
        $target->update(array_merge($system, ['system_polled_at' => $now]));

        $interfaces = NetworkInterface::where('target_id', $target->id)
            ->orderBy('snmp_index')->get();

        return response()->json([
            'interfaces' => $interfaces,
            'system'     => $system,
        ]);
    }

    public function system(Target $target)
    {
        $system = $this->snmp->pollSystem($target);
        $target->update(array_merge($system, ['system_polled_at' => now()]));

        return response()->json($system);
    }

    public function allInterfaces(Request $request)
    {
        $targetId = $request->input('target_id');
        $query = NetworkInterface::with('target');

        if ($targetId) {
            $query->where('target_id', $targetId);
        } else {
            $query->whereHas('target', fn($q) => $q->where('snmp_enabled', true));
        }

        return response()->json($query->orderBy('target_id')->orderBy('snmp_index')->get());
    }

    public function bandwidth(Request $request, Target $target)
    {
        $range = $request->input('range', '24h');
        $since = match ($range) {
            '7d'  => now()->subDays(7),
            '30d' => now()->subDays(30),
            default => now()->subHours(24),
        };

        $data = BandwidthHistory::whereHas('networkInterface', fn($q) => $q->where('target_id', $target->id))
            ->where('created_at', '>=', $since)
            ->orderBy('created_at')
            ->get(['network_interface_id', 'in_octets', 'out_octets', 'created_at']);

        return response()->json($data);
    }

    public function storage(Target $target)
    {
        $data = $this->snmp->getStorage($target);
        return response()->json($data);
    }
}
