<?php

namespace App\Services;

use Illuminate\Support\Facades\Log;

class TelnetService
{
    const TELNET_IAC  = 255;
    const TELNET_DONT = 254;
    const TELNET_DO   = 253;
    const TELNET_WONT = 252;
    const TELNET_WILL = 251;
    const TELNET_ECHO = 1;

    private $socket = null;

    public function exec(string $host, int $port, string $username, string $password, string $command): array
    {
        try {
            $this->connect($host, $port, 10);
            $this->negotiate();
            $this->login($username, $password);
            $output = $this->sendCommand($command);
            $this->disconnect();

            return ['success' => true, 'output' => $output];
        } catch (\Throwable $e) {
            $this->disconnect();
            Log::warning("Telnet exec failed for {$host}:{$port} — {$e->getMessage()}");
            return ['success' => false, 'output' => 'Connection failed: ' . $e->getMessage()];
        }
    }

    private function connect(string $host, int $port, int $timeout): void
    {
        $this->socket = @stream_socket_client("tcp://{$host}:{$port}", $errno, $errstr, $timeout);

        if (!$this->socket) {
            throw new \RuntimeException("Cannot connect to {$host}:{$port} — {$errstr}");
        }

        stream_set_timeout($this->socket, $timeout);
    }

    private function negotiate(): void
    {
        $this->readUntil('', 2);
    }

    private function readUntil(string $expect, int $timeout = 5): string
    {
        if (!$this->socket) return '';

        $buffer = '';
        $start = time();

        while (true) {
            if ((time() - $start) > $timeout) break;

            $char = fgetc($this->socket);
            if ($char === false) break;

            $byte = ord($char);

            if ($byte === self::TELNET_IAC) {
                $cmd = ord(fgetc($this->socket));
                if ($cmd === self::TELNET_IAC) {
                    $buffer .= $char;
                    continue;
                }
                $opt = ord(fgetc($this->socket));
                if ($cmd === self::TELNET_DO || $cmd === self::TELNET_DONT) {
                    fwrite($this->socket, chr(self::TELNET_IAC) . chr(self::TELNET_WONT) . chr($opt));
                } elseif ($cmd === self::TELNET_WILL || $cmd === self::TELNET_WONT) {
                    fwrite($this->socket, chr(self::TELNET_IAC) . chr(self::TELNET_DONT) . chr($opt));
                }
                continue;
            }

            $buffer .= $char;

            if ($expect !== '' && str_contains($buffer, $expect)) break;
        }

        return $buffer;
    }

    private function login(string $username, string $password): void
    {
        $resp = $this->readUntil(':', 5);
        fwrite($this->socket, $username . "\r\n");
        $resp = $this->readUntil(':', 5);
        fwrite($this->socket, $password . "\r\n");
        $resp = $this->readUntil('#', 3);
    }

    private function sendCommand(string $command): string
    {
        fwrite($this->socket, $command . "\r\n");
        usleep(300000);
        return $this->readUntil('#', 5);
    }

    private function disconnect(): void
    {
        if ($this->socket) {
            try { fclose($this->socket); } catch (\Throwable $e) {}
            $this->socket = null;
        }
    }
}
