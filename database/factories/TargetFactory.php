<?php

namespace Database\Factories;

use Illuminate\Database\Eloquent\Factories\Factory;

class TargetFactory extends Factory
{
    public function definition(): array
    {
        return [
            'name' => fake()->word(),
            'ip_address' => fake()->ipv4(),
            'location' => fake()->city(),
            'is_paused' => false,
        ];
    }
}
