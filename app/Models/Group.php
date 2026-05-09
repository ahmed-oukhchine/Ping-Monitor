<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Group extends Model
{
    protected $fillable = ['name', 'color'];

    public function targets()
    {
        return $this->belongsToMany(Target::class);
    }
}
