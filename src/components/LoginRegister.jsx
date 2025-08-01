import React, { useState } from 'react';
import { User, Mail, Lock, Activity, Eye, EyeOff, AlertCircle, UserCheck } from 'lucide-react';

const LoginRegister = ({ onLogin, onAdminLogin, authToken }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: ''
  });
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState('');

  // Dynamic API URL detection for Codespaces
  const getApiUrl = () => {
    if (window.location.hostname.includes('app.github.dev')) {
      // We're in Codespaces, replace the port from 3000/5173 to 8000
      const backendUrl = window.location.hostname.replace('-3000', '-8000').replace('-5173', '-8000');
      return `https://${backendUrl}`;
    }
    return 'http://localhost:8000';
  };

  const API_BASE_URL = getApiUrl();

  // Role options for registration
  const roleOptions = [
    {
      value: 'wellness_tracker',
      label: 'Wellness Tracker',
      description: 'Focus on overall wellness, mental health, and lifestyle tracking'
    },
    {
      value: 'exercise_tracker',
      label: 'Exercise Tracker',
      description: 'Focus on fitness activities, workouts, and physical performance'
    }
  ];

  // Token management functions (consistent with Dashboard)
  const saveTokens = (accessToken, refreshToken) => {
    localStorage.setItem('access_token', accessToken);
    if (refreshToken) {
      localStorage.setItem('refresh_token', refreshToken);
    }
    // Keep legacy token for backwards compatibility
    localStorage.setItem('token', accessToken);
  };

  const clearTokens = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    // Check for auth token first
    if (!authToken) {
      newErrors.authToken = 'Please accept the terms and conditions first';
    }

    if (!formData.username.trim()) {
      newErrors.username = 'Username is required';
    } else if (formData.username.length < 3) {
      newErrors.username = 'Username must be at least 3 characters';
    }

    if (!isLogin) {
      if (!formData.email.trim()) {
        newErrors.email = 'Email is required';
      } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
        newErrors.email = 'Please enter a valid email';
      }

      // Role validation for registration
      if (!formData.role) {
        newErrors.role = 'Please select a tracking focus';
      }
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    if (!isLogin && formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setIsLoading(true);
    setMessage('');

    try {
      const endpoint = isLogin ? '/login' : '/register';
      const payload = isLogin 
        ? { username: formData.username, password: formData.password }
        : { username: formData.username, email: formData.email, password: formData.password, role: formData.role };

      // Create headers object with auth token
      const headers = {
        'Content-Type': 'application/json',
      };

      // Add auth token to headers - now required for both login and register
      if (authToken) {
        headers['X-Auth-Token'] = authToken;
      }
      
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        const data = await response.json();
        
        // Debug logging to see what we actually received
        console.log('Response data:', data);
        
        if (isLogin) {
          // Enhanced role detection with multiple fallbacks
          let userRole = null;
          let username = null;

          // Try multiple ways to get the role
          if (data.user && data.user.role) {
            userRole = data.user.role;
            username = data.user.username;
          } else if (data.role) {
            userRole = data.role;
            username = data.username || data.user?.username || formData.username;
          } else if (data.user_role) {
            userRole = data.user_role;
            username = data.user?.username || data.username || formData.username;
          } else {
            // Default to exercise_tracker if no role is found
            userRole = 'exercise_tracker';
            username = data.user?.username || data.username || formData.username;
          }

          // Normalize role string (trim whitespace, lowercase for comparison)
          const normalizedRole = userRole ? userRole.toString().trim().toLowerCase() : 'exercise_tracker';
          
          console.log('Role detection:', {
            originalRole: userRole,
            normalizedRole: normalizedRole,
            username: username,
            fullResponse: data
          });

          setMessage(`Welcome back, ${username}!`);
          
          // Store tokens properly (consistent with Dashboard)
          if (data.access_token) {
            saveTokens(data.access_token, data.refresh_token);
          }
          
          // Store user data with normalized role
          const userData = {
            username: username,
            role: normalizedRole,
            is_admin: normalizedRole === 'admin',
            email: data.user?.email || data.email,
            ...data.user
          };
          localStorage.setItem('user', JSON.stringify(userData));
          
          // Debug logging
          console.log('Login successful:', {
            access_token: data.access_token ? 'present' : 'missing',
            refresh_token: data.refresh_token ? 'present' : 'missing',
            user: userData,
            role: normalizedRole,
            isAdmin: normalizedRole === 'admin'
          });
          
          // Route based on user role - check for admin first
          if (normalizedRole === 'admin') {
            console.log('Routing to admin dashboard');
            // Call the onAdminLogin callback to navigate to admin dashboard
            if (onAdminLogin && typeof onAdminLogin === 'function') {
              onAdminLogin();
            } else {
              console.error('onAdminLogin callback is not available or not a function');
              setMessage('Admin login successful, but navigation failed. Please check console.');
            }
          } else {
            console.log('Routing to regular dashboard');
            // Call the onLogin callback to navigate to regular dashboard
            if (onLogin && typeof onLogin === 'function') {
              onLogin();
            } else {
              console.error('onLogin callback is not available or not a function');
              setMessage('Login successful, but navigation failed. Please check console.');
            }
          }
        } else {
          // Safe access to user data for registration
          const username = data?.user?.username || data?.username || formData.username;
          setMessage(`Welcome ${username}! Registration successful. Please sign in.`);
          
          // Clear form on successful registration
          setFormData({
            username: '',
            email: '',
            password: '',
            confirmPassword: '',
            role: ''
          });
          
          // Switch back to login mode after successful registration
          setTimeout(() => {
            setIsLogin(true);
            setMessage('');
          }, 2000);
        }
      } else {
        // Enhanced error handling with full response details
        let errorMessage;
        let responseText = '';
        
        try {
          responseText = await response.text();
          
          // Try to parse as JSON first
          let errorData;
          try {
            errorData = JSON.parse(responseText);
          } catch {
            errorData = { detail: responseText };
          }
          
          if (response.status === 401) {
            // Clear any stored tokens on auth failure
            clearTokens();
            
            if (errorData.detail && errorData.detail.includes('Auth token')) {
              errorMessage = 'Authentication token is invalid or expired. Please refresh the page and accept terms again.';
            } else if (errorData.detail && errorData.detail.includes('username or password')) {
              errorMessage = 'Invalid username or password. Please check your credentials.';
            } else {
              errorMessage = `Authentication failed: ${errorData.detail || 'Invalid credentials'}`;
            }
          } else if (response.status === 400) {
            errorMessage = errorData.detail || 'Bad request. Please check your input.';
          } else if (response.status === 404) {
            errorMessage = 'Server endpoint not found. Please check if the backend is running.';
          } else if (response.status === 500) {
            errorMessage = 'Internal server error. Please try again later.';
          } else {
            errorMessage = errorData.detail || `Request failed with status ${response.status}`;
          }
        } catch (parseError) {
          errorMessage = `Request failed with status ${response.status}. Unable to parse error response.`;
        }
        
        setMessage(errorMessage);
      }
    } catch (error) {
      let errorMessage;
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        errorMessage = 'Unable to connect to server. Please check if the backend is running.';
      } else if (error.name === 'SyntaxError' && error.message.includes('JSON')) {
        errorMessage = 'Server returned an invalid response. Please check server logs.';
      } else {
        errorMessage = `Network error: ${error.message}`;
      }
      
      setMessage(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleMode = () => {
    setIsLogin(!isLogin);
    setFormData({
      username: '',
      email: '',
      password: '',
      confirmPassword: '',
      role: ''
    });
    setErrors({});
    setMessage('');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
            <Activity className="w-8 h-8 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Activity Tracker
          </h1>
          <p className="text-gray-600">
            {isLogin ? 'Welcome back!' : 'Start your journey today'}
          </p>
          {authToken ? (
            <p className="text-xs text-green-600 mt-2">
              ✓ Terms accepted
            </p>
          ) : (
            <p className="text-xs text-red-600 mt-2">
              ⚠ Please accept terms and conditions first
            </p>
          )}
        </div>

        {/* Auth Token Error */}
        {errors.authToken && (
          <div className="mb-4 p-3 rounded-lg text-sm bg-red-50 text-red-700 border border-red-200 flex items-center">
            <AlertCircle className="w-4 h-4 mr-2" />
            {errors.authToken}
          </div>
        )}

        {/* Form */}
        <div className="space-y-6">
          {/* Username Field */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Username
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                name="username"
                value={formData.username}
                onChange={handleInputChange}
                className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-colors ${
                  errors.username ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Enter your username"
              />
            </div>
            {errors.username && (
              <p className="mt-1 text-sm text-red-600">{errors.username}</p>
            )}
          </div>

          {/* Email Field (Register only) */}
          {!isLogin && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-colors ${
                    errors.email ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="Enter your email"
                />
              </div>
              {errors.email && (
                <p className="mt-1 text-sm text-red-600">{errors.email}</p>
              )}
            </div>
          )}

          {/* Role Selection Field (Register only) */}
          {!isLogin && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <UserCheck className="w-4 h-4 inline mr-1" />
                Tracking Focus
              </label>
              <div className="space-y-3">
                {roleOptions.map((role) => (
                  <label key={role.value} className={`flex items-start space-x-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors ${
                    formData.role === role.value ? 'border-green-500 bg-green-50' : errors.role ? 'border-red-300' : 'border-gray-200'
                  }`}>
                    <input
                      type="radio"
                      name="role"
                      value={role.value}
                      checked={formData.role === role.value}
                      onChange={handleInputChange}
                      className="w-4 h-4 text-green-600 border-gray-300 focus:ring-green-500 mt-0.5"
                    />
                    <div className="flex-1">
                      <div className="font-medium text-gray-900 text-sm">{role.label}</div>
                      <div className="text-xs text-gray-600 mt-1">{role.description}</div>
                    </div>
                  </label>
                ))}
              </div>
              {errors.role && (
                <p className="mt-1 text-sm text-red-600">{errors.role}</p>
              )}
            </div>
          )}

          {/* Password Field */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type={showPassword ? 'text' : 'password'}
                name="password"
                value={formData.password}
                onChange={handleInputChange}
                className={`w-full pl-10 pr-12 py-3 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-colors ${
                  errors.password ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Enter your password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
            {errors.password && (
              <p className="mt-1 text-sm text-red-600">{errors.password}</p>
            )}
          </div>

          {/* Confirm Password Field (Register only) */}
          {!isLogin && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Confirm Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                  className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-colors ${
                    errors.confirmPassword ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="Confirm your password"
                />
              </div>
              {errors.confirmPassword && (
                <p className="mt-1 text-sm text-red-600">{errors.confirmPassword}</p>
              )}
            </div>
          )}

          {/* Submit Button */}
          <button
            onClick={handleSubmit}
            disabled={isLoading || !authToken}
            className={`w-full py-3 px-4 rounded-lg font-medium text-white transition-colors ${
              isLoading || !authToken
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-green-600 hover:bg-green-700 focus:ring-2 focus:ring-green-500 focus:ring-offset-2'
            }`}
          >
            {isLoading ? (
              <div className="flex items-center justify-center">
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                Processing...
              </div>
            ) : (
              isLogin ? 'Sign In' : 'Create Account'
            )}
          </button>
        </div>

        {/* Message Display */}
        {message && (
          <div className={`mt-4 p-3 rounded-lg text-sm ${
            message.includes('successful') || message.includes('Welcome')
              ? 'bg-green-50 text-green-700 border border-green-200'
              : 'bg-red-50 text-red-700 border border-red-200'
          }`}>
            {message}
          </div>
        )}

        {/* Toggle Mode */}
        <div className="mt-8 text-center">
          <p className="text-gray-600">
            {isLogin ? "Don't have an account?" : "Already have an account?"}
            <button
              type="button"
              onClick={toggleMode}
              className="ml-2 text-green-600 hover:text-green-700 font-medium"
            >
              {isLogin ? 'Sign up' : 'Sign in'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginRegister;