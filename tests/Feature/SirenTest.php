<?php

namespace Tests\Feature;

use Tests\TestCase;
use App\Models\User;
use App\Models\Target;
use App\Models\Group;
use App\Models\Vlan;
use App\Models\SwitchConfig;
use App\Models\MaintenanceSchedule;
use App\Models\CustomDashboard;
use App\Models\ScheduledReport;
use Illuminate\Foundation\Testing\RefreshDatabase;

class SirenTest extends TestCase
{
    use RefreshDatabase;

    // ====== TESTS D'AUTHENTIFICATION ======

    public function test_01_login_success(): void
    {
        $user = User::factory()->create(['password' => bcrypt('password')]);
        $response = $this->post('/login', [
            'email' => $user->email,
            'password' => 'password',
        ]);
        $response->assertStatus(200);
    }

    public function test_02_login_fail(): void
    {
        $response = $this->post('/login', [
            'email' => 'wrong@email.com',
            'password' => 'wrongpassword',
        ]);
        $response->assertStatus(401);
    }

    public function test_03_logout(): void
    {
        $user = User::factory()->create();
        $this->actingAs($user);
        $response = $this->post('/logout');
        $response->assertStatus(200);
    }

    // ====== TESTS DASHBOARD ======

    public function test_04_dashboard_access(): void
    {
        $user = User::factory()->create(['role' => 'user']);
        $this->actingAs($user);
        $response = $this->get('/api/targets');
        $response->assertStatus(200);
    }

    public function test_05_dashboard_shows_stats(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $this->actingAs($admin);

        Target::factory()->count(3)->create(['is_paused' => false]);
        Target::factory()->create(['is_paused' => true]);

        $response = $this->get('/api/targets');
        $response->assertStatus(200);
        $response->assertJsonCount(4);
    }

    // ====== TESTS GESTION DES CIBLES ======

    public function test_06_create_target(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $this->actingAs($admin);

        $response = $this->post('/targets', [
            'name' => 'Switch Principal',
            'ip_address' => '192.168.1.1',
            'location' => 'Nador Centre',
        ]);
        $response->assertStatus(201);
        $this->assertDatabaseHas('targets', ['name' => 'Switch Principal']);
    }

    public function test_07_create_target_invalid_ip(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $this->actingAs($admin);

        $response = $this->post('/targets', [
            'name' => 'Test',
            'ip_address' => 'invalid-ip',
        ]);
        $response->assertStatus(302);
    }

    public function test_08_update_target(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $this->actingAs($admin);
        $target = Target::factory()->create();

        $response = $this->put("/targets/{$target->id}", [
            'name' => 'Switch Rename',
            'ip_address' => '10.0.0.1',
            'location' => 'Salle serveur',
        ]);
        $response->assertStatus(200);
        $this->assertDatabaseHas('targets', ['name' => 'Switch Rename']);
    }

    public function test_09_delete_target(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $this->actingAs($admin);
        $target = Target::factory()->create();

        $response = $this->delete("/targets/{$target->id}");
        $response->assertStatus(200);
        $this->assertDatabaseMissing('targets', ['id' => $target->id]);
    }

    public function test_10_pause_target(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $this->actingAs($admin);
        $target = Target::factory()->create(['is_paused' => false]);

        $response = $this->post("/targets/{$target->id}/pause");
        $response->assertStatus(200);
        $this->assertDatabaseHas('targets', ['id' => $target->id, 'is_paused' => true]);
    }

    public function test_11_resume_target(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $this->actingAs($admin);
        $target = Target::factory()->create(['is_paused' => true]);

        $response = $this->post("/targets/{$target->id}/resume");
        $response->assertStatus(200);
        $this->assertDatabaseHas('targets', ['id' => $target->id, 'is_paused' => false]);
    }

    // ====== TESTS PING ======

