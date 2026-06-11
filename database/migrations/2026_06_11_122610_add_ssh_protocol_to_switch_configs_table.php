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
        Schema::table('switch_configs', function (Blueprint $table) {
            $table->string('ssh_protocol', 10)->default('ssh')->after('ssh_password');
        });
    }

    public function down(): void
    {
        Schema::table('switch_configs', function (Blueprint $table) {
            $table->dropColumn('ssh_protocol');
        });
    }
};
