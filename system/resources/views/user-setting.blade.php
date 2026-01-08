<!DOCTYPE html>
<html lang="en">

<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="Cache-Control" content="no-store, no-cache, must-revalidate">
  <meta http-equiv="Pragma" content="no-cache">
  <meta http-equiv="Expires" content="0">
  <title>User Settings | AgriKnows</title>
  <link rel="stylesheet" href="{{ asset('css/user-setting.css') }}" />
  </head>

<body>
  <div class="dashboard">

    <div class="container">
      <header>
        <div class="header-left">
          <div class="logo-title">
            
            <img src="{{ asset('images/LOGO.png') }}" class="agri-logo" alt="AgriKnows Logo"
              onclick="window.location.href='/welcome'">
          </div>
          <h1>AGRIKNOWS</h1>
        </div>
        <div class="header-right">
            <span id="username-display">
              {{ session('user.username', 'Guest') }}
            </span>
          <img src="{{ asset('images/profile.png') }}" class="user-profile" alt="profile">
        </div>
      </header>

      <main class="settings-container">
        <a href="{{ url('/welcome')}}" class="back-btn">← Back to Home</a>
        <h1>User Settings</h1>

        <section class="card">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
            <path fill="#000"
              d="M12 4a4 4 0 0 1 4 4a4 4 0 0 1-4 4a4 4 0 0 1-4-4a4 4 0 0 1 4-4m0 10c4.42 0 8 1.79 8 4v2H4v-2c0-2.21 3.58-4 8-4" />
          </svg>

          <div class="form-row">
            <label>Username</label>
            <input type="text" value="" id="user-username" />
          </div>
          <div class="form-row">
            <label>Email</label>
            <input type="email" value="" id="user-email" />
          </div>
        </section>

        <section class="card">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
            <path fill="#000"
              d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12c5.16-1.26 9-6.45 9-12V5zm0 4a3 3 0 0 1 3 3a3 3 0 0 1-3 3a3 3 0 0 1-3-3a3 3 0 0 1 3-3m5.13 12A9.7 9.7 0 0 1 12 20.92A9.7 9.7 0 0 1 6.87 17c-.34-.5-.63-1-.87-1.53c0-1.65 2.71-3 6-3s6 1.32 6 3c-.24.53-.53 1.03-.87 1.53" />
          </svg>

         <div class="form-row">
            <label>Kasalukuyang Password</label>
            <div class="password-input-container">
              <input type="password" value="" id="current-password" placeholder="Enter current password" />
              <span class="password-toggle" data-target="current-password">🙈</span>
            </div>
          </div>
          
          <div class="form-row">
            <label>Bagong Password</label>
            <div class="password-input-container">
              <input type="password" id="new-password" placeholder="Enter new password" />
              <span class="password-toggle" data-target="new-password">🙈</span>
            </div>
          </div>
          
          <div class="form-row">
            <label>kumpirmahin ang Password</label>
            <div class="password-input-container">
              <input type="password" id="confirm-password" placeholder="Confirm new password" />
              <span class="password-toggle" data-target="confirm-password">🙈</span>
            </div>
          </div>
          
          <button class="btn" id="save-password-btn">Save Password</button>
        </section>

        <div class="button-row">
          <button class="btn save-btn" id="save-user-info-btn">SAVE</button>
          <button class="btn logout-btn" id="logout-btn">Log Out</button>
        </div>

        </section>
        </main>
      </div>
    </div>
  </div>
  
  <script type="module" src="{{ asset('js/user-setting.js') }}"></script>
</body>

<footer>
  AgriKnows © 2025
</footer>

</html>