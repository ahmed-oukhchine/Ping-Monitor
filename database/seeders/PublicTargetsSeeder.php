<?php

namespace Database\Seeders;

use App\Models\Target;
use App\Models\Group;
use Illuminate\Database\Seeder;

class PublicTargetsSeeder extends Seeder
{
    public function run(): void
    {
        $group = Group::firstOrCreate(['name' => 'Internet', 'color' => '#3b82f6']);

        $targets = [
            ['name' => 'Google DNS',       'ip_address' => '8.8.8.8',      'location' => 'Google Public DNS'],
            ['name' => 'Cloudflare DNS',   'ip_address' => '1.1.1.1',      'location' => 'Cloudflare DNS'],
            ['name' => 'Google',           'ip_address' => '142.250.75.78', 'location' => 'Google Search'],
            ['name' => 'OpenDNS',          'ip_address' => '208.67.222.222','location' => 'Cisco OpenDNS'],
        ];

        foreach ($targets as $t) {
            $target = Target::create($t + ['warn_ms' => 100, 'critical_ms' => 300]);
            $target->groups()->attach($group->id);
            $this->command->info("Created: {$target->name} ({$target->ip_address})");
        }
    }
}
