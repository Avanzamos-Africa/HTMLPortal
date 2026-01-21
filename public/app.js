// API Configuration
const API_BASE = 'http://localhost:3000/api';

// Session management
function getSessionId() {
  return localStorage.getItem('sessionId');
}

function setSessionId(sessionId) {
  localStorage.setItem('sessionId', sessionId);
}

function clearSession() {
  localStorage.removeItem('sessionId');
  localStorage.removeItem('user');
}

function getUser() {
  const userStr = localStorage.getItem('user');
  return userStr ? JSON.parse(userStr) : null;
}

function setUser(user) {
  localStorage.setItem('user', JSON.stringify(user));
}

// API calls with session
async function apiCall(endpoint, options = {}) {
  const sessionId = getSessionId();
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers
  };
  
  if (sessionId) {
    headers['Authorization'] = `Bearer ${sessionId}`;
  }
  
  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers
  });
  
  const data = await response.json();
  
  if (!response.ok) {
    if (response.status === 401) {
      clearSession();
      window.location.href = '/';
    }
    throw new Error(data.message || 'Request failed');
  }
  
  return data;
}

// Auth functions
function showError(message) {
  const errorEl = document.getElementById('error-message');
  if (errorEl) {
    errorEl.textContent = message;
    errorEl.classList.add('show');
    setTimeout(() => {
      errorEl.classList.remove('show');
    }, 5000);
  }
}

function toggleAuthForm(event) {
  event.preventDefault();
  const loginForm = document.getElementById('login-form');
  const registerForm = document.getElementById('register-form');
  const errorMessage = document.getElementById('error-message');
  
  if (loginForm.style.display === 'none') {
    loginForm.style.display = 'block';
    registerForm.style.display = 'none';
  } else {
    loginForm.style.display = 'none';
    registerForm.style.display = 'block';
  }
  
  errorMessage.classList.remove('show');
}

async function handleLogin(event) {
  event.preventDefault();
  
  const username = document.getElementById('login-username').value.trim();
  const password = document.getElementById('login-password').value;
  
  try {
    const data = await apiCall('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password })
    });
    
    if (data.success) {
      setSessionId(data.sessionId);
      setUser(data.user);
      window.location.href = '/dashboard.html';
    }
  } catch (err) {
    showError(err.message || 'Login failed');
  }
}

async function handleRegister(event) {
  event.preventDefault();
  
  const username = document.getElementById('register-username').value.trim();
  const password = document.getElementById('register-password').value;
  
  try {
    const data = await apiCall('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ username, password })
    });
    
    if (data.success) {
      setSessionId(data.sessionId);
      setUser(data.user);
      window.location.href = '/dashboard.html';
    }
  } catch (err) {
    showError(err.message || 'Registration failed');
  }
}

async function handleLogout() {
  try {
    await apiCall('/auth/logout', { method: 'POST' });
  } catch (err) {
    console.error('Logout error:', err);
  } finally {
    clearSession();
    window.location.href = '/';
  }
}

// Check if user is authenticated on page load
if (window.location.pathname === '/' || window.location.pathname === '/index.html') {
  if (getSessionId()) {
    window.location.href = '/dashboard.html';
  }
}
