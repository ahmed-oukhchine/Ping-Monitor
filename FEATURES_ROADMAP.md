# ArgusNet — Feature Roadmap to SolarWinds-level Monitoring

## Quick Wins (1–2 days each)

### 1. Bandwidth Graphs
Plot SNMP interface in/out octets over time.

**How it works:**
- Already polling `ifInOctets` / `ifOutOctets` from targets via SNMP every 5 minutes
- Create a new `bandwidth_history` table (target_id, interface_id, in_octets, out_octets, timestamp)
- `SnmpPoll` command writes a row per interface each cycle
- New API endpoint: `GET /api/snmp/{target}/bandwidth?range=24h`
- Frontend: Recharts `AreaChart` in TargetDetailModal with 24h/7d/30d tabs
- Display bits per second (calculate delta from previous poll)

### 2. Maintenance Schedule
Let users schedule future maintenance windows.

**How it works:**
- Add `maintenance_starts_at` and `maintenance_ends_at` columns to `targets` table
- `PingAll` command skips alerts for targets inside their maintenance window
- UI: Date-time picker in EditModal → TargetDetailModal shows countdown to maintenance end
- Auto-resume: When `ends_at` passes, target automatically resumes monitoring

### 3. Webhook / Slack / Discord Alerts
Beyond email — POST alerts to external services.

**How it works:**
- Create `alert_channels` table (id, target_id, type [slack|discord|webhook], url, enabled)
- When `maybeAlert()` fires, loop through channels and POST payload to each URL
- Slack format: `{ "text": "[ArgusNet] Router-X is offline (3 consecutive failures)" }`
- Discord: same as Slack with `content` field
- Webhook: arbitrary JSON POST with target name, status, IP, timestamp
- UI: Manage channels section in EditModal (add/remove webhook URLs)

---

## Medium (1–2 weeks)

### 4. Network Topology Map
Visual force-directed graph of monitored devices.

**How it works:**
- Backend: scan ARP tables via SNMP (`ipNetToMediaPhysAddress`) on each device to discover neighbors
- Backend: OR use LLDP MIB (`lldpRemSysName`) on supported switches
- Store discovered links in `network_links` table (source_target_id, dest_target_id, source_interface, dest_interface)
- Frontend: Use `react-force-graph-2d` or D3.js force simulation
- Each node = target device, edges = discovered links
- Color nodes by status (green/red/yellow)
- Click node → open TargetDetailModal
- Auto-layout with drag support

### 5. Custom Dashboards
Drag-and-drop widget system.

**How it works:**
- Create `dashboards` table (id, user_id, name, layout JSON)
- `dashboard_widgets` table (id, dashboard_id, type, x, y, w, h, config JSON)
- Widget types: Uptime gauge, Bandwidth chart, Status grid, Latency sparkline, Alert log
- Frontend: Use `react-grid-layout` for drag-and-drop grid
- Save layout to backend on drop
- Each widget fetches its own data via API
- Default dashboard created for each user on signup

### 6. PDF / CSV Scheduled Reports
Auto-generated SLA reports emailed weekly/monthly.

**How it works:**
- Create `scheduled_reports` table (id, user_id, frequency [weekly|monthly], format [pdf|csv], recipients JSON, last_sent_at)
- Artisan command `reports:generate` runs hourly, checks which reports are due
- For each due report:
  - Query uptime stats per target for the period
  - Calculate: uptime %, avg latency, max latency, outage count, total outage duration
  - Generate PDF using `barryvdh/laravel-dompdf` or CSV via Laravel's streaming
  - Email to recipients with attachment
- Frontend: Settings page to configure report schedule and recipients

---

## Advanced (2–4 weeks)

### 7. Syslog Receiver
Capture and search router/switch log messages.

**How it works:**
- PHP socket server or separate Node.js service listening on UDP port 514
- Parse RFC 3164 syslog messages (facility, severity, hostname, message)
- Store in `syslog_entries` table (hostname, facility, severity, message, timestamp, target_id if matched)
- Frontend: Syslog page with filterable/searchable table
- Filter by target, severity (emerg…debug), date range
- Real-time: Poll new entries via `GET /api/syslog?since=timestamp`
- Highlight critical/error messages in red

### 8. SNMP Trap Receiver
Capture device-initiated alerts (link down, temperature, etc.).

**How it works:**
- PHP socket or Node.js service listening on UDP port 162
- Parse SNMP trap PDUs using `snmp2_real_walk` or a pure-PHP ASN.1 parser
- Store in `snmp_traps` table (target_id, trap_oid, uptime, variables JSON, received_at)
- Map common trap OIDs to human-readable alerts:
  - `.1.3.6.1.6.3.1.1.5.3` = Link Down
  - `.1.3.6.1.6.3.1.1.5.4` = Link Up
  - `.1.3.6.1.4.1.9.9.43.1.1.1` = Cisco Config Change
- Frontend: Traps page with timeline view
- Optionally trigger alert actions (email/webhook) on specific traps

### 9. NetFlow Collector
Top talkers and bandwidth by protocol.

**How it works:**
- Node.js or Go service listening on UDP port 2055 (NetFlow v5/v9)
- Parse NetFlow packets (src/dst IP, src/dst port, protocol, bytes, packets)
- Aggregate flows every 5 minutes into `netflow_stats` table (timestamp, src_ip, dst_ip, protocol, port, bytes, packets)
- Match IPs to known targets when possible
- Frontend: NetFlow dashboard showing:
  - Top talkers (by bytes/packets)
  - Bandwidth by protocol (TCP/HTTP/DNS/HTTPS)
  - Bandwidth by target
  - Time-series graphs
- Store raw flows for 7 days, aggregated stats for 1 year

### 10. Config Backup / Restore
SSH into devices and backup configurations.

**How it works:**
- Create `device_credentials` table (target_id, ssh_port, username, auth_type [password|key], encrypted_password, ssh_key_path, enable_password)
- Artisan command `config:backup` runs daily:
  - SSH into each device with credentials
  - Run `show running-config` (Cisco) or equivalent
  - Store config text in `config_backups` table (target_id, config_text, backup_hash, created_at)
- `config:diff` command: compare last two backups, generate unified diff
- Frontend: Config Backup page showing:
  - Backup history per device (timeline)
  - Diff view between versions (syntax-highlighted)
  - Download / restore button
- Security: SSH keys stored on-disk with restricted permissions, passwords encrypted at rest

---

## Implementation Priority Matrix

| Feature | Effort | Impact | Dependency |
|---------|--------|--------|-----------|
| Bandwidth graphs | 1 day | High | SNMP already working |
| Maintenance schedule | 1 day | Medium | None |
| Webhook alerts | 1 day | High | Alert system exists |
| Network topology map | 5 days | Very High | SNMP + ARP/LLDP |
| Custom dashboards | 7 days | High | None |
| Scheduled reports | 3 days | Medium | PDF lib |
| Syslog receiver | 5 days | High | UDP listener service |
| SNMP trap receiver | 5 days | High | UDP listener service |
| NetFlow collector | 7 days | Very High | Go/Node service |
| Config backup/restore | 5 days | Medium | SSH lib |

**Recommended order:** Bandwidth graphs → Webhook alerts → Maintenance schedule → Network topology → Custom dashboards → Syslog → Traps → NetFlow → Config backup → Reports
