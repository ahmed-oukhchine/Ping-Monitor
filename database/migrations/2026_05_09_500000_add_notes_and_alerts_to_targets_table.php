<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('targets', function (Blueprint $table) {
            $table->text('notes')->nullable()->after('location');
            $table->string('alert_email')->nullable()->after('critical_ms');
            $table->unsignedSmallInteger('alert_consecutive')->default(3)->after('alert_email');
            $table->unsignedSmallInteger('alert_cooldown_minutes')->default(60)->after('alert_consecutive');
            $table->timestamp('alerted_at')->nullable()->after('alert_cooldown_minutes');
        });
    }

    public function down(): void
    {
        Schema::table('targets', function (Blueprint $table) {
            $table->dropColumn(['notes', 'alert_email', 'alert_consecutive', 'alert_cooldown_minutes', 'alerted_at']);
        });
    }
};
