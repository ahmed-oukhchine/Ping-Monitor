# ArgusNet — Production Features Roadmap

> All features below are implementable with Laravel (PHP). Each entry includes what it does and how to build it.

---

## 1. Scheduled Auto-Polling (Background Jobs)
**What:** Automatically ping all targets every N minutes without any user action — even when no browser is open.
**How:** Laravel Scheduler (`app/Console/Kernel.php`) + a custom Artisan command (`php artisan ping:all`). Run `* * * * * php artisan schedule:run` as a cron job on the server. Store the interval per-target or globally in settings.

---

## 2. Email Alerts on Status Change
**What:** Send an email when a target goes from Online → Offline (down alert) or Offline → Online (recovery alert).
**How:** Laravel Mailables + `Mail::to()->send()`. Compare the new ping result against the last recorded `is_success` in `ping_histories`. Queue the mail with `Mail::queue()` so it doesn't block the ping loop. Use SMTP, Mailgun, or SendGrid via `.env` config.

---

## 3. User Authentication
**What:** Require login to access the dashboard — prevent unauthorized users from seeing your network map.
**How:** Laravel Breeze or Jetstream for scaffolding. Add `auth` middleware to all routes in `web.php`. Provides login, logout, password reset out of the box.

---

## 4. Role-Based Access Control (RBAC)
**What:** Admin users can add/delete targets and change settings; Viewer users can only watch the dashboard.
**How:** Add a `role` column (`admin` / `viewer`) to the `users` table. Create a `CheckRole` middleware that blocks non-admins from POST/PUT/DELETE routes. Or use the `spatie/laravel-permission` package for more granular permissions.

---

## 5. Device Groups / Tags
**What:** Organize targets into groups (e.g., "Servers", "Switches", "Printers", "DMZ") to filter and monitor by category.
**How:** Create a `groups` table and a pivot table `group_target`. Add a `GroupController` with CRUD. On the frontend, add a group filter dropdown. Use Eloquent `belongsToMany` relationship.

---

## 6. HTTP / HTTPS Endpoint Monitoring
**What:** Monitor websites and APIs by checking their HTTP status code (200, 500, etc.) and response time — not just ICMP ping.
**How:** Add a `type` column to `targets` (`icmp` / `http`). For HTTP targets, use Laravel's HTTP client (`Http::timeout(5)->get($url)`) and record the status code and response time in `ping_histories`. Add a `status_code` column to the table.

---

## 7. TCP Port Monitoring
**What:** Check whether a specific port is open on a host (e.g., port 22 for SSH, 3306 for MySQL, 5432 for PostgreSQL).
**How:** Add `port` and `type` columns to `targets`. For TCP targets, use `fsockopen($host, $port, $errno, $errstr, 3)` inside `performPing()`. Record success/failure and connection time.

---

## 8. Latency Threshold Alerts
**What:** Alert when a target's response time exceeds a configured threshold (e.g., warn if latency > 100ms, critical if > 500ms).
**How:** Add `warn_ms` and `critical_ms` columns to `targets`. After each ping, compare `response_time` against thresholds and trigger a notification (email or webhook) if exceeded. Store alert state to avoid spamming repeated alerts.

---

## 9. Maintenance Mode per Target
**What:** Pause monitoring for a specific target (e.g., during planned maintenance) so you don't get false-alarm alerts.
**How:** Add an `is_paused` boolean column to `targets`. In the ping logic (Artisan command and manual ping), skip targets where `is_paused = true`. Show a "Paused" badge in the UI. Add pause/resume buttons.

---

## 10. Downtime Log & Incident Tracking
**What:** Automatically record every outage as an incident — when it started, when it ended, and total duration.
**How:** Create an `incidents` table (`target_id`, `started_at`, `resolved_at`, `duration_seconds`). When a ping fails for the first time (previous was success), open a new incident. When ping recovers, close the incident and calculate duration. Add an Incidents page in the React frontend.

---

