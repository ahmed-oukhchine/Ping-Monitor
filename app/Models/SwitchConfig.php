<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class SwitchConfig extends Model
{
    protected $table = 'switch_configs';

    protected $fillable = [
        'target_id', 'hostname', 'vendor', 'model', 'os_version',
        'serial_number', 'config_text', 'version', 'created_by',
    ];

    protected $casts = [
        'version' => 'integer',
    ];

    public function target()
    {
        return $this->belongsTo(Target::class);
    }

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
