<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Kreait\Firebase\Factory;

class TestController extends Controller
{
    protected $database;

    public function __construct()
    {
        $factory = (new Factory)
            ->withServiceAccount(storage_path('app/firebase_credentials.json'))
            ->withDatabaseUri(env('FIREBASE_DATABASE_URL'));

        $this->database = $factory->createDatabase();
    }

    // READ DATA
    public function showHistory()
    {
        $sensordata = $this->database
            ->getReference('sensorData')
            ->getValue();

        // If no data in Firebase, set empty array to avoid undefined variable
        if (!$sensordata) {
            $sensordata = [];
        }
        // return $sensordata;
        return view('welcome', compact('sensordata'));
    }

}
