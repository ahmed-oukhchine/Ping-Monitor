<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('targets', function (Blueprint $table) {
            $table->boolean('snmp_enabled')->default(false)->after('alerted_at');
            $table->string('snmp_community', 100)->nullable()->after('snmp_enabled');
            $table->string('snmp_version', 4)->default('2c')->after('snmp_community');
        });
    }

    public function down(): void
    {
        Schema::table('targets', function (Blueprint $table) {
            $table->dropColumn(['snmp_enabled', 'snmp_community', 'snmp_version']);
        });
    }
};