## 11. SLA Reports (Uptime Reports by Period)
**What:** Generate uptime/downtime reports for a given date range (daily, weekly, monthly) — useful for reporting to management.
**How:** Add a `ReportController` with a `generate(Request $request, Target $target)` method. Query `ping_histories` filtered by date range, calculate uptime%, total downtime in minutes, number of incidents. Return as JSON for the frontend or as a downloadable PDF using `barryvdh/laravel-dompdf`.

---

## 12. Bulk Import via CSV
**What:** Add dozens of targets at once by uploading a CSV file (`name,ip_address,group`) instead of adding them one by one.
**How:** Create an `ImportController` that accepts a file upload. Use Laravel's `Storage` and `str_getcsv()` (or the `maatwebsite/excel` package) to parse rows. Validate each row and bulk-insert with `Target::insert()`. Return a summary of created vs. failed rows.

---

## 13. Subnet Scanner
**What:** Scan a whole subnet (e.g., `192.168.1.0/24`) and auto-discover live hosts, then let the user add them as targets.
**How:** Create an Artisan command `php artisan scan:subnet {cidr}`. Loop through all IPs in the range using `ip2long` / `long2ip`. Ping each IP using `performPing()`. Return the list of responding IPs as JSON. The frontend shows a "discovered hosts" list with checkboxes to add them.

---

## 14. API Tokens for External Access
**What:** Allow external scripts, tools, or dashboards to pull your monitoring data via a secure API key.
**How:** Add a `api_tokens` table or use Laravel Sanctum (`php artisan sanctum:install`). Protect API routes with `auth:sanctum` middleware. Users can generate/revoke tokens from their profile page. External tools pass `Authorization: Bearer <token>` in request headers.

---

## 15. Webhook Notifications (Slack / Teams / Discord)
**What:** Send real-time alerts to a Slack channel, Microsoft Teams, or Discord server when a host goes down or recovers.
**How:** Add a `webhook_url` field to `targets` (or a global setting). When an alert triggers, use `Http::post($webhookUrl, ['text' => "..."])`. For Slack use their Incoming Webhooks format; for Teams use their Adaptive Card format; for Discord use their webhook JSON format. Queue with `dispatch()` so it's async.

---

## 16. Notification History Log
**What:** Keep a record of every alert that was sent — who was notified, when, and for which target — so you can audit past incidents.
**How:** Create a `notifications_log` table (`target_id`, `channel` [email/slack/webhook], `message`, `sent_at`). After every successful notification dispatch, insert a row. Add a "Notification Log" page in the frontend with filters by target and date.

---

## 17. Per-Target Check Intervals
**What:** Set a different polling frequency for each target — e.g., check critical servers every 1 minute but printers every 10 minutes.
**How:** Add a `check_interval_minutes` column to `targets` (default: 5). In the Artisan scheduler command, only ping a target if `now() >= last_ping_at + check_interval`. Use a single `schedule->everyMinute()` loop that evaluates each target's individual interval.

---

## 18. Device Notes & Documentation
**What:** Attach notes to each target — location, responsible team, rack number, credentials link, etc.
**How:** Add a `notes` text column to `targets`. Add a "Notes" field in the Edit modal. Display it as a collapsible section in the target detail view. Supports Markdown formatting rendered client-side with a lightweight library like `marked`.

---

## 19. Dashboard Widgets / Customizable Layout
**What:** Let users pin/hide stat cards, choose which columns appear in the table, and save their layout preference.
**How:** Store layout config as JSON in `user_preferences` table or in `localStorage`. A `PreferenceController` handles GET/PUT for server-side persistence. The React dashboard reads the config on load and renders only the selected widgets.

---

## 20. Two-Factor Authentication (2FA)
**What:** Add an extra layer of security — users must enter a TOTP code from an authenticator app after their password.
**How:** Use the `pragmarx/google2fa-laravel` package. After login, redirect to a 2FA challenge page. Store the TOTP secret encrypted in the `users` table. Works with Google Authenticator, Authy, and any TOTP-compatible app.

---

*Total: 20 features — all implementable with standard Laravel features, official packages, or small PHP functions.*
