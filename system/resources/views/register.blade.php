<!DOCTYPE html>
<html lang="en">

<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>AgriKnows Sign up</title>
  <link rel="stylesheet" href="{{ asset('css/register.css') }}">
</head>

<body>

  <div class="left"></div>

  <div class="container">
    <div class="box form-box">

      <header>
        Mabuhay!
        <span>Welcome to AgriKnows</span>
        <br>
        <small>GUMAWA NG ACCOUNT PARA MAG PATULOY</small>
        <h2>Sign Up</h2>
      </header>

      <!--button and text field-->
      <form action="{{ url('/register') }}" method="post">
        @csrf
        @if ($errors->any())
          <p style="color:red;">{{ $errors->first() }}</p>
        @endif

        @if(session('error'))
          <p style="color:red;">{{ session('error') }}</p>
        @endif

        @if(session('success'))
          <p style="color:green;">{{ session('success') }}</p>
        @endif

        <div class="field input">
            <label for="username">Username</label>
            <input type="text" name="username" id="username" autocomplete="username" required>
        </div>

        <div class="field input">
            <label for="email">Email</label>
            <input type="email" name="email" id="email" autocomplete="email" required>
        </div>

            <div class="field input password-field">
              <label for="password">Password</label>
              <input type="password" name="password" id="password" required>
              <img 
              src="{{ asset('images/show.png') }}" 
              id="togglePassword" 
              alt="Show/Hide Password"
              data-show="{{ asset('images/show.png') }}"
              data-hide="{{ asset('images/hide.png') }}" >
</div>

        <button id="submit">SIGN UP</button>
    </form>
    </div>
    <p class="signup">May Account na?
      <a href="/login">Log In</a>
    </p>
    <div class="authenticationBTN">
      <button id="google-login-btn" type="button">
        <img src="{{ asset('images/google.png') }}" alt="Google">
      </button>
    </div>
  </div>
  </div>
  </div>
  </div>

   <script type="module" src="{{ asset('js/register.js') }}" defer></script>

</body>

</html>