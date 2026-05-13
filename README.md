<div align="center">
  <br/>
  <a href="https://github.com/ahmed-oukhchine/Ping-Monitor">
    <img src="https://img.shields.io/badge/ArgusNet-PingMonitor-2563eb?style=for-the-badge" alt="ArgusNet"/>
  </a>
  <br/>
  <p align="center">
    <strong>Enterprise Network Monitoring Platform</strong>
    <br/>
    <sub>Built with Laravel · React · daisyUI · Recharts</sub>
  </p>
  <br/>

  [![Laravel](https://img.shields.io/badge/Laravel-12.x-FF2D20?logo=laravel&logoColor=white)](https://laravel.com)
  [![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white)](https://react.dev)
  [![SQLite](https://img.shields.io/badge/Database-SQLite-003B57?logo=sqlite&logoColor=white)](https://sqlite.org)
  [![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

</div>

---

## 📋 Overview

ArgusNet is a **real-time network monitoring dashboard** that tracks device availability, response times, and uptime across your infrastructure. It combines a Laravel REST API with a modern React SPA to deliver live status updates, automated alerting, and historical reporting.

## ✨ Features

| Feature | Description |
|---|---|
| **Live Dashboard** | Real-time device status with auto-refresh and offline alerts |
| **Network Statistics** | Health score, latency distribution, best/worst performers |
| **Ping History** | Searchable, filterable history with CSV export |
| **SLA Reports** | Per-device uptime %, response time trends, and daily breakdowns |
| **Incident Tracking** | Automatic outage detection with duration calculation |
| **Target Groups** | Organize devices into color-coded groups with filtering |
| **Threshold Alerts** | Configurable latency warnings and critical limits |
| **Email Notifications** | Automatic alerts on consecutive failures with cooldown |
| **Audit Logging** | Full trail of all CRUD and ping operations |
| **Role-Based Access** | Admin / Tester / Viewer roles with route-level enforcement |

## 🖥️ Screenshots

<div align="center">
  <img src="https://via.placeholder.com/800x450/1a1a2e/ffffff?text=Dashboard" alt="Dashboard" width="49%"/>
  <img src="https://via.placeholder.com/800x450/1a1a2e/ffffff?text=Reports" alt="Reports" width="49%"/>
</div>

## 🚀 Quick Start

### Prerequisites

- PHP 8.2+
- Composer
- Node.js 20+
- SQLite (included)

### Installation

```bash
# Clone the repository
git clone https://github.com/ahmed-oukhchine/Ping-Monitor.git
cd Ping-Monitor

# Install PHP dependencies
composer install

# Install frontend dependencies
npm install

# Environment setup
cp .env.example .env
php artisan key:generate

# Database
touch database/database.sqlite
php artisan migrate --seed

# Start the development servers
php artisan serve
npm run dev
```

The app will be available at `http://localhost:8000`.

### Scheduled Auto-Polling

```bash
# Add to your system crontab:
* * * * * cd /path/to/project && php artisan schedule:run >> /dev/null 2>&1
```

## 📁 Project Structure

```
├── app/
│   ├── Console/Commands/     # Artisan commands (PingAll, etc.)
│   ├── Http/
│   │   ├── Controllers/      # API controllers
│   │   └── Middleware/        # EnsureAdmin middleware
│   ├── Mail/                  # Mailable classes for alerts
│   └── Models/                # Eloquent models
├── database/
│   ├── migrations/            # Schema definitions
│   └── seeders/               # Test data seeders
├── resources/
│   └── js/
│       ├── pages/             # React page components
│       ├── components/        # Shared UI components
│       └── contexts/          # Auth context
├── routes/
│   ├── web.php                # API routes
│   └── console.php            # Scheduled tasks
└── public/                    # Built assets
```

## 🧪 Running Tests

```bash
php artisan test
```

## 📄 License

This project is open-sourced under the [MIT license](LICENSE).
