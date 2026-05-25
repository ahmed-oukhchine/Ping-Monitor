<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('switch_configs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('target_id')->nullable()->constrained()->nullOnDelete();
            $table->string('hostname');
            $table->string('vendor', 100)->nullable();
            $table->string('model', 100)->nullable();
            $table->string('os_version', 100)->nullable();
            $table->string('serial_number', 100)->nullable();
            $table->longText('config_text')->nullable();
            $table->unsignedInteger('version')->default(1);
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->index('hostname');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('switch_configs');
    }
};
