<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('audit_logs', function (Blueprint $table) {
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete()->after('id');
            $table->string('action', 50)->after('user_id');
            $table->string('target_type', 50)->nullable()->after('action');
            $table->unsignedBigInteger('target_id')->nullable()->after('target_type');
            $table->json('old_values')->nullable()->after('target_id');
            $table->json('new_values')->nullable()->after('old_values');
            $table->string('ip_address', 45)->nullable()->after('new_values');
        });
    }

    public function down(): void
    {
        Schema::table('audit_logs', function (Blueprint $table) {
            $table->dropColumn(['user_id', 'action', 'target_type', 'target_id', 'old_values', 'new_values', 'ip_address']);
        });
    }
};
