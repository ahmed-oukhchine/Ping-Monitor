<?php

namespace App\Http\Controllers;

use App\Models\PingHistory;
use App\Models\Target;
use Illuminate\Http\Request;

class PingController extends Controller
{
    public function index()
    {
        $targets = Target::withCount([
            'pingHistories as total_pings',
            'pingHistories as failed_pings' => fn($q) => $q->where('is_success', false),
        ])->orderBy('created_at')->get();

        return view('home', compact('targets'));
    }

    public function history(Request $request)
    {
        $targets   = Target::orderBy('name')->get();
        $targetId  = $request->input('target_id');

        $histories = PingHistory::with('target')
            ->when($targetId, fn($q) => $q->where('target_id', $targetId))
            ->orderBy('created_at', 'desc')
            ->paginate(50)
            ->withQueryString();

        return view('history', compact('histories', 'targets', 'targetId'));
    }

    public function store(Request $request)
    {
        $request->validate([
            'name'       => 'required|string|max:100',
            'ip_address' => 'required|string|max:100',
        ]);

        Target::create($request->only('name', 'ip_address'));

        return redirect()->route('home');
    }

    public function update(Request $request, Target $target)
    {
        $request->validate([
            'name'       => 'required|string|max:100',
            'ip_address' => 'required|string|max:100',
        ]);

        $target->update($request->only('name', 'ip_address'));

        return redirect()->route('home');
    }

    public function destroy(Target $target)
    {
        $target->delete();
        return redirect()->route('home');
    }

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

    private function lossPercent(int $targetId): int
    {
        $total  = PingHistory::where('target_id', $targetId)->count();
        if ($total === 0) return 0;
        $failed = PingHistory::where('target_id', $targetId)->where('is_success', false)->count();
        return (int) round($failed / $total * 100);
    }

    private function performPing(string $ipAddress): array
    {
        // Resolve hostname → IP
        $ip = gethostbyname($ipAddress);
        if ($ip === $ipAddress && !filter_var($ip, FILTER_VALIDATE_IP)) {
            return ['success' => false, 'error' => 'Cannot resolve hostname', 'message' => 'Offline'];
        }

        // Try raw ICMP socket (needs admin on Windows)
        $socket = @socket_create(AF_INET, SOCK_RAW, 1);
        if ($socket) {
            $result = $this->pingViaSocket($socket, $ip);
            // Only trust the socket result if it definitively answered
            if ($result !== null) {
                return $result;
            }
        }

        // Fallback: system ping command + TTL check
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
            return null; // send failed → fall through to command
        }

        // Read replies in a short loop; skip unrelated ICMP packets
        $deadline = $start + 2.0;

        while (microtime(true) < $deadline) {
            $response = '';
            $from     = '';
            $port     = 0;
            $received = @socket_recvfrom($socket, $response, 1024, 0, $from, $port);

            if ($received === false) {
                // recvfrom timed out — inconclusive, let the command decide
                socket_close($socket);
                return null;
            }

            $ihl = (ord($response[0]) & 0x0F) * 4;
            if (strlen($response) < $ihl + 8) continue;

            $icmp    = substr($response, $ihl); // skip IP header (variable length on Linux)
            $type    = ord($icmp[0]);
            $replyId = unpack('n', substr($icmp, 4, 2))[1];

            if ($type === 0 && $replyId === $identifier) {
                // Confirmed echo reply from our packet
                $elapsed = round((microtime(true) - $start) * 1000, 2);
                socket_close($socket);
                return ['success' => true, 'response_time' => $elapsed, 'message' => 'Online'];
            }

            if ($type === 3) {
                // ICMP Destination Unreachable — definitively offline
                socket_close($socket);
                return ['success' => false, 'error' => 'Destination unreachable', 'message' => 'Offline'];
            }
            // Other ICMP type (redirect, TTL exceeded, etc.) → skip, keep waiting
        }

        socket_close($socket);
        return null; // deadline passed with no conclusive answer → fall through
    }

    private function pingViaCommand(string $ipAddress): array
    {
        $isWindows = strtolower(PHP_OS_FAMILY) === 'windows';
        $command   = $isWindows
            ? ['ping', '-n', '1', '-w', '3000', $ipAddress]
            : ['ping', '-c', '1', '-W', '3',    $ipAddress];

        $process = @proc_open(
            implode(' ', array_map('escapeshellarg', $command)),
            [1 => ['pipe', 'w'], 2 => ['pipe', 'w']],
            $pipes
        );

        if (!is_resource($process)) {
            return ['success' => false, 'error' => 'Could not run ping command', 'message' => 'Offline'];
        }

        stream_set_timeout($pipes[1], 5);
        $stdout   = stream_get_contents($pipes[1]);
        fclose($pipes[1]);
        fclose($pipes[2]);
        $exitCode = proc_close($process);

        // TTL= only appears when the target itself replies (not a router "unreachable")
        if ($exitCode === 0 && preg_match('/TTL=/i', $stdout)) {
            $responseTime = $this->parseResponseTime($stdout);
            return ['success' => true, 'response_time' => $responseTime, 'message' => 'Online'];
        }

        return ['success' => false, 'error' => 'Host unreachable', 'message' => 'Offline'];
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
