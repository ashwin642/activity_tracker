import React, { useState, useEffect } from 'react';
import LoginRegister from './components/LoginRegister';
import Dashboard from './components/Dashboard';
import AdminDashboard from './components/AdminDashboard';
import TermsAndConditions from './components/TermsAndConditions';
import './App.css';

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [hasAcceptedTerms, setHasAcceptedTerms] = useState(false);
  const [authToken, setAuthToken] = useState(null);
  const [userRole, setUserRole] = useState(null);

  useEffect(() => {
    // Don't check for previously accepted terms - always require acceptance
    // Only check if user is already logged in
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user');
    
    if (token && user) {
      try {
        const userData = JSON.parse(user);
        setIsLoggedIn(true);
        setUserRole(userData.role);
        setHasAcceptedTerms(true); // If they're already logged in, assume terms were accepted
        console.log('Auto-login detected:', userData);
      } catch (error) {
        console.error('Error parsing stored user data:', error);
        // If user data is corrupted, clear it
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
      }
    }
    
    setIsLoading(false);
  }, []);

  const handleTermsAccepted = (token) => {
    console.log('Terms accepted with token:', token ? 'present' : 'missing');
    setHasAcceptedTerms(true);
    setAuthToken(token);
    // Don't save to localStorage anymore - let it be session-only
  };

  // Handle regular user login
  const handleUserLogin = () => {
    console.log('Regular user login successful');
    
    // Get user data from localStorage (set by LoginRegister component)
    const userData = localStorage.getItem('user');
    if (userData) {
      try {
        const parsedUser = JSON.parse(userData);
        console.log('User data loaded:', parsedUser);
        setIsLoggedIn(true);
        setUserRole(parsedUser.role || 'subuser');
      } catch (error) {
        console.error('Error parsing user data on login:', error);
        setIsLoggedIn(true);
        setUserRole('subuser'); // Default role
      }
    } else {
      console.log('No user data found, setting default role');
      setIsLoggedIn(true);
      setUserRole('subuser'); // Default role
    }
  };

  // Handle admin user login
  const handleAdminLogin = () => {
    console.log('Admin user login successful');
    
    // Get user data from localStorage (set by LoginRegister component)
    const userData = localStorage.getItem('user');
    if (userData) {
      try {
        const parsedUser = JSON.parse(userData);
        console.log('Admin user data loaded:', parsedUser);
        setIsLoggedIn(true);
        setUserRole('admin');
      } catch (error) {
        console.error('Error parsing admin user data on login:', error);
        setIsLoggedIn(true);
        setUserRole('admin'); // Force admin role
      }
    } else {
      console.log('No user data found for admin, setting admin role');
      setIsLoggedIn(true);
      setUserRole('admin'); // Force admin role
    }
  };

  // Alternative single callback approach (if you prefer this)
  const handleLoginWithRole = (role) => {
    console.log('Login successful with role:', role);
    
    // Get user data from localStorage (set by LoginRegister component)
    const userData = localStorage.getItem('user');
    if (userData) {
      try {
        const parsedUser = JSON.parse(userData);
        console.log('User data loaded:', parsedUser);
        setIsLoggedIn(true);
        setUserRole(parsedUser.role || role || 'subuser');
      } catch (error) {
        console.error('Error parsing user data on login:', error);
        setIsLoggedIn(true);
        setUserRole(role || 'subuser');
      }
    } else {
      console.log('No user data found, using provided role:', role);
      setIsLoggedIn(true);
      setUserRole(role || 'subuser');
    }
  };

  const handleLogout = () => {
    console.log('Logging out user');
    
    // Clear all tokens and user data
    localStorage.removeItem('token');
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
    
    // Reset state
    setIsLoggedIn(false);
    setUserRole(null);
    // Reset terms acceptance on logout so it's required again
    setHasAcceptedTerms(false);
    setAuthToken(null);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-green-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!hasAcceptedTerms) {
    return <TermsAndConditions onAccept={handleTermsAccepted} />;
  }

  return (
    <div className="App">
      {isLoggedIn ? (
        userRole === 'admin' ? (
          <AdminDashboard onLogout={handleLogout} />
        ) : (
          <Dashboard onLogout={handleLogout} />
        )
      ) : (
        <LoginRegister 
          onLogin={handleUserLogin}
          onAdminLogin={handleAdminLogin}
          authToken={authToken}
        />
      )}
    </div>
  );
}

export default App;