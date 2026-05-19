<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class TargetDependency extends Model
{
    protected $table = 'target_dependencies';

    protected $fillable = [
        'target_id',
        'depends_on_target_id',
    ];

    public function target()
    {
        return $this->belongsTo(Target::class);
    }

    public function dependsOn()
    {
        return $this->belongsTo(Target::class, 'depends_on_target_id');
    }
}
