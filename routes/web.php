<?php

use App\Http\Controllers\PingController;
use Illuminate\Support\Facades\Route;

// API — JSON endpoints
Route::get('/api/targets',                         [PingController::class, 'apiTargets']);
Route::get('/api/history',                         [PingController::class, 'apiHistory']);
Route::get('/api/targets/{target}/chart-data',     [PingController::class, 'apiChartData']);

// Mutations
Route::post('/targets',              [PingController::class, 'store']);
Route::put('/targets/{target}',      [PingController::class, 'update']);
Route::delete('/targets/{target}',   [PingController::class, 'destroy']);
Route::post('/targets/{target}/ping',[PingController::class, 'ping'])->name('targets.ping');
Route::post('/ping-all',             [PingController::class, 'pingAll']);

// Catch-all: serve React SPA
Route::get('/{any}', fn() => view('app'))->where('any', '.*');
