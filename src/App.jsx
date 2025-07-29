import React, { useState, useEffect } from 'react';
import LoginRegister from './components/LoginRegister';
import Dashboard from './components/Dashboard';
import AdminDashboard from './components/AdminDashboard';
import WellnessDashboard from './components/WellnessDashboard';
import TermsAndConditions from './components/TermsAndConditions';
import './App.css';

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [hasAcceptedTerms, setHasAcceptedTerms] = useState(false);
  const [authToken, setAuthToken] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [user, setUser] = useState(null); // Add user state to track full user data

  useEffect(() => {
    // Don't check for previously accepted terms - always require acceptance
    // Only check if user is already logged in
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    
    if (token && userData) {
      try {
        const parsedUser = JSON.parse(userData);
        setIsLoggedIn(true);
        setUser(parsedUser); // Store full user data
        setUserRole(parsedUser.role);
        setHasAcceptedTerms(true); // If they're already logged in, assume terms were accepted
        console.log('Auto-login detected:', parsedUser);
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
        setUser(parsedUser); // Store full user data
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
        setUser(parsedUser); // Store full user data
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
        setUser(parsedUser); // Store full user data
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
    setUser(null);
    setUserRole(null);
    // Reset terms acceptance on logout so it's required again
    setHasAcceptedTerms(false);
    setAuthToken(null);
  };

  // Function to render the appropriate dashboard based on user role and permissions
  const renderDashboard = () => {
    console.log('Rendering dashboard for user:', user);
    console.log('User role:', userRole);
    
    // Check for admin role first
    if (userRole === 'admin') {
      return <AdminDashboard onLogout={handleLogout} />;
    }
    
    // Check if user has wellness_tracker in their roles array
    if (user && user.roles && user.roles.includes('wellness_tracker')) {
      return <WellnessDashboard user={user} onLogout={handleLogout} />;
    }
    
    // Check for specific wellness_tracker role
    if (userRole === 'wellness_tracker') {
      return <WellnessDashboard user={user} onLogout={handleLogout} />;
    }
    
    // Check for exercise_tracker role
    if (userRole === 'exercise_tracker') {
      return <Dashboard onLogout={handleLogout} />;
    }
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
        renderDashboard()
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