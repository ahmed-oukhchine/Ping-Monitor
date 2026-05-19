<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('target_dependencies', function (Blueprint $table) {
            $table->id();
            $table->foreignId('target_id')->constrained('targets')->cascadeOnDelete();
            $table->foreignId('depends_on_target_id')->constrained('targets')->cascadeOnDelete();
            $table->timestamps();

            $table->unique(['target_id', 'depends_on_target_id'], 'dep_unique');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('target_dependencies');
    }
};
