import React, { useState } from 'react';
import { Shield, CheckCircle, Activity, ScrollText, Clock, Users, Lock } from 'lucide-react';

const TermsAndConditions = ({ onAccept }) => {
  const [hasScrolled, setHasScrolled] = useState(false);
  const [isChecked, setIsChecked] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleScroll = (e) => {
    const { scrollTop, scrollHeight, clientHeight } = e.target;
    // Check if scrolled to bottom (with small tolerance)
    if (scrollTop + clientHeight >= scrollHeight - 10) {
      setHasScrolled(true);
    }
  };

  const handleAccept = async () => {
    if (!isChecked || !hasScrolled) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/terms/agree', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          acceptedAt: new Date().toISOString(),
          userAgent: navigator.userAgent,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.token) {
        onAccept(data.token);
      } else {
        throw new Error('No token received from server');
      }
    } catch (err) {
      setError(err.message || 'Failed to accept terms. Please try again.');
      console.error('Error accepting terms:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl p-8 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
            <Activity className="w-8 h-8 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Activity Tracker
          </h1>
          <p className="text-gray-600">
            Please review and accept our Terms and Conditions to continue
          </p>
        </div>

        {/* Terms Content */}
        <div 
          className="flex-1 overflow-y-auto border border-gray-200 rounded-lg p-6 mb-6 bg-gray-50"
          onScroll={handleScroll}
        >
          <div className="space-y-6">
            <div className="flex items-start space-x-3">
              <ScrollText className="w-6 h-6 text-green-600 mt-1 flex-shrink-0" />
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Terms of Service</h3>
                <p className="text-gray-600 text-sm leading-relaxed">
                  Welcome to Activity Tracker! By using our application, you agree to be bound by these Terms of Service. 
                  This application is designed to help you track your daily activities and maintain a healthy lifestyle.
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <Users className="w-6 h-6 text-blue-600 mt-1 flex-shrink-0" />
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">User Responsibilities</h3>
                <p className="text-gray-600 text-sm leading-relaxed mb-2">
                  You agree to:
                </p>
                <ul className="text-gray-600 text-sm space-y-1 ml-4">
                  <li>• Provide accurate and truthful information when registering</li>
                  <li>• Use the application for personal activity tracking purposes only</li>
                  <li>• Not share your account credentials with others</li>
                  <li>• Respect the privacy and data of other users</li>
                  <li>• Not use the application for any illegal or harmful activities</li>
                </ul>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <Lock className="w-6 h-6 text-purple-600 mt-1 flex-shrink-0" />
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Privacy Policy</h3>
                <p className="text-gray-600 text-sm leading-relaxed mb-2">
                  Your privacy is important to us. We collect and use your information to:
                </p>
                <ul className="text-gray-600 text-sm space-y-1 ml-4">
                  <li>• Provide and improve our activity tracking services</li>
                  <li>• Store your activity data securely</li>
                  <li>• Generate personalized statistics and insights</li>
                  <li>• Communicate important updates about the service</li>
                </ul>
                <p className="text-gray-600 text-sm leading-relaxed mt-2">
                  We do not sell, trade, or share your personal information with third parties without your consent.
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <Shield className="w-6 h-6 text-red-600 mt-1 flex-shrink-0" />
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Data Security</h3>
                <p className="text-gray-600 text-sm leading-relaxed">
                  We implement appropriate security measures to protect your personal information against unauthorized 
                  access, alteration, disclosure, or destruction. However, no method of transmission over the internet 
                  is 100% secure, and we cannot guarantee absolute security.
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <Clock className="w-6 h-6 text-yellow-600 mt-1 flex-shrink-0" />
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Service Availability</h3>
                <p className="text-gray-600 text-sm leading-relaxed">
                  We strive to provide continuous service availability, but we do not guarantee uninterrupted access. 
                  The service may be temporarily unavailable due to maintenance, updates, or technical issues. 
                  We reserve the right to modify or discontinue the service at any time.
                </p>
              </div>
            </div>

            <div className="bg-white border border-green-200 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Limitation of Liability</h3>
              <p className="text-gray-600 text-sm leading-relaxed">
                Activity Tracker is provided "as is" without any warranties. We are not liable for any damages 
                arising from the use of our application. This includes but is not limited to data loss, 
                service interruptions, or any other issues that may occur.
              </p>
            </div>

            <div className="bg-white border border-blue-200 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Changes to Terms</h3>
              <p className="text-gray-600 text-sm leading-relaxed">
                We reserve the right to modify these Terms of Service at any time. Changes will be effective 
                immediately upon posting. Your continued use of the application after changes are posted 
                constitutes acceptance of the new terms.
              </p>
            </div>

            <div className="bg-gray-100 border border-gray-300 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Contact Information</h3>
              <p className="text-gray-600 text-sm leading-relaxed">
                If you have any questions about these Terms of Service or our Privacy Policy, 
                please contact us at support@activitytracker.com. We are committed to addressing 
                your concerns and providing excellent customer service.
              </p>
            </div>

            <div className="text-center py-4">
              <p className="text-gray-500 text-sm">
                Last updated: {new Date().toLocaleDateString()}
              </p>
            </div>
          </div>
        </div>

        {/* Acceptance Section */}
        <div className="space-y-4">
          <div className="flex items-center space-x-3">
            <input
              type="checkbox"
              id="accept-terms"
              checked={isChecked}
              onChange={(e) => setIsChecked(e.target.checked)}
              className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
            />
            <label htmlFor="accept-terms" className="text-sm text-gray-700">
              I have read and agree to the Terms of Service and Privacy Policy
            </label>
          </div>

          {!hasScrolled && (
            <p className="text-sm text-amber-600 flex items-center">
              <Clock className="w-4 h-4 mr-1" />
              Please scroll to the bottom of the terms to continue
            </p>
          )}

          {error && (
            <p className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">
              {error}
            </p>
          )}

          <button
            onClick={handleAccept}
            disabled={!isChecked || !hasScrolled || isLoading}
            className={`w-full py-3 px-4 rounded-lg font-medium text-white transition-colors flex items-center justify-center ${
              isChecked && hasScrolled && !isLoading
                ? 'bg-green-600 hover:bg-green-700 focus:ring-2 focus:ring-green-500 focus:ring-offset-2'
                : 'bg-gray-400 cursor-not-allowed'
            }`}
          >
            {isLoading ? (
              <>
                <div className="w-5 h-5 mr-2 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Processing...
              </>
            ) : (
              <>
                <CheckCircle className="w-5 h-5 mr-2" />
                Accept and Continue
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default TermsAndConditions;