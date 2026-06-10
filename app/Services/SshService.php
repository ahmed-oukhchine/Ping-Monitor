<?php

namespace App\Services;

use Illuminate\Support\Facades\Log;
use phpseclib3\Net\SSH2;

class SshService
{
    public function exec(string $host, int $port, string $username, string $password, string $command): array
    {
        try {
            $ssh = new SSH2($host, $port, 10);

            if (!$ssh->login($username, $password)) {
                return ['success' => false, 'output' => 'SSH authentication failed'];
            }

            $output = $ssh->exec($command);
            $ssh->disconnect();

            return ['success' => true, 'output' => $output ?? ''];
        } catch (\Throwable $e) {
            Log::warning("SSH exec failed for {$host}:{$port} — {$e->getMessage()}");
            return ['success' => false, 'output' => 'Connection failed: ' . $e->getMessage()];
        }
    }
}
