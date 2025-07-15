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
    // Check if user has accepted terms
    const termsAccepted = localStorage.getItem('termsAccepted');
    const storedAuthToken = localStorage.getItem('authToken');
    
    if (termsAccepted && storedAuthToken) {
      setHasAcceptedTerms(true);
      setAuthToken(storedAuthToken);
    }
    
    // Check if user is already logged in
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user');
    
    if (token && user && termsAccepted) {
      setIsLoggedIn(true);
    }
    
    setIsLoading(false);
  }, []);

  const handleTermsAccepted = (token) => {
    setHasAcceptedTerms(true);
    setAuthToken(token);
    localStorage.setItem('termsAccepted', 'true');
    localStorage.setItem('authToken', token);
  };

  const handleLogin = () => {
    setIsLoggedIn(true);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setIsLoggedIn(false);
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