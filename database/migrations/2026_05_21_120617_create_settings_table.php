<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('settings', function (Blueprint $table) {
            $table->id();
            $table->string('key')->unique();
            $table->text('value')->nullable();
            $table->timestamps();
        });

        DB::table('settings')->insert([
            ['key' => 'alert_default_warn_ms', 'value' => '100'],
            ['key' => 'alert_default_critical_ms', 'value' => '300'],
            ['key' => 'alert_default_email', 'value' => ''],
            ['key' => 'alert_default_consecutive', 'value' => '3'],
            ['key' => 'alert_default_cooldown', 'value' => '15'],
            ['key' => 'snmp_default_community', 'value' => 'public'],
            ['key' => 'snmp_default_version', 'value' => 'v2c'],
            ['key' => 'data_retention_days', 'value' => '90'],
        ]);
    }

    public function down(): void
    {
        Schema::dropIfExists('settings');
    }
};
