<?php

namespace App\Console\Commands;

use App\Models\Target;
use App\Models\NetworkInterface;
use App\Services\SnmpService;
use Illuminate\Console\Command;

class SnmpPoll extends Command
{
    protected $signature = 'snmp:poll';
    protected $description = 'Poll SNMP interface stats for all targets';

    public function handle(SnmpService $snmp): void
    {
        $targets = Target::where('snmp_enabled', true)->get();

        if ($targets->isEmpty()) {
            return;
        }

        $now = now();

        foreach ($targets as $target) {
            $results = $snmp->pollInterfaces($target);
            if (empty($results)) continue;

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
        }
    }
}
