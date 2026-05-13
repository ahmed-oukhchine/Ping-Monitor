# Project Map — PingMonitor (ArgusNet)

## 1. Critical Infrastructure

### 1.1 Scheduled Auto-Polling (Artisan Command)
- **Why:** The app currently requires a logged-in browser tab to ping. No cron-based background pinging exists.
- **What:** Create `php artisan ping:all` command, register it in `routes/console.php` with `->everyMinute()`, and set up Laravel scheduler.
- **Also:** Add `ping:target {id}` for single-target pinging.
- **Migration needed?** No (uses existing endpoints).

### 1.2 Queue System for Email Alerts
- **Why:** Email alerts are currently sent synchronously (`Mail::to()->send()`), blocking the response.
- **What:** Switch to `Mail::to()->queue()`, configure `.env` with `QUEUE_CONNECTION=database`, ensure queue worker runs (already in `composer.json dev` script).
- **Migration needed?** No (jobs table already exists).

### 1.3 Ping History Pruning
- **Why:** No retention policy exists. Ping histories grow unbounded, degrading query performance.
- **What:** Add `php artisan ping:prune --days=90` command. Optionally make retention configurable per target.
- **Migration needed?** Add `retention_days` column to `targets` (nullable, default 90).

### 1.4 Real Tests
- **Why:** Only Laravel boilerplate stubs exist. Zero real test coverage on the core ping/alert logic.
- **What:** Write feature tests for:
  - Login/logout flow
  - Target CRUD (admin vs tester)
  - Ping execution and history recording
  - Alert triggering (with mocked mail)
  - Group management
  - Incident detection

---

## 2. Monitoring & Alerting Enhancements

### 2.1 HTTP/HTTPS Endpoint Monitoring
- **Why:** ROADMAP item #6. ICMP ping alone doesn't verify web services.
- **What:** Add `type` column to `targets` (enum: `ping`, `http`, `tcp`). For HTTP type, perform `curl`/Guzzle GET and check status code 2xx/3xx, measure response time.
- **Migration needed?** Yes — `add_type_to_targets_table`.

### 2.2 TCP Port Monitoring
- **Why:** ROADMAP item #7. Currently only a fallback inside `performPing()` — should be a first-class type.
- **What:** Add `port` column to `targets`. When `type=tcp`, attempt `fsockopen` on that specific port.
- **Migration needed?** Yes — `add_port_to_targets_table`.

### 2.3 Recovery / Up Alert Notifications
- **Why:** Only offline alerts exist. No "Target is back online" notification.
- **What:** In `maybeAlert()`, when a target recovers (was alerted, now successful), send a `TargetUpAlert` mailable.
- **Migration needed?** No.

### 2.4 Webhook Notifications (Slack / Teams / Discord)
- **Why:** ROADMAP item #15. Email is slow; ops teams use chat.
- **What:** Add `webhook_url` column to `targets`. Send JSON payload with target info on down/up events. Support Slack-compatible format (works with Teams/Discord too).
- **Migration needed?** Yes — `add_webhook_url_to_targets_table`.

### 2.5 Notification History Log
- **Why:** ROADMAP item #16. No record of when/what alerts were sent.
- **What:** Create `notifications` table (target_id, channel, type, sent_at, success). Log every alert send attempt. Display in a new "Notifications" page.
- **Migration needed?** Yes — `create_notifications_table`.

### 2.6 Per-Target Check Intervals
- **Why:** ROADMAP item #17. All targets use the same interval. Some devices need 30s checks; others can be checked every 5min.
- **What:** Add `check_interval_seconds` (default 60) to `targets`. Respect in the scheduler command.
- **Migration needed?** Yes — `add_check_interval_to_targets_table`.

---

## 3. Incidents & Reporting

### 3.1 Incidents Database Table
- **Why:** Incident detection is currently computed in-memory by scanning ping_histories — slow and non-persistent.
- **What:** Create `incidents` table (target_id, started_at, ended_at, failed_pings, resolved). Write incidents on ping failure/success detection in the scheduler. Incidents page queries this table directly.
- **Migration needed?** Yes — `create_incidents_table`.

### 3.2 SLA / Uptime Reports
- **Why:** ROADMAP item #11. No way to view uptime by period (24h, 7d, 30d, custom).
- **What:** New page "Reports" with period picker, per-target uptime %, response time trends, SLA attainment.
- **Migration needed?** No (compute from ping_histories).

### 3.3 Scheduled Downtime / Maintenance Windows
- **Why:** No way to schedule future maintenance — pausing is manual only.
- **What:** Create `maintenance_windows` table (target_id, starts_at, ends_at, reason). Auto-pause/resume targets during windows. Exclude from incident calculation.
- **Migration needed?** Yes — `create_maintenance_windows_table`.

