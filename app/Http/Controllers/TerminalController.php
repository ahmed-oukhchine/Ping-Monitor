<?php

namespace App\Http\Controllers;

use App\Services\SshService;
use App\Services\TelnetService;
use Illuminate\Http\Request;

class TerminalController extends Controller
{
    public function __construct(
        private SshService $ssh,
        private TelnetService $telnet,
    ) {}

    public function exec(Request $request)
    {
        $data = $request->validate([
            'protocol' => 'nullable|in:ssh,telnet',
            'host'     => 'required|string',
            'port'     => 'required|integer|min:1|max:65535',
            'username' => 'required|string',
            'password' => 'required|string',
            'command'  => 'required|string',
        ]);

        $protocol = $data['protocol'] ?? 'ssh';

        $service = $protocol === 'telnet' ? $this->telnet : $this->ssh;

        $result = $service->exec(
            $data['host'],
            (int) $data['port'],
            $data['username'],
            $data['password'],
            $data['command']
        );

        return response()->json($result);
    }
}
