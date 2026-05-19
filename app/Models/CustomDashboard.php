<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class CustomDashboard extends Model
{
    protected $fillable = ['name', 'description', 'widgets', 'is_default', 'created_by'];

    protected $casts = [
        'widgets'    => 'json',
        'is_default' => 'boolean',
    ];

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
