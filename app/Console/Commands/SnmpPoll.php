<?php

namespace App\Console\Commands;

use App\Models\Target;
use App\Models\NetworkInterface;
use App\Models\BandwidthHistory;
use App\Services\SnmpService;
use Illuminate\Console\Command;

class SnmpPoll extends Command
{
    protected $signature = 'snmp:poll';
    protected $description = 'Poll SNMP interface stats and store bandwidth history';

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
                $iface = NetworkInterface::where('target_id', $target->id)
                    ->where('snmp_index', $index)
                    ->first();
                if (!$iface) continue;

                $iface->update([
                    'is_up'          => $data['is_up'],
                    'in_octets'      => $data['in_octets'],
                    'out_octets'     => $data['out_octets'],
                    'last_polled_at' => $now,
                ]);

                BandwidthHistory::create([
                    'network_interface_id' => $iface->id,
                    'in_octets'            => $data['in_octets'],
                    'out_octets'           => $data['out_octets'],
                    'created_at'           => $now,
                ]);
            }
        }
    }
}
