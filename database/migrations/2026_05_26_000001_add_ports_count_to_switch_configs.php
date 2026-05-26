<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('switch_configs', function (Blueprint $table) {
            $table->unsignedInteger('ports_count')->nullable()->after('serial_number');
        });
    }

    public function down(): void
    {
        Schema::table('switch_configs', function (Blueprint $table) {
            $table->dropColumn('ports_count');
        });
    }
};
