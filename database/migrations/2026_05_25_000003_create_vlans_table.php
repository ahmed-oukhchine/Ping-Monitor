<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('vlans', function (Blueprint $table) {
            $table->id();
            $table->integer('vlan_id');
            $table->string('name', 100);
            $table->text('description')->nullable();
            $table->string('subnet', 45)->nullable();
            $table->string('gateway', 45)->nullable();
            $table->string('domain', 100)->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->unique('vlan_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('vlans');
    }
};
