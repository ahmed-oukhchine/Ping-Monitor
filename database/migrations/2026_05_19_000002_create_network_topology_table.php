<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('network_topology', function (Blueprint $table) {
            $table->id();
            $table->foreignId('source_target_id')->constrained('targets')->cascadeOnDelete();
            $table->foreignId('destination_target_id')->constrained('targets')->cascadeOnDelete();
            $table->string('label')->nullable();
            $table->string('discovery_method')->default('manual');
            $table->timestamps();

            $table->unique(['source_target_id', 'destination_target_id'], 'topology_unique');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('network_topology');
    }
};
