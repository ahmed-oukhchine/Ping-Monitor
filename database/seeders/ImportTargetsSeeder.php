<?php

namespace Database\Seeders;

use App\Models\Target;
use Illuminate\Database\Seeder;

class ImportTargetsSeeder extends Seeder
{
    public function run(): void
    {
        $targets = [
            ['name' => 'Switch_1', 'ip_address' => '10.61.2.1'],
            ['name' => 'Switch_2', 'ip_address' => '10.61.2.2'],
            ['name' => 'Switch_3', 'ip_address' => '10.61.2.3'],
            ['name' => 'Switch_4', 'ip_address' => '10.61.2.4'],
            ['name' => 'Switch_5', 'ip_address' => '10.61.2.5'],
            ['name' => 'Switch_6', 'ip_address' => '10.61.2.6'],
            ['name' => 'Switch_7', 'ip_address' => '10.61.2.7'],
            ['name' => 'Switch_8', 'ip_address' => '10.61.50.129'],
            ['name' => 'Switch_9', 'ip_address' => '10.61.50.130'],
            ['name' => 'Switch_10', 'ip_address' => '10.61.50.131'],
            ['name' => 'Switch_11', 'ip_address' => '10.61.50.132'],
            ['name' => 'Switch_12', 'ip_address' => '10.61.50.137'],
            ['name' => 'Switch_13', 'ip_address' => '10.61.50.138'],
            ['name' => 'Switch_14', 'ip_address' => '10.61.50.139'],
            ['name' => 'server_ADDC', 'ip_address' => '10.61.6.10'],
            ['name' => 'server_WSUS', 'ip_address' => '10.61.6.12'],
            ['name' => 'server_BEC', 'ip_address' => '10.61.6.18'],
            ['name' => 'server_ADDC_backup', 'ip_address' => '10.61.6.20'],
            ['name' => 'server_RSU', 'ip_address' => '10.61.6.28'],
            ['name' => 'server_Messagrie', 'ip_address' => '10.61.6.30'],
            ['name' => 'server_BD', 'ip_address' => '10.61.6.40'],
            ['name' => 'server_KSC', 'ip_address' => '10.61.6.50'],
            ['name' => 'server_Proxy_server', 'ip_address' => '10.61.6.102'],
        ];

        foreach ($targets as $t) {
            Target::firstOrCreate(
                ['name' => $t['name']],
                ['ip_address' => $t['ip_address']]
            );
        }

        $this->command->info('Imported ' . count($targets) . ' targets from Django app.');
    }
}
