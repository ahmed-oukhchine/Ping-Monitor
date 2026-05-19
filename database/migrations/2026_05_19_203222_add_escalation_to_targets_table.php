<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('targets', function (Blueprint $table) {
            $table->string('escalation_email', 255)->nullable()->after('alerted_at');
            $table->unsignedSmallInteger('escalation_after_minutes')->nullable()->after('escalation_email');
        });
    }

    public function down(): void
    {
        Schema::table('targets', function (Blueprint $table) {
            $table->dropColumn(['escalation_email', 'escalation_after_minutes']);
        });
    }
};
