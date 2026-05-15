<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('network_interfaces', function (Blueprint $table) {
            $table->id();
            $table->foreignId('target_id')->constrained()->cascadeOnDelete();
            $table->integer('snmp_index');
            $table->string('name', 100);
            $table->string('description', 255)->nullable();
            $table->string('type', 50)->nullable();
            $table->decimal('speed', 20, 0)->nullable();
            $table->string('mac_address', 20)->nullable();
            $table->boolean('is_up')->default(false);
            $table->decimal('in_octets', 20, 0)->default(0);
            $table->decimal('out_octets', 20, 0)->default(0);
            $table->timestamp('last_polled_at')->nullable();
            $table->timestamps();

            $table->unique(['target_id', 'snmp_index']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('network_interfaces');
    }
};