---

## 4. User & Admin Features

### 4.1 Password Reset Flow
- **Why:** `password_reset_tokens` table exists but no routes, UI, or emails.
- **What:** Implement "Forgot Password" link on login, email with reset link, reset form page. Use Laravel's built-in `Password` facade.
- **Migration needed?** No (table exists).

### 4.2 Audit Log Implementation
- **Why:** `audit_logs` table has only id + timestamps. The model is empty. No code writes to it.
- **What:** Fill out the `AuditLog` model with `user_id`, `action`, `target_type`, `target_id`, `old_values`, `new_values`. Log all admin CRUD actions via model events or middleware.
- **Migration needed?** Yes — modify `audit_logs` to add the real columns.

### 4.3 Multi-Factor Authentication (2FA)
- **Why:** ROADMAP item #20.
- **What:** Integrate `laravel/fortify` or a TOTP library. Add 2FA setup page in Settings. Require code on login for users who have it enabled.
- **Migration needed?** Yes — `add_two_factor_columns_to_users_table`.

### 4.4 API Tokens
- **Why:** ROADMAP item #14. Enables external systems to query status without a browser session.
- **What:** Use Laravel Sanctum. Add token management UI in Settings. Token-based auth for API routes as alternative to session.
- **Migration needed?** Yes (Sanctum provides migration).

---

## 5. Onboarding & Usability

### 5.1 Bulk Import via CSV
- **Why:** ROADMAP item #12. Adding 50+ devices one-by-one is painful.
- **What:** "Import CSV" button on Dashboard. Parse CSV with columns: name, ip, location, group, thresholds. Preview before saving.
- **Migration needed?** No.

### 5.2 Subnet Scanner
- **Why:** ROADMAP item #13. Discover devices on a subnet automatically.
- **What:** "Scan Subnet" form (IP/CIDR). Uses `nmap` or PHP socket range scan to find live hosts. Presents results for bulk-import as targets.
- **Migration needed?** No.

### 5.3 Device Notes with Markdown
- **Why:** ROADMAP item #18. Notes exist as plain text. Support Markdown rendering in TargetDetailModal.
- **What:** Add a Markdown renderer (e.g., `react-markdown`) for the notes field in the frontend.
- **Migration needed?** No.

### 5.4 Dashboard Widgets / Customizable Layout
- **Why:** ROADMAP item #19. Every user wants different data on their home screen.
- **What:** Widget system: grid of draggable/resizable cards (fleet health, top offenders, traffic chart, group status, etc.). User preferences saved to localStorage or backend.
- **Migration needed?** Maybe — `user_dashboard_config` JSON column on `users`.

---

## 6. Technical Debt & Polish

### 6.1 Remove Unused Frontend Code
- `Navbar.jsx` — unused (sidebar replaced it).
- `ThemeContext.js` — not wired into the component tree (theme managed in `app.jsx`).
- `StatsChartModal.jsx` — not used anywhere.

### 6.2 Consistent Error Handling
- Frontend error handling is mixed: some pages show toast banners, others silently fail.
- Backend validation errors return inconsistent formats. Standardize on a JSON error envelope.

### 6.3 Loading & Empty States
- Dashboard/Statistics handle loading and empty states well, but Incidents and Users pages could improve empty states (filtered vs no-data).

### 6.4 Pagination Uniformity
- History uses 15 per page, Incidents uses 20. Extract a shared Pagination component.

### 6.5 API Rate Limiting
- Add `throttle` middleware to ping endpoints to prevent abuse.

### 6.6 TypeScript Migration (Optional)
- The entire frontend is plain JSX. For a monitoring tool that needs reliability, TypeScript would catch null/undefined bugs early.

---

## Priority Matrix

| Priority | Item |
|----------|------|
| **P0 (Must do)** | 1.1 Scheduled Auto-Polling, 1.4 Real Tests |
| **P1 (Should do)** | 1.2 Queue Alerts, 1.3 History Pruning, 2.1 HTTP Monitoring, 2.3 Recovery Alerts, 3.1 Incidents Table, 4.2 Audit Log |
| **P2 (Nice to have)** | 2.2 TCP Port, 2.4 Webhooks, 2.5 Notification History, 2.6 Per-Target Intervals, 3.2 SLA Reports, 4.1 Password Reset, 5.1 CSV Import, 6.1-6.5 Polish |
| **P3 (Future)** | 3.3 Maintenance Windows, 4.3 2FA, 4.4 API Tokens, 5.2 Subnet Scanner, 5.3 Markdown Notes, 5.4 Dashboard Widgets, 6.6 TypeScript |
