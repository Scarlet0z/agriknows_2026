<!DOCTYPE html>
<html lang="en">

<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
   <link rel="stylesheet"href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
  <title>AgriKnows Login</title>
  <link rel="stylesheet" href="{{ asset('css/login.css') }}">
  <script type="module" src="{{ asset('js/login.js') }}" defer></script>
</head>

  <body>

    <div class="left"></div>

    <div class="container">
      <div class="box form-box">

        <header>
          Mabuhay!
          <span>Welcome to AgriKnows</span>
          <br>
          <small>MAG LOG IN PARA MAG PATULOY</small>
          <h2>LOG IN</h2>
        </header>

       <form action="{{ route('login') }}" method="post" class="login-form">
          @csrf
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
          <div>
            <a href="#" id="reset" class="forget-pass" href><u>Forget Password</u></a>
          </div>

          </div>

           @if(session('error'))
              <p style="color:red;">{{ session('error') }}</p>
          @endif

      <button type="submit" id="submit">LOG IN</button>

      </form>

    </div>
    
      <p class="signup">Wala pang account?
        <a href="/register">Gumawa ng account</a>
      </p>

      <div class="authenticationBTN">
        <button id="google-login-btn">
          <img src="{{ asset('images/google.png') }}" alt="Google">
        </button>

  </div>
  </div>

</body>
</html>