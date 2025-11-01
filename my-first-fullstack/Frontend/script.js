// Password visibility toggle
const passwordToggle = document.getElementById('passwordToggle');
const passwordInput = document.getElementById('password');

passwordToggle.addEventListener('click', () => {
  const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
  passwordInput.setAttribute('type', type);
  passwordToggle.textContent = type === 'password' ? '👁️' : '🙈';
});

// Form submission handler
const loginForm = document.getElementById('loginForm');
const loginBtn = document.getElementById('loginBtn');
const btnLoader = document.getElementById('btnLoader');
const btnText = loginBtn.querySelector('.btn-text');
const messageDiv = document.getElementById('message');

loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  // Clear previous errors and messages
  clearErrors();
  clearMessage();
  
  // Get form values
  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;
  const rememberMe = document.getElementById('rememberMe').checked;
  
  // Client-side validation
  if (!validateForm(email, password)) {
    return;
  }
  
  // Show loading state
  setLoadingState(true);
  
  try {
    // Send login request to backend
    const response = await fetch('http://localhost:5000/api/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        password,
        rememberMe
      })
    });
    
    const data = await response.json();
    
    if (response.ok) {
      // Success
      showMessage(data.message || 'Login successful!', 'success');
      
      // Store remember me preference
      if (rememberMe) {
        localStorage.setItem('rememberEmail', email);
      } else {
        localStorage.removeItem('rememberEmail');
      }
      
      // Simulate redirect after successful login
      setTimeout(() => {
        showMessage('Redirecting to dashboard...', 'success');
        // window.location.href = '/dashboard'; // Uncomment when dashboard is ready
      }, 1500);
    } else {
      // Error from server
      showMessage(data.message || 'Login failed. Please try again.', 'error');
      if (data.field) {
        showFieldError(data.field, data.message);
      }
    }
  } catch (error) {
    console.error('Login error:', error);
    showMessage('Connection error. Please check if the server is running.', 'error');
  } finally {
    setLoadingState(false);
  }
});

// Form validation
function validateForm(email, password) {
  let isValid = true;
  
  // Email validation
  if (!email) {
    showFieldError('email', 'Email or username is required');
    isValid = false;
  } else if (!isValidEmail(email) && email.length < 3) {
    showFieldError('email', 'Please enter a valid email or username (min 3 characters)');
    isValid = false;
  }
  
  // Password validation
  if (!password) {
    showFieldError('password', 'Password is required');
    isValid = false;
  } else if (password.length < 6) {
    showFieldError('password', 'Password must be at least 6 characters');
    isValid = false;
  }
  
  return isValid;
}

// Email validation helper
function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Show field error
function showFieldError(fieldName, message) {
  const field = document.getElementById(fieldName);
  const errorElement = document.getElementById(fieldName + 'Error');
  
  if (field && errorElement) {
    field.classList.add('error');
    errorElement.textContent = message;
  }
}

// Clear all errors
function clearErrors() {
  const errorElements = document.querySelectorAll('.error-message');
  const errorFields = document.querySelectorAll('.form-group input.error');
  
  errorElements.forEach(el => el.textContent = '');
  errorFields.forEach(field => field.classList.remove('error'));
}

// Show message
function showMessage(message, type = 'info') {
  messageDiv.textContent = message;
  messageDiv.className = `message ${type}`;
  messageDiv.style.display = 'block';
  
  // Auto-hide success messages
  if (type === 'success') {
    setTimeout(() => {
      messageDiv.style.display = 'none';
    }, 3000);
  }
}

// Clear message
function clearMessage() {
  messageDiv.textContent = '';
  messageDiv.className = 'message';
  messageDiv.style.display = 'none';
}

// Set loading state
function setLoadingState(isLoading) {
  if (isLoading) {
    loginBtn.disabled = true;
    btnText.style.opacity = '0';
    btnLoader.style.display = 'inline';
    loginBtn.classList.add('loading');
  } else {
    loginBtn.disabled = false;
    btnText.style.opacity = '1';
    btnLoader.style.display = 'none';
    loginBtn.classList.remove('loading');
  }
}

// Check for remembered email on page load
window.addEventListener('DOMContentLoaded', () => {
  const rememberedEmail = localStorage.getItem('rememberEmail');
  if (rememberedEmail) {
    document.getElementById('email').value = rememberedEmail;
    document.getElementById('rememberMe').checked = true;
  }
});

// Real-time validation
document.getElementById('email').addEventListener('blur', function() {
  const email = this.value.trim();
  if (email && !isValidEmail(email) && email.length < 3) {
    showFieldError('email', 'Please enter a valid email or username (min 3 characters)');
  } else {
    clearFieldError('email');
  }
});

document.getElementById('password').addEventListener('blur', function() {
  const password = this.value;
  if (password && password.length < 6) {
    showFieldError('password', 'Password must be at least 6 characters');
  } else if (password) {
    clearFieldError('password');
  }
});

function clearFieldError(fieldName) {
  const field = document.getElementById(fieldName);
  const errorElement = document.getElementById(fieldName + 'Error');
  
  if (field && errorElement) {
    field.classList.remove('error');
    errorElement.textContent = '';
  }
}