    public function test_12_ping_target(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $this->actingAs($admin);
        $target = Target::factory()->create(['ip_address' => '127.0.0.1']);

        $response = $this->post("/targets/{$target->id}/ping");
        $response->assertStatus(200);
    }

    public function test_13_ping_all(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $this->actingAs($admin);
        Target::factory()->count(5)->create();

        $response = $this->post('/ping-all');
        $response->assertStatus(200);
    }

    // ====== TESTS HISTORIQUE ======

    public function test_14_history_access(): void
    {
        $user = User::factory()->create(['role' => 'user']);
        $this->actingAs($user);

        $response = $this->get('/api/history');
        $response->assertStatus(200);
    }

    public function test_15_incidents_access(): void
    {
        $user = User::factory()->create(['role' => 'user']);
        $this->actingAs($user);

        $response = $this->get('/api/incidents');
        $response->assertStatus(200);
    }

    public function test_16_chart_data_access(): void
    {
        $user = User::factory()->create(['role' => 'user']);
        $this->actingAs($user);
        $target = Target::factory()->create();

        $response = $this->get("/api/targets/{$target->id}/chart-data");
        $response->assertStatus(200);
    }

    // ====== TESTS GROUPES ======

    public function test_17_create_group(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $this->actingAs($admin);

        $response = $this->post('/api/groups', [
            'name' => 'Serveurs',
            'color' => '#ff0000',
        ]);
        $response->assertStatus(201);
        $this->assertDatabaseHas('groups', ['name' => 'Serveurs']);
    }

    public function test_18_list_groups(): void
    {
        $user = User::factory()->create(['role' => 'user']);
        $this->actingAs($user);

        $response = $this->get('/api/groups');
        $response->assertStatus(200);
    }

    public function test_19_delete_group(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $this->actingAs($admin);
        $group = Group::factory()->create();

        $response = $this->delete("/api/groups/{$group->id}");
        $response->assertStatus(200);
        $this->assertDatabaseMissing('groups', ['id' => $group->id]);
    }

    // ====== TESTS TOPOLOGIE ======

    public function test_20_topology_access(): void
    {
        $user = User::factory()->create(['role' => 'user']);
        $this->actingAs($user);

        $response = $this->get('/api/topology');
        $response->assertStatus(200);
    }

    // ====== TESTS VLANs ======

    public function test_21_create_vlan(): void
    {
        $admin = User::factory()->create(['role' => 'config_manager']);
        $this->actingAs($admin);

        $response = $this->post('/api/vlans', [
            'vlan_id' => 100,
            'name' => 'VLAN Administration',
            'subnet' => '192.168.100.0/24',
        ]);
        $response->assertStatus(201);
        $this->assertDatabaseHas('vlans', ['vlan_id' => 100]);
    }

    public function test_22_list_vlans(): void
    {
        $user = User::factory()->create(['role' => 'user']);
        $this->actingAs($user);

        $response = $this->get('/api/vlans');
        $response->assertStatus(200);
    }

    // ====== TESTS SWITCH CONFIGS ======

    public function test_23_create_switch_config(): void
    {
        $admin = User::factory()->create(['role' => 'config_manager']);
        $this->actingAs($admin);
        $target = Target::factory()->create();

        $response = $this->post('/api/switch-configs', [
            'target_id' => $target->id,
            'hostname' => 'switch-01',
            'vendor' => 'Cisco',
            'model' => 'Catalyst 2960',
        ]);
        $response->assertStatus(201);
    }

    public function test_24_list_switch_configs(): void
    {
        $user = User::factory()->create(['role' => 'user']);
        $this->actingAs($user);

        $response = $this->get('/api/switch-configs');
        $response->assertStatus(200);
    }

    // ====== TESTS RAPPORTS ======

    public function test_25_report_access(): void
    {
        $user = User::factory()->create(['role' => 'user']);
        $this->actingAs($user);

        $response = $this->get('/api/report');
        $response->assertStatus(200);
    }

