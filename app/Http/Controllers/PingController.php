<?php

namespace App\Http\Controllers;

use App\Models\PingHistory;
use App\Models\Target;
use Illuminate\Http\Request;

class PingController extends Controller
{
    // ── API ──────────────────────────────────────────────────────────────────

    public function apiTargets()
    {
        $targets = Target::withCount([
            'pingHistories as total_pings',
            'pingHistories as failed_pings' => fn($q) => $q->where('is_success', false),
        ])
        ->withAvg('pingHistories as avg_response_time', 'response_time')
        ->with(['latestPing'])
        ->orderBy('created_at')
        ->get()
        ->map(function ($t) {
            $last = $t->latestPing;
            return [
                'id'                 => $t->id,
                'name'               => $t->name,
                'ip_address'         => $t->ip_address,
                'total_pings'        => $t->total_pings,
                'failed_pings'       => $t->failed_pings,
                'uptime_percent'     => $t->total_pings > 0
                    ? round(($t->total_pings - $t->failed_pings) / $t->total_pings * 100, 1)
                    : null,
                'avg_response_time'  => $t->avg_response_time !== null
                    ? round($t->avg_response_time, 2)
                    : null,
                'last_status'        => $last?->is_success,
                'last_response_time' => $last?->response_time,
                'last_ping_at'       => $last?->created_at,
            ];
        });

        return response()->json($targets);
    }

    public function apiHistory(Request $request)
    {
        $targets  = Target::orderBy('name')->get(['id', 'name']);
        $targetId = $request->input('target_id');

        $histories = PingHistory::with('target:id,name,ip_address')
            ->when($targetId, fn($q) => $q->where('target_id', $targetId))
            ->orderBy('created_at', 'desc')
            ->paginate(50)
            ->withQueryString();

        return response()->json([
            'data'    => $histories->items(),
            'meta'    => [
                'current_page' => $histories->currentPage(),
                'last_page'    => $histories->lastPage(),
                'total'        => $histories->total(),
            ],
            'targets' => $targets,
        ]);
    }

    public function apiChartData(Target $target)
    {
        $data = PingHistory::where('target_id', $target->id)
            ->orderBy('created_at', 'desc')
            ->limit(60)
            ->get(['is_success', 'response_time', 'created_at'])
            ->reverse()
            ->values();

        return response()->json($data);
    }

    // ── CRUD ─────────────────────────────────────────────────────────────────

    public function store(Request $request)
    {
        $request->validate([
            'name'       => 'required|string|max:100',
            'ip_address' => 'required|string|max:100',
        ]);

        $target = Target::create($request->only('name', 'ip_address'));

        return response()->json($target, 201);
    }

    public function update(Request $request, Target $target)
    {
        $request->validate([
            'name'       => 'required|string|max:100',
            'ip_address' => 'required|string|max:100',
        ]);

        $target->update($request->only('name', 'ip_address'));

        return response()->json($target);
    }

    public function destroy(Target $target)
    {
        $target->delete();

        return response()->json(['deleted' => true]);
    }

    // ── Ping ─────────────────────────────────────────────────────────────────

    public function ping(Target $target)
    {
        $result = $this->performPing($target->ip_address);

        PingHistory::create([
            'target_id'     => $target->id,
            'is_success'    => $result['success'],
            'response_time' => $result['response_time'] ?? null,
            'error_message' => $result['error'] ?? '',
        ]);

        $result['loss_percent'] = $this->lossPercent($target->id);

        return response()->json($result);
    }

