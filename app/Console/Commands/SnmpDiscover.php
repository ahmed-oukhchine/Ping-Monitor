<?php

namespace App\Console\Commands;

use App\Models\Target;
use App\Models\NetworkInterface;
use App\Services\SnmpService;
use Illuminate\Console\Command;

class SnmpDiscover extends Command
{
    protected $signature = 'snmp:discover {target? : Specific target ID}';
    protected $description = 'Discover SNMP interfaces for targets';

    public function handle(SnmpService $snmp): void
    {
        $query = Target::where('snmp_enabled', true);
        if ($id = $this->argument('target')) {
            $query->where('id', $id);
        }
        $targets = $query->get();

        if ($targets->isEmpty()) {
            $this->warn('No SNMP-enabled targets found.');
            return;
        }

        foreach ($targets as $target) {
            $this->line("Discovering {$target->ip_address} ({$target->name})...");

            $interfaces = $snmp->discoverInterfaces($target);
            if (empty($interfaces)) {
                $this->warn("  No interfaces found (SNMP may be unreachable).");
                continue;
            }

            foreach ($interfaces as $data) {
                NetworkInterface::updateOrCreate(
                    ['target_id' => $target->id, 'snmp_index' => $data['snmp_index']],
                    $data
                );
            }
            $this->info("  Discovered ".count($interfaces)." interfaces.");
        }

        $this->info('Discovery complete.');
    }
}
