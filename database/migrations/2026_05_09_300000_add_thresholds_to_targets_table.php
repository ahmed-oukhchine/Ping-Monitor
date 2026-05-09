<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('targets', function (Blueprint $table) {
            $table->unsignedSmallInteger('warn_ms')->nullable()->after('location');
            $table->unsignedSmallInteger('critical_ms')->nullable()->after('warn_ms');
        });
    }

    public function down(): void
    {
        Schema::table('targets', function (Blueprint $table) {
            $table->dropColumn(['warn_ms', 'critical_ms']);
        });
    }
};
