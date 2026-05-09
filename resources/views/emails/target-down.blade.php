<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <title>Offline Alert — {{ $target->name }}</title>
</head>
<body style="margin:0;padding:0;background:#0e0e0e;font-family:'Segoe UI',system-ui,-apple-system,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#0e0e0e;padding:36px 16px;">
    <tr>
        <td align="center">
            <table width="520" cellpadding="0" cellspacing="0" style="background:#161616;border:1px solid #252525;border-radius:14px;overflow:hidden;max-width:100%;">

                {{-- Red alert banner --}}
                <tr>
                    <td style="background:#dc2626;padding:18px 28px;">
                        <table cellpadding="0" cellspacing="0" width="100%">
                            <tr>
                                <td style="color:#fff;font-size:11px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;">
                                    ● &nbsp;Offline Alert
                                </td>
                                <td align="right" style="color:rgba(255,255,255,0.7);font-size:11px;">
                                    ArgusNet Monitor
                                </td>
                            </tr>
                        </table>
                    </td>
                </tr>

                {{-- Target info --}}
                <tr>
                    <td style="padding:28px 28px 20px;">
                        <p style="margin:0 0 4px;color:#f5f5f5;font-size:22px;font-weight:700;line-height:1.2;">
                            {{ $target->name }}
                        </p>
                        <p style="margin:0;color:#6b7280;font-size:13px;font-family:Consolas,'Courier New',monospace;">
                            {{ $target->ip_address }}@if($target->location) &nbsp;·&nbsp; {{ $target->location }}@endif
                        </p>
                    </td>
                </tr>

                {{-- Detail table --}}
                <tr>
                    <td style="padding:0 28px 24px;">
                        <table cellpadding="0" cellspacing="0" width="100%"
                               style="background:#0e0e0e;border:1px solid #252525;border-radius:10px;overflow:hidden;">
                            <tr>
                                <td style="padding:13px 18px;border-bottom:1px solid #252525;">
                                    <span style="color:#6b7280;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.06em;">Status</span>
                                    <span style="float:right;color:#ef4444;font-size:12px;font-weight:700;">● Offline</span>
                                </td>
                            </tr>
                            <tr>
                                <td style="padding:13px 18px;border-bottom:1px solid #252525;">
                                    <span style="color:#6b7280;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.06em;">Consecutive Failures</span>
                                    <span style="float:right;color:#f5f5f5;font-size:12px;font-weight:700;">{{ $consecutive }}</span>
                                </td>
                            </tr>
                            <tr>
                                <td style="padding:13px 18px;">
                                    <span style="color:#6b7280;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.06em;">Detected At</span>
                                    <span style="float:right;color:#f5f5f5;font-size:12px;font-weight:700;font-family:Consolas,'Courier New',monospace;">
                                        {{ now()->format('Y-m-d H:i') }} UTC
                                    </span>
                                </td>
                            </tr>
                        </table>
                    </td>
                </tr>

                @if($target->notes)
                {{-- Notes box --}}
                <tr>
                    <td style="padding:0 28px 24px;">
                        <table cellpadding="0" cellspacing="0" width="100%"
                               style="background:#1e2433;border:1px solid #2d3748;border-radius:10px;">
                            <tr>
                                <td style="padding:14px 18px;">
                                    <p style="margin:0 0 6px;color:#6b7280;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.06em;">Notes</p>
                                    <p style="margin:0;color:#cbd5e1;font-size:13px;line-height:1.55;">{{ $target->notes }}</p>
                                </td>
                            </tr>
                        </table>
                    </td>
                </tr>
                @endif

                {{-- Footer note --}}
                <tr>
                    <td style="padding:0 28px 28px;">
                        <p style="margin:0;color:#4b5563;font-size:12px;line-height:1.6;">
                            You'll receive another alert after the {{ $target->alert_cooldown_minutes ?? 60 }}-minute cooldown,
                            unless the device recovers first.
                        </p>
                    </td>
                </tr>

                {{-- Divider + branding --}}
                <tr>
                    <td style="padding:14px 28px;border-top:1px solid #252525;">
                        <p style="margin:0;color:#333;font-size:11px;">
                            ArgusNet · Network Monitoring Platform
                        </p>
                    </td>
                </tr>

            </table>
        </td>
    </tr>
</table>
</body>
</html>
