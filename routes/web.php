<?php

use App\Http\Controllers\PingController;
use Illuminate\Support\Facades\Route;

Route::get('/', [PingController::class, 'index'])->name('home');
Route::post('/targets', [PingController::class, 'store'])->name('targets.store');
Route::put('/targets/{target}', [PingController::class, 'update'])->name('targets.update');
Route::delete('/targets/{target}', [PingController::class, 'destroy'])->name('targets.destroy');
Route::post('/targets/{target}/ping', [PingController::class, 'ping'])->name('targets.ping');
Route::post('/ping-all', [PingController::class, 'pingAll'])->name('targets.pingAll');
Route::get('/history', [PingController::class, 'history'])->name('history');
