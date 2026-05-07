<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PingHistory extends Model
{
    protected $fillable = ['target_id', 'is_success', 'response_time', 'error_message'];

    public function target()
    {
        return $this->belongsTo(Target::class);
    }
}
