<?php

namespace Tests\Feature;

use Tests\TestCase;
use App\Models\User;
use App\Models\Target;
use Illuminate\Foundation\Testing\RefreshDatabase;

class PingTest extends TestCase
{
    use RefreshDatabase;

    public function test_authentification(): void
    {
        $user = User::factory()->create(['role' => 'user']);
        $response = $this->post('/login', [
            'email' => $user->email,
            'password' => 'password',
        ]);
        $response->assertStatus(200);
    }

    public function test_creer_cible(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $this->actingAs($admin);

        $response = $this->post('/targets', [
            'name' => 'Test Switch',
            'ip_address' => '192.168.1.1',
            'location' => 'Nador',
        ]);
        $response->assertStatus(201);
        $this->assertDatabaseHas('targets', ['name' => 'Test Switch']);
    }

    public function test_supervision_ping(): void
    {
        $target = Target::factory()->create(['ip_address' => '127.0.0.1']);
        $admin = User::factory()->create(['role' => 'admin']);
        $this->actingAs($admin);

        $response = $this->post("/targets/{$target->id}/ping");
        $response->assertStatus(200);
    }

    public function test_historique_disponible(): void
    {
        $user = User::factory()->create(['role' => 'user']);
        $this->actingAs($user);

        $response = $this->get('/api/history');
        $response->assertStatus(200);
    }

    public function test_acces_non_autorise(): void
    {
        $response = $this->get('/api/users');
        $response->assertStatus(302);
    }
}
