<?php

namespace App\Http\Controllers;

use App\Models\AuditLog;
use App\Models\Target;
use Illuminate\Http\Request;

class DiscoveryController extends Controller
{
    public function discover(Request $request)
    {
        $data = $request->validate([
            'subnet' => 'required|string',
        ]);

        $ips = $this->cidrToIps($data['subnet']);

        if (count($ips) === 0) {
            return response()->json(['message' => 'Invalid subnet'], 422);
        }

        if (count($ips) > 4096) {
            return response()->json(['message' => 'Subnet too large (max /20)'], 422);
        }

        $existingIps = Target::whereIn('ip_address', $ips)->pluck('ip_address')->flip();

        $results = $this->pingHosts($ips);

        AuditLog::log('discovery_scan', 'discovery', null, null, [
            'subnet'  => $data['subnet'],
            'found'   => count(array_filter($results, fn($r) => $r['alive'])),
            'total'   => count($results),
        ]);

        return response()->json([
            'subnet'   => $data['subnet'],
            'scanned'  => count($results),
            'hosts'    => array_map(fn($r) => [
                'ip'         => $r['ip'],
                'alive'      => $r['alive'],
                'time_ms'    => $r['time'],
                'hostname'   => $r['hostname'],
                'exists'     => $existingIps->has($r['ip']),
            ], $results),
        ]);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'hosts'           => 'required|array|min:1|max:100',
            'hosts.*.ip'      => 'required|ip',
            'hosts.*.name'    => 'nullable|string|max:100',
        ]);

        $created = [];
        $skipped = [];

        foreach ($data['hosts'] as $host) {
            if (Target::where('ip_address', $host['ip'])->exists()) {
                $skipped[] = $host['ip'];
                continue;
            }

            $target = Target::create([
                'name'       => $host['name'] ?? $host['ip'],
                'ip_address' => $host['ip'],
            ]);

            $created[] = $target;
        }

        AuditLog::log('discovery_add', 'discovery', null, null, [
            'created' => count($created),
            'skipped' => count($skipped),
        ]);

        return response()->json([
            'created' => $created,
            'skipped' => $skipped,
        ], 201);
    }

    private function cidrToIps($cidr)
    {
        $parts = explode('/', $cidr);
        $ip = $parts[0];
        $prefix = isset($parts[1]) ? (int)$parts[1] : 32;

        $ipLong = ip2long($ip);
        if ($ipLong === false) {
            return [];
        }

        $mask = -1 << (32 - $prefix);
        $start = $ipLong & $mask;
        $end = $start | (~$mask & 0xFFFFFFFF);

        if ($prefix < 31) {
            $start++;
            $end--;
        }

        $ips = [];
        for ($i = $start; $i <= $end; $i++) {
            $ips[] = long2ip($i);
        }
        return $ips;
    }

    private function pingHosts(array $ips, $timeout = 1)
    {
        $isWin = strncasecmp(PHP_OS, 'WIN', 3) === 0;
        $processes = [];
        $pipes = [];

        $pingCmd = $isWin
            ? 'ping -n 1 -w ' . ($timeout * 1000) . ' '
            : 'ping -c 1 -W ' . $timeout . ' ';

        foreach ($ips as $ip) {
            $cmd = $pingCmd . escapeshellarg($ip);
            $desc = [['pipe', 'r'], ['pipe', 'w'], ['pipe', 'w']];
            $processes[$ip] = proc_open($cmd, $desc, $pipes[$ip]);
            if ($processes[$ip]) {
                stream_set_blocking($pipes[$ip][1], 0);
            }
        }

        $results = [];
        $remaining = array_flip($ips);
        $start = microtime(true);
        $maxWait = $timeout + 1;

        while (count($remaining) > 0 && (microtime(true) - $start) < $maxWait) {
            foreach ($remaining as $ip => $i) {
                if (!isset($processes[$ip]) || !$processes[$ip]) {
                    unset($remaining[$ip]);
                    continue;
                }

                $status = @proc_get_status($processes[$ip]);
                if ($status === false || !$status['running']) {
                    $output = '';
                    if (isset($pipes[$ip])) {
                        $output = stream_get_contents($pipes[$ip][1]);
                        foreach ($pipes[$ip] as $p) fclose($p);
                    }
                    @proc_close($processes[$ip]);

                    $alive = $status && $status['exitcode'] === 0;
                    $time = null;
                    if ($alive && preg_match('/time[=<]\s*(\d+\.?\d*)\s*ms/i', $output, $m)) {
                        $time = (float) $m[1];
                    }

                    $results[] = [
                        'ip'       => $ip,
                        'alive'    => $alive,
                        'time'     => $time,
                        'hostname' => $alive ? @gethostbyaddr($ip) : null,
                    ];
                    unset($remaining[$ip]);
                }
            }
            usleep(50000);
        }

        foreach ($remaining as $ip => $i) {
            if (isset($processes[$ip])) {
                if (isset($pipes[$ip])) {
                    foreach ($pipes[$ip] as $p) fclose($p);
                }
                @proc_close($processes[$ip]);
            }
            $results[] = ['ip' => $ip, 'alive' => false, 'time' => null, 'hostname' => null];
        }

        usort($results, fn($a, $b) => strcmp($a['ip'], $b['ip']));
        return $results;
    }
}
