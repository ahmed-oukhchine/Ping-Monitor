<?php

namespace App\Http\Controllers;

use App\Models\Setting;
use Illuminate\Http\Request;

class SettingsController extends Controller
{
    public function index()
    {
        $keys = [
            'alert_default_warn_ms',
            'alert_default_critical_ms',
            'alert_default_email',
            'alert_default_consecutive',
            'alert_default_cooldown',
            'snmp_default_community',
            'snmp_default_version',
            'data_retention_days',
        ];

        $settings = Setting::whereIn('key', $keys)->get()->keyBy('key');

        return response()->json(
            collect($keys)->mapWithKeys(fn($k) => [$k => $settings->get($k)?->value ?? null])
        );
    }

    public function update(Request $request)
    {
        $data = $request->validate([
            'alert_default_warn_ms'       => 'nullable|integer|min:0|max:60000',
            'alert_default_critical_ms'   => 'nullable|integer|min:0|max:60000',
            'alert_default_email'         => 'nullable|email',
            'alert_default_consecutive'   => 'nullable|integer|min:1|max:100',
            'alert_default_cooldown'      => 'nullable|integer|min:0|max:1440',
            'snmp_default_community'      => 'nullable|string|max:100',
            'snmp_default_version'        => 'nullable|in:v1,v2c,v3',
            'data_retention_days'         => 'nullable|integer|min:1|max:3650',
        ]);

        foreach ($data as $key => $value) {
            Setting::setValue($key, $value);
        }

        return response()->json(['message' => 'Settings saved']);
    }
}
