<?php

use App\Http\Controllers\AuditLogController;
use App\Http\Controllers\GroupController;
use App\Http\Controllers\LoginController;
use App\Http\Controllers\PingController;
use App\Http\Controllers\ReportController;
use App\Http\Controllers\SnmpController;
use App\Http\Controllers\UserController;
use App\Http\Controllers\MaintenanceScheduleController;
use App\Http\Controllers\TopologyController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\DiscoveryController;
use App\Http\Middleware\EnsureAdmin;
use Illuminate\Support\Facades\Route;

Route::post('/login',  [LoginController::class, 'store']);
Route::post('/logout', [LoginController::class, 'destroy'])->middleware('auth');

Route::middleware('auth')->group(function () {
    Route::get('/api/user',                        [LoginController::class, 'show']);
    Route::get('/api/targets',                     [PingController::class, 'apiTargets']);
    Route::get('/api/history',                     [PingController::class, 'apiHistory']);
    Route::get('/api/history/export',              [PingController::class, 'exportCsv']);
    Route::get('/api/history/export-pdf',           [PingController::class, 'exportPdf']);
    Route::get('/api/incidents',                   [PingController::class, 'apiIncidents']);
    Route::get('/api/targets/{target}/chart-data', [PingController::class, 'apiChartData']);
    Route::get('/api/groups',                      [GroupController::class, 'index']);

    Route::post('/targets/{target}/ping', [PingController::class, 'ping'])->name('targets.ping');
    Route::post('/ping-all',              [PingController::class, 'pingAll']);
    Route::post('/targets/{target}/pause',  [PingController::class, 'pause']);
    Route::post('/targets/{target}/resume', [PingController::class, 'resume']);

    Route::get('/api/report',              [ReportController::class, 'apiReport']);
    Route::get('/api/report/schedules',    [ReportController::class, 'schedules'])->middleware(EnsureAdmin::class);
    Route::post('/api/report/schedules',   [ReportController::class, 'storeSchedule'])->middleware(EnsureAdmin::class);
    Route::delete('/api/report/schedules/{scheduledReport}', [ReportController::class, 'destroySchedule'])->middleware(EnsureAdmin::class);
    Route::post('/api/report/schedules/{scheduledReport}/send', [ReportController::class, 'sendNow'])->middleware(EnsureAdmin::class);
    Route::get('/api/snmp/interfaces',       [SnmpController::class, 'allInterfaces']);
    Route::get('/api/snmp/{target}/interfaces', [SnmpController::class, 'interfaces']);
    Route::post('/api/snmp/{target}/discover',  [SnmpController::class, 'discover'])->middleware(EnsureAdmin::class);
    Route::post('/api/snmp/{target}/poll',      [SnmpController::class, 'poll']);
    Route::get('/api/snmp/{target}/bandwidth',   [SnmpController::class, 'bandwidth']);

    Route::get('/api/users', [UserController::class, 'index']);
    Route::put('/api/profile/password', [UserController::class, 'updateOwnPassword']);
    Route::put('/api/profile', [UserController::class, 'updateOwnProfile']);
    Route::get('/api/targets/template', [PingController::class, 'downloadTemplate']);
    Route::get('/api/topology', [TopologyController::class, 'index']);
    Route::post('/api/topology/positions', [TopologyController::class, 'savePositions']);

    Route::middleware(EnsureAdmin::class)->group(function () {
        Route::get('/api/audit-logs',                    [AuditLogController::class, 'index']);
        Route::post('/api/users',                        [UserController::class, 'store']);
        Route::put('/api/users/{user}/password',         [UserController::class, 'changePassword']);
        Route::delete('/api/users/{user}',               [UserController::class, 'destroy']);
        Route::post('/targets',                   [PingController::class, 'store']);
        Route::put('/targets/{target}',           [PingController::class, 'update']);
        Route::delete('/targets/{target}',        [PingController::class, 'destroy']);

        Route::post('/api/groups',           [GroupController::class, 'store']);
        Route::put('/api/groups/{group}',    [GroupController::class, 'update']);
        Route::delete('/api/groups/{group}', [GroupController::class, 'destroy']);

        Route::post('/api/targets/import',    [PingController::class, 'importCsv']);
        Route::post('/api/targets/discover', [DiscoveryController::class, 'discover']);
        Route::post('/api/targets/discover/store', [DiscoveryController::class, 'store']);

        Route::get('/api/maintenance-schedules',       [MaintenanceScheduleController::class, 'index']);
        Route::get('/api/maintenance-targets',          [MaintenanceScheduleController::class, 'targets']);
        Route::post('/api/maintenance-schedules',       [MaintenanceScheduleController::class, 'store']);
        Route::put('/api/maintenance-schedules/{maintenanceSchedule}', [MaintenanceScheduleController::class, 'update']);
        Route::delete('/api/maintenance-schedules/{maintenanceSchedule}', [MaintenanceScheduleController::class, 'destroy']);
        Route::post('/api/maintenance-schedules/{maintenanceSchedule}/toggle', [MaintenanceScheduleController::class, 'toggle']);

        Route::post('/api/topology', [TopologyController::class, 'store']);
        Route::delete('/api/topology/{networkTopology}', [TopologyController::class, 'destroy']);
    });

    Route::get('/api/dashboards', [DashboardController::class, 'index']);
    Route::post('/api/dashboards', [DashboardController::class, 'store']);
    Route::put('/api/dashboards/{customDashboard}', [DashboardController::class, 'update']);
    Route::delete('/api/dashboards/{customDashboard}', [DashboardController::class, 'destroy']);
});

Route::get('/{any}', fn() => view('app'))->where('any', '.*');
