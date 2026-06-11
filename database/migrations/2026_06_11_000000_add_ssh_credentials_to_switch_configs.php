<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('switch_configs', function (Blueprint $table) {
            $table->string('ssh_host')->nullable()->after('config_text');
            $table->unsignedInteger('ssh_port')->default(22)->after('ssh_host');
            $table->string('ssh_username')->nullable()->after('ssh_port');
            $table->string('ssh_password')->nullable()->after('ssh_username');
        });
    }

    public function down(): void
    {
        Schema::table('switch_configs', function (Blueprint $table) {
            $table->dropColumn(['ssh_host', 'ssh_port', 'ssh_username', 'ssh_password']);
        });
    }
};
