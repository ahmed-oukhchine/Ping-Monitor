<?php

use App\Http\Controllers\GroupController;
use App\Http\Controllers\LoginController;
use App\Http\Controllers\PingController;
use App\Http\Controllers\UserController;
use App\Http\Middleware\EnsureAdmin;
use Illuminate\Support\Facades\Route;

// Public auth routes
Route::post('/login',  [LoginController::class, 'store']);
Route::post('/logout', [LoginController::class, 'destroy'])->middleware('auth');

// All routes below require authentication
Route::middleware('auth')->group(function () {
    Route::get('/api/user',                        [LoginController::class, 'show']);
    Route::get('/api/targets',                     [PingController::class, 'apiTargets']);
    Route::get('/api/history',                     [PingController::class, 'apiHistory']);
    Route::get('/api/history/export',              [PingController::class, 'exportCsv']);
    Route::get('/api/incidents',                   [PingController::class, 'apiIncidents']);
    Route::get('/api/targets/{target}/chart-data', [PingController::class, 'apiChartData']);
    Route::get('/api/groups',                      [GroupController::class, 'index']);

    Route::post('/targets/{target}/ping', [PingController::class, 'ping'])->name('targets.ping');
    Route::post('/ping-all',              [PingController::class, 'pingAll']);

    Route::get('/api/users', [UserController::class, 'index']);
    Route::put('/api/profile/password', [UserController::class, 'updateOwnPassword']);

    // Admin-only: CRUD on targets, groups, and users
    Route::middleware(EnsureAdmin::class)->group(function () {
        Route::post('/api/users',                        [UserController::class, 'store']);
        Route::put('/api/users/{user}/password',         [UserController::class, 'changePassword']);
        Route::delete('/api/users/{user}',               [UserController::class, 'destroy']);
        Route::post('/targets',                   [PingController::class, 'store']);
        Route::put('/targets/{target}',           [PingController::class, 'update']);
        Route::delete('/targets/{target}',        [PingController::class, 'destroy']);
        Route::post('/targets/{target}/pause',    [PingController::class, 'pause']);
        Route::post('/targets/{target}/resume',   [PingController::class, 'resume']);

        Route::post('/api/groups',           [GroupController::class, 'store']);
        Route::put('/api/groups/{group}',    [GroupController::class, 'update']);
        Route::delete('/api/groups/{group}', [GroupController::class, 'destroy']);
    });
});

// Catch-all: serve React SPA
Route::get('/{any}', fn() => view('app'))->where('any', '.*');
