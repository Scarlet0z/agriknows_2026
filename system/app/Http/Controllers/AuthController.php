<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Kreait\Firebase\Factory;
use Illuminate\Support\Facades\Hash;

class AuthController extends Controller
{
    protected $database;

    public function __construct()
    {
        $factory = (new Factory)
            ->withServiceAccount(storage_path('app/firebase_credentials.json'))
            ->withDatabaseUri(env('FIREBASE_DATABASE_URL'));

        $this->database = $factory->createDatabase();
    }

    // Show registration form (optional if using separate route)
    public function showRegisterForm()
    {
        return view('register'); // your Blade file
    }

    // Handle registration
    public function register(Request $request)
    {
        // Validate input
        $request->validate([
            'username' => 'required|string|max:50',
            'email' => 'required|email',
            'password' => 'required|min:6',
        ]);

        // Check if email already exists
        $existingUsers = $this->database->getReference('users')
            ->orderByChild('email')
            ->equalTo($request->email)
            ->getValue();

        if ($existingUsers) {
            return back()->with('error', 'Email already registered!');
        }

        // Prepare data
        $userData = [
            'username' => $request->username,
            'email' => $request->email,
            'password' => Hash::make($request->password), // hashed password
            'created_at' => now()->toDateTimeString(),
        ];

        // Save to Firebase under "users" node
        $this->database->getReference('users')->push($userData);

        return redirect('/login')->with('success', 'Account created successfully!');
    }

    public function login(Request $request)
    {
        $request->validate([
            'email' => 'required|email',
            'password' => 'required',
        ]);

        $users = $this->database->getReference('users')
            ->orderByChild('email')
            ->equalTo($request->email)
            ->getValue();

        if ($users) {
            $user = reset($users); // get the first match

            if (Hash::check($request->password, $user['password'])) {
                // Login success
                session()->put('user', [
                    'id' => key($users),
                    'username' => $user['username'],
                    'email' => $user['email'],
                ]);
                return redirect('/welcome');
            }
        }

        // Login failed
        return back()->with('error', 'Invalid email or password!');
    }

    public function logout()
    {
        Session::forget('user');
        return redirect('/login');
    }
}
