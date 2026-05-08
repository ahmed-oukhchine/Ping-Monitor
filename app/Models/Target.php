<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Target extends Model
{
    protected $fillable = ['name', 'ip_address'];

    public function pingHistories()
    {
        return $this->hasMany(PingHistory::class);
    }

    public function latestPing()
    {
        return $this->hasOne(PingHistory::class)->latestOfMany();
    }
}
