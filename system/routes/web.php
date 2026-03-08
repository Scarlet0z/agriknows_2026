<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\AuthController;

Route::get('/', function () {
    return view('login');
});
Route::get('/login', function () {
    return view('login');
});
Route::post('/login', [AuthController::class, 'login'])->name('login');
Route::post('/auth/firebase-login', [AuthController::class, 'firebaseLogin'])->name('firebase.login');


Route::get('/register', function () {
    return view('register');
});
Route::post('/register', [AuthController::class, 'register']);


Route::get('/user-setting', function () {
    if (!session()->has('user')) {
        return redirect('/login');
    }

    return view('user-setting');
})->name('user.setting');

Route::get('/get-user', function () {
    return response()->json(session('user'));
});

Route::get('/welcome', function () {
    if (!session()->has('user')) {
        return redirect('/login');
    }

    return view('welcome');
})->name('welcome');
// Logout
Route::get('/logout', [AuthController::class, 'logout']);
