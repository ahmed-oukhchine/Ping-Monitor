<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('targets', function (Blueprint $table) {
            $table->unsignedTinyInteger('cpu_load')->nullable()->after('snmp_version');
            $table->unsignedBigInteger('ram_total')->nullable()->after('cpu_load');
            $table->unsignedBigInteger('ram_used')->nullable()->after('ram_total');
            $table->timestamp('system_polled_at')->nullable()->after('ram_used');
        });
    }

    public function down(): void
    {
        Schema::table('targets', function (Blueprint $table) {
            $table->dropColumn(['cpu_load', 'ram_total', 'ram_used', 'system_polled_at']);
        });
    }
};