    public function pingAll()
    {
        $targets = Target::all();
        $results = [];

        foreach ($targets as $target) {
            $result = $this->performPing($target->ip_address);
            $result['target_id']   = $target->id;
            $result['target_name'] = $target->name;

            PingHistory::create([
                'target_id'     => $target->id,
                'is_success'    => $result['success'],
                'response_time' => $result['response_time'] ?? null,
                'error_message' => $result['error'] ?? '',
            ]);

            $result['loss_percent'] = $this->lossPercent($target->id);
            $results[] = $result;
        }

        return response()->json(['results' => $results]);
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private function lossPercent(int $targetId): int
    {
        $total = PingHistory::where('target_id', $targetId)->count();
        if ($total === 0) return 0;
        $failed = PingHistory::where('target_id', $targetId)->where('is_success', false)->count();
        return (int) round($failed / $total * 100);
    }

    private function performPing(string $ipAddress): array
    {
        $ip = gethostbyname($ipAddress);
        if ($ip === $ipAddress && !filter_var($ip, FILTER_VALIDATE_IP)) {
            return ['success' => false, 'error' => 'Cannot resolve hostname', 'message' => 'Offline'];
        }

        $socket = function_exists('socket_create') ? @socket_create(AF_INET, SOCK_RAW, 1) : false;
        if ($socket) {
            $result = $this->pingViaSocket($socket, $ip);
            if ($result !== null) {
                return $result;
            }
        }

        return $this->pingViaCommand($ipAddress);
    }

    private function pingViaSocket($socket, string $ip): ?array
    {
        socket_set_option($socket, SOL_SOCKET, SO_RCVTIMEO, ['sec' => 2, 'usec' => 0]);
        socket_set_option($socket, SOL_SOCKET, SO_SNDTIMEO, ['sec' => 2, 'usec' => 0]);

        $identifier = rand(1, 0xFFFF);
        $sequence   = 1;
        $payload    = 'PingMonitor1234567890';

        $packet   = pack('CCnnn', 8, 0, 0, $identifier, $sequence) . $payload;
        $checksum = $this->icmpChecksum($packet);
        $packet   = pack('CCnnn', 8, 0, $checksum, $identifier, $sequence) . $payload;

        $start = microtime(true);

        if (!@socket_sendto($socket, $packet, strlen($packet), 0, $ip, 0)) {
            socket_close($socket);
            return null;
        }

        $deadline = $start + 2.0;

        while (microtime(true) < $deadline) {
            $response = '';
            $from     = '';
            $port     = 0;
            $received = @socket_recvfrom($socket, $response, 1024, 0, $from, $port);

            if ($received === false) {
                socket_close($socket);
                return null;
            }

            $ihl = (ord($response[0]) & 0x0F) * 4;
            if (strlen($response) < $ihl + 8) continue;

            $icmp    = substr($response, $ihl);
            $type    = ord($icmp[0]);
            $replyId = unpack('n', substr($icmp, 4, 2))[1];

            if ($type === 0 && $replyId === $identifier) {
                $elapsed = round((microtime(true) - $start) * 1000, 2);
                socket_close($socket);
                return ['success' => true, 'response_time' => $elapsed, 'message' => 'Online'];
            }

            if ($type === 3) {
                socket_close($socket);
                return ['success' => false, 'error' => 'Destination unreachable', 'message' => 'Offline'];
            }
        }

        socket_close($socket);
        return null;
    }

    private function pingViaCommand(string $ipAddress): array
    {
        $isWindows = strtolower(PHP_OS_FAMILY) === 'windows';

        if ($isWindows) {
            $commands = [
                ['ping', '-n', '1', '-w', '3000', $ipAddress],
            ];
        } else {
            $bin = file_exists('/bin/ping')     ? '/bin/ping'
                 : (file_exists('/usr/bin/ping') ? '/usr/bin/ping'
                 : (file_exists('/usr/sbin/ping')? '/usr/sbin/ping' : 'ping'));

            $commands = [
                [$bin, '-c', '1', '-W', '3', $ipAddress],           // normal
                ['sudo', '-n', $bin, '-c', '1', '-W', '3', $ipAddress], // sudo (if sudoers allows)
            ];
        }

        foreach ($commands as $command) {
            $result = $this->runPingCommand($command);
            if ($result !== null) return $result;
        }

        // Last resort: TCP port check (no root needed, works for servers/routers with open ports)
        return $this->pingViaTcp($ipAddress)
            ?? ['success' => false, 'error' => 'Host unreachable', 'message' => 'Offline'];
    }

    private function runPingCommand(array $command): ?array
    {
        $process = @proc_open(
            $command,
            [1 => ['pipe', 'w'], 2 => ['pipe', 'w']],
            $pipes
        );

        if (!is_resource($process)) return null;

        stream_set_timeout($pipes[1], 5);
        $stdout = stream_get_contents($pipes[1]);
        $stderr = stream_get_contents($pipes[2]);
        fclose($pipes[1]);
        fclose($pipes[2]);
        $exitCode = proc_close($process);

        // Permission error → tell the caller to try the next command
        if (str_contains($stderr, 'Operation not permitted')
            || str_contains($stderr, 'Lacking privilege')
            || str_contains($stderr, 'permission denied')
            || str_contains($stderr, 'SUID')) {
            return null;
        }

        if ($exitCode === 0 && preg_match('/TTL=/i', $stdout)) {
            return ['success' => true, 'response_time' => $this->parseResponseTime($stdout), 'message' => 'Online'];
        }

        // Command ran but host did not reply — definitive offline (don't try next command)
        if (str_contains($stdout, 'bytes of data') || str_contains($stdout, 'statistics')
            || str_contains($stdout, 'Pinging') || str_contains($stdout, 'PING')) {
            return ['success' => false, 'error' => 'Host unreachable', 'message' => 'Offline'];
        }

        return null; // inconclusive — try next command
    }

    private function pingViaTcp(string $host): ?array
    {
        // Common ports: SSH, HTTP, HTTPS, Telnet, SNMP, RDP, SMB
        foreach ([22, 80, 443, 23, 3389, 445] as $port) {
            $start = microtime(true);
            $conn  = @fsockopen($host, $port, $errno, $errstr, 2);
            if ($conn) {
                $elapsed = round((microtime(true) - $start) * 1000, 2);
                fclose($conn);
                return ['success' => true, 'response_time' => $elapsed, 'message' => 'Online'];
            }
        }
        return null; // no TCP ports responded — cannot determine status
    }

    private function parseResponseTime(string $output): ?float
    {
        if (preg_match('/[Tt]ime[<=](\d+(?:\.\d+)?)ms/', $output, $m)) {
            return (float) $m[1];
        }
        if (preg_match('/time=(\d+(?:\.\d+)?)\s*ms/i', $output, $m)) {
            return (float) $m[1];
        }
        return null;
    }

    private function icmpChecksum(string $data): int
    {
        if (strlen($data) % 2 !== 0) {
            $data .= "\x00";
        }
        $sum = 0;
        for ($i = 0; $i < strlen($data); $i += 2) {
            $sum += (ord($data[$i]) << 8) + ord($data[$i + 1]);
        }
        while ($sum >> 16) {
            $sum = ($sum & 0xFFFF) + ($sum >> 16);
        }
        return ~$sum & 0xFFFF;
    }
}
