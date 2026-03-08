<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Kreait\Firebase\Factory;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Session;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Http;
use Throwable;

class AuthController extends Controller
{
    protected $database;

    public function __construct()
    {
        $this->database = null;
    }

    private function database()
    {
        if ($this->database !== null) {
            return $this->database;
        }

        $factory = (new Factory)
            ->withServiceAccount(storage_path('app/firebase_credentials.json'))
            ->withDatabaseUri(env('FIREBASE_DATABASE_URL'));

        $this->database = $factory->createDatabase();

        return $this->database;
    }

    // Show registration form (optional if using separate route)
    public function showRegisterForm()
    {
        return view('register'); // your Blade file
    }

    // Handle registration
    public function register(Request $request)
    {
        try {
            // Validate input
            $request->validate([
                'username' => 'required|string|max:50',
                'email' => 'required|email',
                'password' => 'required|min:6',
            ]);

            // Check if email already exists
            $users = $this->database()->getReference('users')->getValue() ?? [];

            $emailExists = false;
            foreach ($users as $user) {
                if (is_array($user) && ($user['email'] ?? null) === $request->email) {
                    $emailExists = true;
                    break;
                }
            }

            if ($emailExists) {
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
            $this->database()->getReference('users')->push($userData);

            return redirect('/login')->with('success', 'Account created successfully!');
        } catch (Throwable $e) {
            Log::error('Firebase register error', ['error' => $e->getMessage()]);

            return back()->with('error', 'Firebase authentication service is currently unavailable. Please check Firebase credentials and try again.');
        }
    }

    public function login(Request $request)
    {
        try {
            $request->validate([
                'email' => 'required|email',
                'password' => 'required',
            ]);

            $users = $this->database()->getReference('users')->getValue() ?? [];

            $matchedUserId = null;
            $matchedUser = null;

            foreach ($users as $id => $user) {
                if (is_array($user) && ($user['email'] ?? null) === $request->email) {
                    $matchedUserId = $id;
                    $matchedUser = $user;
                    break;
                }
            }

            if ($matchedUser && isset($matchedUser['password']) && Hash::check($request->password, $matchedUser['password'])) {
                // Login success
                session()->put('user', [
                    'id' => $matchedUserId,
                    'username' => $matchedUser['username'] ?? explode('@', $matchedUser['email'])[0],
                    'email' => $matchedUser['email'],
                ]);

                return redirect('/welcome');
            }

            // Login failed
            return back()->with('error', 'Invalid email or password!');
        } catch (Throwable $e) {
            Log::error('Firebase login error', ['error' => $e->getMessage()]);

            return back()->with('error', 'Firebase authentication service is currently unavailable. Please check Firebase credentials and try again.');
        }
    }

    public function firebaseLogin(Request $request)
    {
        $request->validate([
            'idToken' => 'required|string',
        ]);

        try {
            $apiKey = config('services.firebase.api_key');

            if (!$apiKey) {
                return response()->json([
                    'ok' => false,
                    'message' => 'Firebase API key is not configured.',
                ], 500);
            }

            $verifyResponse = Http::post(
                "https://identitytoolkit.googleapis.com/v1/accounts:lookup?key={$apiKey}",
                ['idToken' => $request->idToken],
            );

            if ($verifyResponse->failed()) {
                Log::error('Firebase REST verify failed', ['body' => $verifyResponse->body()]);

                return response()->json([
                    'ok' => false,
                    'message' => 'Invalid Firebase token.',
                ], 401);
            }

            $payload = $verifyResponse->json();
            $firebaseUser = $payload['users'][0] ?? null;

            if (!is_array($firebaseUser)) {
                return response()->json([
                    'ok' => false,
                    'message' => 'Unable to resolve Firebase user.',
                ], 401);
            }

            $uid = $firebaseUser['localId'] ?? null;
            $email = $firebaseUser['email'] ?? null;
            $name = $firebaseUser['displayName']
                ?? $request->input('name')
                ?? ($email ? explode('@', $email)[0] : 'User');

            if (!$uid || !$email) {
                return response()->json([
                    'ok' => false,
                    'message' => 'Invalid Firebase token payload.',
                ], 422);
            }

            session()->put('user', [
                'id' => $uid,
                'username' => $name,
                'email' => $email,
            ]);

            return response()->json([
                'ok' => true,
                'redirect' => '/welcome',
            ]);
        } catch (Throwable $e) {
            Log::error('Firebase social login error', ['error' => $e->getMessage()]);

            return response()->json([
                'ok' => false,
                'message' => 'Unable to verify Firebase login. Please check Firebase Admin credentials.',
            ], 500);
        }
    }

    public function logout()
    {
        Session::forget('user');
        return redirect('/login');
    }
}
