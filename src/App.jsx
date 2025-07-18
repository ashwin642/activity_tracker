import React, { useState, useEffect } from 'react';
import LoginRegister from './components/LoginRegister';
import Dashboard from './components/Dashboard';
import TermsAndConditions from './components/TermsAndConditions';
import './App.css';

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [hasAcceptedTerms, setHasAcceptedTerms] = useState(false);
  const [authToken, setAuthToken] = useState(null);

  useEffect(() => {
    // Don't check for previously accepted terms - always require acceptance
    // Only check if user is already logged in
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user');
    
    if (token && user) {
      setIsLoggedIn(true);
    }
    
    setIsLoading(false);
  }, []);

  const handleTermsAccepted = (token) => {
    setHasAcceptedTerms(true);
    setAuthToken(token);
    // Don't save to localStorage anymore - let it be session-only
  };

  const handleLogin = () => {
    setIsLoggedIn(true);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setIsLoggedIn(false);
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
        <Dashboard onLogout={handleLogout} />
      ) : (
        <LoginRegister onLogin={handleLogin} authToken={authToken} />
      )}
    </div>
  );
}

export default App;