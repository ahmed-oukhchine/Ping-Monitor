<?php

namespace App\Services;

use App\Models\PingHistory;
use App\Models\Target;

class PingService
{
    public function performPing(string $ipAddress): array
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

    public function recordPing(int $targetId, array $result): void
    {
        PingHistory::create([
            'target_id'     => $targetId,
            'is_success'    => $result['success'],
            'response_time' => $result['response_time'] ?? null,
            'error_message' => $result['error'] ?? '',
        ]);
    }

    public function lossPercent(int $targetId): int
    {
        $total = PingHistory::where('target_id', $targetId)->count();
        if ($total === 0) return 0;
        $failed = PingHistory::where('target_id', $targetId)->where('is_success', false)->count();
        return (int) round($failed / $total * 100);
    }

    public function thresholdStatus(Target $target, ?float $responseTime): ?string
    {
        if ($responseTime === null) return null;
        if ($target->critical_ms && $responseTime >= $target->critical_ms) return 'critical';
        if ($target->warn_ms     && $responseTime >= $target->warn_ms)     return 'warn';
        return 'ok';
    }

    private function pingViaSocket($socket, string $ip): ?array
    {
        socket_set_option($socket, SOL_SOCKET, SO_RCVTIMEO, ['sec' => 2, 'usec' => 0]);
        socket_set_option($socket, SOL_SOCKET, SO_SNDTIMEO, ['sec' => 2, 'usec' => 0]);

        $identifier = rand(1, 0xFFFF);
        $sequence   = 1;
        $payload    = 'SIREN1234567890';

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

            if (strlen($response) === 0) continue;
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
                [$bin, '-c', '1', '-W', '3', $ipAddress],
                ['sudo', '-n', $bin, '-c', '1', '-W', '3', $ipAddress],
            ];
        }

        foreach ($commands as $command) {
            $result = $this->runPingCommand($command);
            if ($result !== null) return $result;
        }

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

        if (str_contains($stderr, 'Operation not permitted')
            || str_contains($stderr, 'Lacking privilege')
            || str_contains($stderr, 'permission denied')
            || str_contains($stderr, 'SUID')) {
            return null;
        }

        if ($exitCode === 0 && preg_match('/TTL=/i', $stdout)) {
            return ['success' => true, 'response_time' => $this->parseResponseTime($stdout), 'message' => 'Online'];
        }

        if (str_contains($stdout, 'bytes of data') || str_contains($stdout, 'statistics')
            || str_contains($stdout, 'Pinging') || str_contains($stdout, 'PING')) {
            return ['success' => false, 'error' => 'Host unreachable', 'message' => 'Offline'];
        }

        return null;
    }

    private function pingViaTcp(string $host): ?array
    {
        foreach ([22, 80, 443, 23, 3389, 445] as $port) {
            $start = microtime(true);
            $conn  = @fsockopen($host, $port, $errno, $errstr, 2);
            if ($conn) {
                $elapsed = round((microtime(true) - $start) * 1000, 2);
                fclose($conn);
                return ['success' => true, 'response_time' => $elapsed, 'message' => 'Online'];
            }
        }
        return null;
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
