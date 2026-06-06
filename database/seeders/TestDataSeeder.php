<?php

namespace Database\Seeders;

use App\Models\User;
use App\Models\Target;
use App\Models\Group;
use App\Models\PingHistory;
use App\Models\Vlan;
use App\Models\SwitchConfig;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class TestDataSeeder extends Seeder
{
    public function run(): void
    {
        // Créer des groupes
        $group1 = Group::create(['name' => 'Serveurs', 'color' => '#ef4444']);
        $group2 = Group::create(['name' => 'Réseau', 'color' => '#3b82f6']);
        $group3 = Group::create(['name' => 'WiFi', 'color' => '#10b981']);

        // Créer des équipements
        $targets = [];
        $data = [
            ['name' => 'Routeur Principal', 'ip_address' => '192.168.1.1', 'location' => 'Salle Serveur'],
            ['name' => 'Switch Cœur', 'ip_address' => '192.168.1.2', 'location' => 'Salle Serveur'],
            ['name' => 'Switch Distribution 1', 'ip_address' => '192.168.1.10', 'location' => 'Étage 1'],
            ['name' => 'Switch Distribution 2', 'ip_address' => '192.168.1.11', 'location' => 'Étage 2'],
            ['name' => 'Serveur DNS', 'ip_address' => '192.168.1.20', 'location' => 'Salle Serveur'],
            ['name' => 'Serveur DHCP', 'ip_address' => '192.168.1.21', 'location' => 'Salle Serveur'],
            ['name' => 'Serveur Messagerie', 'ip_address' => '192.168.1.22', 'location' => 'Salle Serveur'],
            ['name' => 'Born WiFi Accueil', 'ip_address' => '192.168.2.10', 'location' => 'Accueil'],
            ['name' => 'Passerelle VPN', 'ip_address' => '10.0.0.1', 'location' => 'Salle Serveur'],
            ['name' => 'Pare-feu', 'ip_address' => '192.168.1.254', 'location' => 'Salle Serveur'],
        ];

        foreach ($data as $item) {
            $target = Target::create([
                'name' => $item['name'],
                'ip_address' => $item['ip_address'],
                'location' => $item['location'],
                'is_paused' => false,
            ]);
            $targets[] = $target;
        }

        // Associer les équipements aux groupes
        $targets[0]->groups()->attach($group2->id); // Routeur -> Réseau
        $targets[1]->groups()->attach($group2->id); // Switch Cœur -> Réseau
        $targets[2]->groups()->attach($group2->id); // Switch Dist 1 -> Réseau
        $targets[3]->groups()->attach($group2->id); // Switch Dist 2 -> Réseau
        $targets[4]->groups()->attach($group1->id); // DNS -> Serveurs
        $targets[5]->groups()->attach($group1->id); // DHCP -> Serveurs
        $targets[6]->groups()->attach($group1->id); // Messagerie -> Serveurs
        $targets[7]->groups()->attach($group3->id); // WiFi -> WiFi
        $targets[8]->groups()->attach($group2->id); // VPN -> Réseau
        $targets[9]->groups()->attach($group2->id); // Pare-feu -> Réseau

        // Générer 24h d'historique de ping (1 entrée toutes les 10 min = 144/h)
        foreach ($targets as $target) {
            for ($i = 0; $i < 144; $i++) {
                $isSuccess = fake()->boolean(85);
                $history = new PingHistory();
                $history->target_id = $target->id;
                $history->is_success = $isSuccess;
                $history->response_time = $isSuccess ? fake()->randomFloat(1, 1, 200) : null;
                $history->error_message = $isSuccess ? '' : 'Request timeout';
                $history->created_at = now()->subMinutes(($i + 1) * 10);
                $history->save();
            }
        }

        // Créer des VLANs
        Vlan::create(['vlan_id' => 10, 'name' => 'Administration', 'subnet' => '192.168.10.0/24', 'gateway' => '192.168.10.1']);
        Vlan::create(['vlan_id' => 20, 'name' => 'Serveurs', 'subnet' => '192.168.20.0/24', 'gateway' => '192.168.20.1']);
        Vlan::create(['vlan_id' => 30, 'name' => 'WiFi Public', 'subnet' => '192.168.30.0/24', 'gateway' => '192.168.30.1']);

        // Créer une config switch
        SwitchConfig::create([
            'target_id' => $targets[0]->id,
            'hostname' => 'core-router',
            'vendor' => 'MikroTik',
            'model' => 'CCR1036',
            'os_version' => 'RouterOS v7.14',
            'serial_number' => 'SN-001',
            'ports_count' => 48,
            'version' => 1,
        ]);
    }
}
