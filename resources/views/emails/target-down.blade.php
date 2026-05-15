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

                <tr>
                    <td style="background:#dc2626;padding:14px 28px;">
                        <table cellpadding="0" cellspacing="0" width="100%">
                            <tr>
                                <td valign="middle" style="color:#fff;font-size:11px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;">
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40" width="22" height="22" style="vertical-align:middle;margin-right:6px;">
                                        <rect width="40" height="40" rx="10" fill="rgba(255,255,255,0.15)"/>
                                        <rect x="8" y="22" width="4" height="10" rx="1.5" fill="white" opacity="0.5"/>
                                        <rect x="14" y="17" width="4" height="15" rx="1.5" fill="white" opacity="0.7"/>
                                        <rect x="20" y="12" width="4" height="20" rx="1.5" fill="white" opacity="0.9"/>
                                        <rect x="26" y="7" width="4" height="25" rx="1.5" fill="white"/>
                                        <circle cx="30" cy="30" r="3" fill="#22c55e" stroke="rgba(255,255,255,0.15)" stroke-width="1.5"/>
                                    </svg>
                                    ● &nbsp;Offline Alert
                                </td>
                                <td align="right" valign="middle" style="color:rgba(255,255,255,0.7);font-size:11px;">
                                    ArgusNet
                                </td>
                            </tr>
                        </table>
                    </td>
                </tr>

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
                            @if($target->latestPing)
                            <tr>
                                <td style="padding:13px 18px;border-bottom:1px solid #252525;">
                                    <span style="color:#6b7280;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.06em;">Last Response Time</span>
                                    <span style="float:right;color:#f5f5f5;font-size:12px;font-weight:700;">{{ $target->latestPing->response_time ?? '—' }} ms</span>
                                </td>
                            </tr>
                            @endif
                            @if($target->groups->isNotEmpty())
                            <tr>
                                <td style="padding:13px 18px;border-bottom:1px solid #252525;">
                                    <span style="color:#6b7280;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.06em;">Group</span>
                                    <span style="float:right;color:#f5f5f5;font-size:12px;font-weight:700;">{{ $target->groups->pluck('name')->implode(', ') }}</span>
                                </td>
                            </tr>
                            @endif
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

                <tr>
                    <td style="padding:0 28px 28px;">
                        <p style="margin:0;color:#4b5563;font-size:12px;line-height:1.6;">
                            You'll receive another alert after the {{ $target->alert_cooldown_minutes ?? 60 }}-minute cooldown,
                            unless the device recovers first.
                        </p>
                    </td>
                </tr>

                <tr>
                    <td style="padding:14px 28px;border-top:1px solid #252525;">
                        <table cellpadding="0" cellspacing="0" width="100%">
                            <tr>
                                <td valign="middle">
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40" width="16" height="16" style="vertical-align:middle;margin-right:6px;">
                                        <rect width="40" height="40" rx="10" fill="#2563eb"/>
                                        <rect x="8" y="22" width="4" height="10" rx="1.5" fill="white" opacity="0.5"/>
                                        <rect x="14" y="17" width="4" height="15" rx="1.5" fill="white" opacity="0.7"/>
                                        <rect x="20" y="12" width="4" height="20" rx="1.5" fill="white" opacity="0.9"/>
                                        <rect x="26" y="7" width="4" height="25" rx="1.5" fill="white"/>
                                        <circle cx="30" cy="30" r="3" fill="#22c55e" stroke="#2563eb" stroke-width="1.5"/>
                                    </svg>
                                    <span style="color:#555;font-size:11px;vertical-align:middle;">ArgusNet</span>
                                </td>
                                <td align="right" valign="middle">
                                    <span style="color:#333;font-size:10px;">Network Monitoring Platform</span>
                                </td>
                            </tr>
                        </table>
                    </td>
                </tr>

            </table>
        </td>
    </tr>
</table>
</body>
</html>
