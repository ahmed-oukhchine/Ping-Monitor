<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #1e1e2e; padding: 20px;">
    <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
            <td align="center">
                <table width="560" cellpadding="0" cellspacing="0" style="background: #2a2a3e; border-radius: 12px; overflow: hidden;">
                    <tr>
                        <td style="padding: 24px 32px; background: linear-gradient(135deg, #2563eb, #7c3aed); text-align: center;">
                            <h1 style="color: #fff; margin: 0; font-size: 22px;">SLA Report</h1>
                            <p style="color: rgba(255,255,255,0.7); margin: 6px 0 0; font-size: 13px;">{{ $report->name }}</p>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding: 24px 32px;">
                            <p style="color: #cbd5e1; font-size: 14px; margin: 0 0 12px;">
                                Your scheduled report is attached as a PDF.
                            </p>
                            <p style="color: #94a3b8; font-size: 12px; margin: 0;">
                                Frequency: <strong style="color: #cbd5e1;">{{ ucfirst($report->frequency) }}</strong><br>
                                Format: <strong style="color: #cbd5e1;">{{ strtoupper($report->format) }}</strong><br>
                                Next report: <strong style="color: #cbd5e1;">{{ $report->frequency === 'weekly' ? 'Next week' : 'Next month' }}</strong>
                            </p>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding: 16px 32px; background: #1e1e2e; text-align: center; border-top: 1px solid #374151;">
                            <p style="color: #6b7280; font-size: 11px; margin: 0;">ArgusNet — Network Monitor</p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