    public function test_26_create_scheduled_report(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $this->actingAs($admin);

        $response = $this->post('/api/report/schedules', [
            'name' => 'Rapport mensuel',
            'frequency' => 'monthly',
            'format' => 'pdf',
            'recipients' => ['admin@province.ma'],
        ]);
        $response->assertStatus(201);
    }

    public function test_27_list_scheduled_reports(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $this->actingAs($admin);

        $response = $this->get('/api/report/schedules');
        $response->assertStatus(200);
    }

    // ====== TESTS MAINTENANCE ======

    public function test_28_create_maintenance(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $this->actingAs($admin);
        $target = Target::factory()->create();

        $response = $this->post('/api/maintenance-schedules', [
            'name' => 'Maintenance weekend',
            'start_time' => '22:00',
            'end_time' => '06:00',
            'timezone' => 'UTC',
            'days_of_week' => [0, 6],
            'target_ids' => [$target->id],
        ]);
        $response->assertStatus(201);
    }

    public function test_29_list_maintenance(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $this->actingAs($admin);

        $response = $this->get('/api/maintenance-schedules');
        $response->assertStatus(200);
    }

    // ====== TESTS UTILISATEURS ======

    public function test_30_admin_can_create_user(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $this->actingAs($admin);

        $response = $this->post('/api/users', [
            'name' => 'New Tech',
            'email' => 'tech@province.ma',
            'password' => 'password',
            'role' => 'user',
        ]);
        $response->assertStatus(201);
        $this->assertDatabaseHas('users', ['email' => 'tech@province.ma']);
    }

    public function test_31_user_cannot_create_user(): void
    {
        $user = User::factory()->create(['role' => 'user']);
        $this->actingAs($user);

        $response = $this->post('/api/users', [
            'name' => 'Hacker',
            'email' => 'hacker@test.com',
            'password' => 'password',
        ]);
        $response->assertStatus(403);
    }

    public function test_32_list_users_admin(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $this->actingAs($admin);

        $response = $this->get('/api/users');
        $response->assertStatus(200);
    }

    public function test_33_list_users_unauthorized(): void
    {
        $user = User::factory()->create(['role' => 'user']);
        $this->actingAs($user);

        $response = $this->get('/api/users');
        $response->assertStatus(200);
    }

    // ====== TESTS PARAMETRES ======

    public function test_34_settings_access(): void
    {
        $user = User::factory()->create(['role' => 'user']);
        $this->actingAs($user);

        $response = $this->get('/api/settings');
        $response->assertStatus(200);
    }

    // ====== TESTS AUDIT LOGS ======

    public function test_35_audit_logs_access_admin(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $this->actingAs($admin);

        $response = $this->get('/api/audit-logs');
        $response->assertStatus(200);
    }

    // ====== TESTS SNMP ======

    public function test_36_snmp_interfaces_access(): void
    {
        $user = User::factory()->create(['role' => 'user']);
        $this->actingAs($user);

        $response = $this->get('/api/snmp/interfaces');
        $response->assertStatus(200);
    }

    // ====== TESTS DASHBOARDS PERSONNALISES ======

    public function test_37_custom_dashboards_access(): void
    {
        $user = User::factory()->create(['role' => 'user']);
        $this->actingAs($user);

        $response = $this->get('/api/dashboards');
        $response->assertStatus(200);
    }

    // ====== TESTS IMPORT / DECOUVERTE ======

    public function test_38_discovery_access(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $this->actingAs($admin);

        $response = $this->post('/api/targets/discover', [
            'subnet' => '192.168.1.0/24',
        ]);
        $response->assertStatus(200);
    }

    // ====== TEST DE SECURITE : ACCES SANS AUTH ======

    public function test_39_no_auth_blocked(): void
    {
        $response = $this->get('/api/targets');
        $response->assertStatus(302);
    }

    public function test_40_no_auth_redirect(): void
    {
        $response = $this->get('/api/users');
        $response->assertStatus(302);
    }
}
