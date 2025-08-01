import React, { useState, useEffect } from 'react';
import { 
  Activity, 
  Plus, 
  Calendar, 
  Clock, 
  Target, 
  TrendingUp, 
  LogOut,
  Trash2,
  BarChart3,
  Search,
  Zap,
  Shield,
  AlertTriangle,
  Edit
} from 'lucide-react';

const Dashboard = ({ onLogout }) => {
  const [user, setUser] = useState(null);
  const [activities, setActivities] = useState([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [editingActivity, setEditingActivity] = useState(null);
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [roleCheckLoading, setRoleCheckLoading] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);
  const [stats, setStats] = useState({
    totalActivities: 0,
    totalDuration: 0,
    totalCalories: 0,
    avgDuration: 0,
    streak: 0
  });

  // Helper function to get current datetime-local string without timezone conversion
  const getCurrentDateTimeLocal = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const day = now.getDate().toString().padStart(2, '0');
    const hours = now.getHours().toString().padStart(2, '0');
    const minutes = now.getMinutes().toString().padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  // Helper function to convert datetime-local string to ISO without timezone conversion
  const dateTimeLocalToISO = (dateTimeLocal) => {
    if (!dateTimeLocal) return null;
    
    try {
      // Parse the datetime-local string components
      const match = dateTimeLocal.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/);
      if (match) {
        const [, year, month, day, hours, minutes] = match;
        // Create ISO string directly without timezone conversion
        return `${year}-${month}-${day}T${hours}:${minutes}:00.000Z`;
      }
      
      return null;
    } catch (error) {
      console.error('Error converting datetime-local to ISO:', error);
      return null;
    }
  };

  // Helper function to format date for display using the same method as creation
  const formatDateForDisplay = (isoString) => {
    if (!isoString) return 'No date';
    
    try {
      // Extract date and time components directly from ISO string to avoid timezone conversion
      const dateMatch = isoString.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
      if (dateMatch) {
        const [, year, month, day, hours, minutes] = dateMatch;
        
        // Create date object for formatting the date part
        const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
        const dateStr = date.toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric'
        });
        
        // Format time in 12-hour format
        const hour24 = parseInt(hours);
        const hour12 = hour24 % 12 || 12;
        const ampm = hour24 >= 12 ? 'PM' : 'AM';
        const timeStr = `${hour12}:${minutes} ${ampm}`;
        
        return `${dateStr}, ${timeStr}`;
      }
      
      // Fallback if regex doesn't match
      return 'Invalid date format';
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'Invalid date';
    }
  };

  // Helper function to extract just the date part for display
  const extractDateFromISO = (isoString) => {
    if (!isoString) return 'No date';
    
    try {
      // Extract date portion directly from ISO string to avoid timezone conversion
      const dateMatch = isoString.match(/^(\d{4})-(\d{2})-(\d{2})/);
      if (dateMatch) {
        const [, year, month, day] = dateMatch;
        const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
        return date.toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric'
        });
      }
      
      return 'No date';
    } catch (error) {
      return 'No date';
    }
  };

  // Helper function to extract just the time part for display
  const extractTimeFromISO = (isoString) => {
    if (!isoString) return '';
    
    try {
      // Extract the time portion directly from the ISO string to avoid timezone conversion
      const timeMatch = isoString.match(/T(\d{2}):(\d{2})/);
      if (timeMatch) {
        const [, hours, minutes] = timeMatch;
        const hour24 = parseInt(hours);
        const hour12 = hour24 % 12 || 12;
        const ampm = hour24 >= 12 ? 'PM' : 'AM';
        return `${hour12}:${minutes} ${ampm}`;
      }
      
      return '';
    } catch (error) {
      return '';
    }
  };

  const [newActivity, setNewActivity] = useState({
    activity_name: '',
    duration: '',
    calories_burned: '',
    notes: '',
    date: getCurrentDateTimeLocal() // Use timezone-safe current datetime
  });
  const [editActivity, setEditActivity] = useState({
    activity_name: '',
    duration: '',
    calories_burned: '',
    notes: '',
    date: ''
  });

  // Dynamic API URL detection for Codespaces
  const getApiUrl = () => {
    if (window.location.hostname.includes('app.github.dev')) {
      const backendUrl = window.location.hostname.replace('-3000', '-8000').replace('-5173', '-8000');
      return `https://${backendUrl}`;
    }
    return 'http://localhost:8000';
  };

  const API_BASE_URL = getApiUrl();

  // Token management functions
  const getStoredTokens = () => {
    const accessToken = localStorage.getItem('access_token');
    const refreshToken = localStorage.getItem('refresh_token');
    return { accessToken, refreshToken };
  };

  const saveTokens = (accessToken, refreshToken) => {
    localStorage.setItem('access_token', accessToken);
    if (refreshToken) {
      localStorage.setItem('refresh_token', refreshToken);
    }
  };

  const clearTokens = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('token'); // Legacy token
  };

  // Check if user has required role
  const checkUserRole = (userData) => {
    console.log('Checking user role:', userData);
    
    // Check if user has the exercise_tracker role
    if (userData && userData.role === 'exercise_tracker') {
      return true;
    }
    
    // Also check if roles is an array (in case of multiple roles)
    if (userData && Array.isArray(userData.roles)) {
      return userData.roles.includes('exercise_tracker');
    }
    
    return false;
  };

  // Refresh access token using refresh token
  const refreshAccessToken = async () => {
    const { refreshToken } = getStoredTokens();
    
    if (!refreshToken) {
      throw new Error('No refresh token available');
    }

    try {
      const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refresh_token: refreshToken })
      });

      if (response.ok) {
        const data = await response.json();
        saveTokens(data.access_token, data.refresh_token);
        return data.access_token;
      } else {
        throw new Error('Failed to refresh token');
      }
    } catch (error) {
      console.error('Error refreshing token:', error);
      handleLogout();
      throw error;
    }
  };

  // Enhanced fetch with automatic token refresh
  const authenticatedFetch = async (url, options = {}) => {
    const { accessToken } = getStoredTokens();
    
    if (!accessToken) {
      handleLogout();
      throw new Error('No access token available');
    }

    // Add authorization header
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
      'Authorization': `Bearer ${accessToken}`
    };

    try {
      const response = await fetch(url, {
        ...options,
        headers
      });

      // If token is expired, try to refresh
      if (response.status === 401) {
        console.log('Access token expired, attempting to refresh...');
        try {
          const newAccessToken = await refreshAccessToken();
          
          // Retry the original request with new token
          return await fetch(url, {
            ...options,
            headers: {
              ...options.headers,
              'Authorization': `Bearer ${newAccessToken}`
            }
          });
        } catch (refreshError) {
          handleLogout();
          throw refreshError;
        }
      }

      return response;
    } catch (error) {
      console.error('Authenticated fetch error:', error);
      throw error;
    }
  };

  // Fetch current user profile from API to get latest role information
  const fetchUserProfile = async () => {
    try {
      const response = await authenticatedFetch(`${API_BASE_URL}/auth/me`);
      
      if (response.ok) {
        const userData = await response.json();
        console.log('Fetched user profile:', userData);
        
        // Update localStorage with latest user data
        localStorage.setItem('user', JSON.stringify(userData));
        setUser(userData);
        
        return userData;
      } else {
        throw new Error('Failed to fetch user profile');
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
      // Fall back to localStorage data if API call fails
      const localUserData = localStorage.getItem('user');
      if (localUserData) {
        const userData = JSON.parse(localUserData);
        setUser(userData);
        return userData;
      }
      throw error;
    }
  };

  // Load user data and check role on component mount
  useEffect(() => {
    const initializeUser = async () => {
      setRoleCheckLoading(true);
      
      try {
        // Try to fetch latest user profile from API
        const userData = await fetchUserProfile();
        
        // Check if user has the required role
        const hasRequiredRole = checkUserRole(userData);
        setHasAccess(hasRequiredRole);
        
        if (hasRequiredRole) {
          // Only load activities if user has access
          loadActivities();
        }
      } catch (error) {
        console.error('Error initializing user:', error);
        setError('Failed to verify user permissions. Please try logging in again.');
        setHasAccess(false);
      } finally {
        setRoleCheckLoading(false);
      }
    };

    initializeUser();
  }, []);

  // Load activities from API
  const loadActivities = async () => {
    if (!hasAccess) return;
    
    setLoading(true);
    setError('');
    
    try {
      const response = await authenticatedFetch(`${API_BASE_URL}/activities`);
      
      if (response.ok) {
        const data = await response.json();
        console.log('Loaded activities:', data);
        setActivities(data);
        calculateStats(data);
      } else {
        const errorData = await response.json();
        throw new Error(errorData.detail || `Failed to load activities: ${response.status}`);
      }
    } catch (error) {
      console.error('Error loading activities:', error);
      setError('Failed to load activities. Please try again.');
      setActivities([]);
    } finally {
      setLoading(false);
    }
  };

  // Calculate statistics
  const calculateStats = (activitiesData) => {
    const totalDuration = activitiesData.reduce((sum, a) => sum + (a.duration || 0), 0);
    const totalCalories = activitiesData.reduce((sum, a) => sum + (a.calories_burned || 0), 0);
    
    setStats({
      totalActivities: activitiesData.length,
      totalDuration,
      totalCalories,
      avgDuration: activitiesData.length > 0 ? Math.round(totalDuration / activitiesData.length) : 0,
      streak: calculateStreak(activitiesData)
    });
  };

  // Calculate streak based on activity dates
  const calculateStreak = (activitiesData) => {
    if (activitiesData.length === 0) return 0;

    // Sort activities by date (most recent first)
    const sortedActivities = [...activitiesData].sort((a, b) => 
      new Date(b.date) - new Date(a.date)
    );

    // Get unique dates
    const uniqueDates = [...new Set(sortedActivities.map(a => 
      new Date(a.date).toISOString().split('T')[0]
    ))].sort((a, b) => new Date(b) - new Date(a));

    if (uniqueDates.length === 0) return 0;

    let streak = 0;
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    
    // Check if there's an activity today or yesterday
    const mostRecentDate = new Date(uniqueDates[0]);
    const daysDiff = Math.floor((today - mostRecentDate) / (1000 * 60 * 60 * 24));
    
    if (daysDiff > 1) return 0; // No recent activity
    
    // Calculate consecutive days
    for (let i = 0; i < uniqueDates.length - 1; i++) {
      const currentDate = new Date(uniqueDates[i]);
      const nextDate = new Date(uniqueDates[i + 1]);
      const diff = Math.floor((currentDate - nextDate) / (1000 * 60 * 60 * 24));
      
      if (diff === 1) {
        streak++;
      } else {
        break;
      }
    }
    
    return streak + 1; // Add 1 for the first day
  };

  // Add new activity
  const handleAddActivity = async (e) => {
    e.preventDefault();
    if (!hasAccess) return;
    
    setLoading(true);
    setError('');
    
    try {
      // Prepare activity data according to your schema
      const activityData = {
        activity_name: newActivity.activity_name,
        duration: parseInt(newActivity.duration) || 0,
        calories_burned: newActivity.calories_burned ? parseInt(newActivity.calories_burned) : null,
        notes: newActivity.notes || null,
        date: dateTimeLocalToISO(newActivity.date)
      };
      
      console.log('Sending activity data:', activityData);
      
      const response = await authenticatedFetch(`${API_BASE_URL}/activities`, {
        method: 'POST',
        body: JSON.stringify(activityData)
      });
      
      if (response.ok) {
        const savedActivity = await response.json();
        console.log('Activity saved:', savedActivity);
        
        // Reload activities to get the latest data
        await loadActivities();
        
        // Reset form
        setNewActivity({
          activity_name: '',
          duration: '',
          calories_burned: '',
          notes: '',
          date: getCurrentDateTimeLocal()
        });
        setShowAddForm(false);
      } else {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to add activity');
      }
    } catch (error) {
      console.error('Error adding activity:', error);
      setError('Failed to add activity. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Edit activity
  const handleEditActivity = async (e) => {
    e.preventDefault();
    if (!hasAccess || !editingActivity) return;
    
    setLoading(true);
    setError('');
    
    try {
      // Prepare activity data according to your schema
      const activityData = {
        activity_name: editActivity.activity_name,
        duration: parseInt(editActivity.duration) || 0,
        calories_burned: editActivity.calories_burned ? parseInt(editActivity.calories_burned) : null,
        notes: editActivity.notes || null,
        date: dateTimeLocalToISO(editActivity.date)
      };
      
      console.log('Updating activity data:', activityData);
      
      const response = await authenticatedFetch(`${API_BASE_URL}/activities/${editingActivity.id}`, {
        method: 'PUT',
        body: JSON.stringify(activityData)
      });
      
      if (response.ok) {
        const updatedActivity = await response.json();
        console.log('Activity updated:', updatedActivity);
        
        // Reload activities to get the latest data
        await loadActivities();
        
        // Reset form and close modal
        setEditActivity({
          activity_name: '',
          duration: '',
          calories_burned: '',
          notes: '',
          date: ''
        });
        setEditingActivity(null);
        setShowEditForm(false);
      } else {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to update activity');
      }
    } catch (error) {
      console.error('Error updating activity:', error);
      setError('Failed to update activity. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Helper function to convert ISO string back to datetime-local format without timezone conversion
  const isoToDateTimeLocal = (isoString) => {
    if (!isoString) return '';
    
    try {
      // Extract components directly from ISO string to avoid timezone conversion
      const match = isoString.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
      if (match) {
        const [, year, month, day, hours, minutes] = match;
        return `${year}-${month}-${day}T${hours}:${minutes}`;
      }
      
      return '';
    } catch (error) {
      console.error('Error converting ISO to datetime-local:', error);
      return '';
    }
  };

  // Open edit form with activity data
  const openEditForm = (activity) => {
    setEditingActivity(activity);
    setEditActivity({
      activity_name: activity.activity_name || '',
      duration: activity.duration?.toString() || '',
      calories_burned: activity.calories_burned?.toString() || '',
      notes: activity.notes || '',
      date: isoToDateTimeLocal(activity.date)
    });
    setShowEditForm(true);
  };

  // Close edit form
  const closeEditForm = () => {
    setShowEditForm(false);
    setEditingActivity(null);
    setEditActivity({
      activity_name: '',
      duration: '',
      calories_burned: '',
      notes: '',
      date: ''
    });
  };

  // Delete activity
  const deleteActivity = async (id) => {
    if (!hasAccess) return;
    if (!confirm('Are you sure you want to delete this activity?')) return;
    
    setLoading(true);
    setError('');
    
    try {
      const response = await authenticatedFetch(`${API_BASE_URL}/activities/${id}`, {
        method: 'DELETE'
      });
      
      if (response.ok) {
        // Reload activities to get the latest data
        await loadActivities();
      } else {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to delete activity');
      }
    } catch (error) {
      console.error('Error deleting activity:', error);
      setError('Failed to delete activity. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Logout function
  const handleLogout = () => {
    clearTokens();
    localStorage.removeItem('user');
    
    if (onLogout) {
      onLogout();
    } else {
      window.location.reload();
    }
  };

  // Filter activities
  const filteredActivities = activities.filter(activity => {
    const matchesSearch = !searchTerm || 
      (activity.activity_name && activity.activity_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (activity.notes && activity.notes.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesSearch;
  });

  // Show loading screen while checking role
  if (roleCheckLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-lg p-8 text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mb-4"></div>
          <p className="text-gray-600">Verifying permissions...</p>
        </div>
      </div>
    );
  }

  // Show access denied screen if user doesn't have the required role
  if (!hasAccess) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-rose-100 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-lg p-8 text-center max-w-md">
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-red-100 rounded-full">
              <Shield className="w-8 h-8 text-red-600" />
            </div>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h2>
          <p className="text-gray-600 mb-6">
            You don't have permission to access the Activity Tracker. This feature is only available to users with the "exercise_tracker" role.
          </p>
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
            <div className="flex items-start">
              <AlertTriangle className="w-5 h-5 text-yellow-600 mr-2 mt-0.5" />
              <div className="text-sm text-yellow-800">
                <p className="font-medium">Current Role: {user?.role || 'No role assigned'}</p>
                <p>Required Role: exercise_tracker</p>
              </div>
            </div>
          </div>
          <p className="text-sm text-gray-500 mb-6">
            Please contact your administrator to request access to the Activity Tracker feature.
          </p>
          <button
            onClick={handleLogout}
            className="flex items-center justify-center w-full px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Return to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-green-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center">
              <div className="flex items-center">
                <Activity className="w-8 h-8 text-green-600 mr-3" />
                <h1 className="text-2xl font-bold text-gray-900">Activity Tracker</h1>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="flex items-center text-sm text-gray-500">
                <Shield className="w-4 h-4 mr-1" />
                <span>{user?.role}</span>
              </div>
              <span className="text-gray-600">Welcome, {user?.username || 'User'}!</span>
              <button
                onClick={handleLogout}
                className="flex items-center text-gray-600 hover:text-red-600 transition-colors"
              >
                <LogOut className="w-5 h-5 mr-1" />
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="flex">
              <div className="ml-3">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <Target className="w-6 h-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm text-gray-600">Total Activities</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.totalActivities}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Clock className="w-6 h-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm text-gray-600">Total Time</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.totalDuration}m</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center">
              <div className="p-2 bg-orange-100 rounded-lg">
                <Zap className="w-6 h-6 text-orange-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm text-gray-600">Total Calories</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.totalCalories}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <TrendingUp className="w-6 h-6 text-yellow-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm text-gray-600">Current Streak</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.streak} days</p>
              </div>
            </div>
          </div>
        </div>

        {/* Activities Section */}
        <div className="bg-white rounded-lg shadow-sm">
          <div className="p-6 border-b border-gray-200">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 sm:mb-0">Your Activities</h2>
              
              <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-4">
                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search activities..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>
                
                {/* Add Button */}
                <button
                  onClick={() => setShowAddForm(true)}
                  disabled={loading}
                  className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Activity
                </button>
              </div>
            </div>
          </div>

          {/* Activities List */}
          <div className="divide-y divide-gray-200">
            {loading ? (
              <div className="p-8 text-center">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
                <p className="mt-2 text-gray-600">Loading activities...</p>
              </div>
            ) : filteredActivities.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <Activity className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                <p>No activities found. Start by adding your first activity!</p>
              </div>
            ) : (
              filteredActivities.map((activity) => (
                <div key={activity.id} className="p-6 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="flex-shrink-0">
                        <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                          <Activity className="w-6 h-6 text-green-600" />
                        </div>
                      </div>
                      
                      <div className="flex-1">
                        <h3 className="text-lg font-medium text-gray-900">
                          {activity.activity_name || 'Unnamed Activity'}
                        </h3>
                        <div className="flex items-center text-sm text-gray-500 mt-1 flex-wrap gap-4">
                          <div className="flex items-center">
                            <Calendar className="w-4 h-4 mr-1" />
                            {formatDateForDisplay(activity.date)}
                          </div>
                          <div className="flex items-center">
                            <Clock className="w-4 h-4 mr-1" />
                            {activity.duration} min
                          </div>
                          {activity.calories_burned && (
                            <div className="flex items-center">
                              <Zap className="w-4 h-4 mr-1" />
                              {activity.calories_burned} cal
                            </div>
                          )}
                        </div>
                        {activity.notes && (
                          <p className="text-sm text-gray-600 mt-2">{activity.notes}</p>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => openEditForm(activity)}
                        disabled={loading}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-50"
                        title="Edit activity"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => deleteActivity(activity.id)}
                        disabled={loading}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                        title="Delete activity"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Add Activity Modal */}
      {showAddForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Add New Activity</h3>
            
            <form onSubmit={handleAddActivity} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Activity Name *
                </label>
                <input
                  type="text"
                  value={newActivity.activity_name}
                  onChange={(e) => setNewActivity({...newActivity, activity_name: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="e.g., Morning Run, Yoga Session, Weight Training"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Duration (minutes) *
                </label>
                <input
                  type="number"
                  value={newActivity.duration}
                  onChange={(e) => setNewActivity({...newActivity, duration: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  min="1"
                  placeholder="30"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Calories Burned
                </label>
                <input
                  type="number"
                  value={newActivity.calories_burned}
                  onChange={(e) => setNewActivity({...newActivity, calories_burned: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="300"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Date & Time *
                </label>
                <input
                  type="datetime-local"
                  value={newActivity.date}
                  onChange={(e) => setNewActivity({...newActivity, date: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes
                </label>
                <textarea
                  value={newActivity.notes}
                  onChange={(e) => setNewActivity({...newActivity, notes: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  rows="3"
                  placeholder="How did it go? Any observations?"
                />
              </div>
              
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                >
                  {loading ? 'Adding...' : 'Add Activity'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Activity Modal */}
      {showEditForm && editingActivity && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Edit Activity</h3>
            
            <form onSubmit={handleEditActivity} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Activity Name *
                </label>
                <input
                  type="text"
                  value={editActivity.activity_name}
                  onChange={(e) => setEditActivity({...editActivity, activity_name: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="e.g., Morning Run, Yoga Session"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Duration (minutes) *
                </label>
                <input
                  type="number"
                  value={editActivity.duration}
                  onChange={(e) => setEditActivity({...editActivity, duration: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  min="1"
                  placeholder="30"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Calories Burned
                </label>
                <input
                  type="number"
                  value={editActivity.calories_burned}
                  onChange={(e) => setEditActivity({...editActivity, calories_burned: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="300"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Date & Time *
                </label>
                <input
                  type="datetime-local"
                  value={editActivity.date}
                  onChange={(e) => setEditActivity({...editActivity, date: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes
                </label>
                <textarea
                  value={editActivity.notes}
                  onChange={(e) => setEditActivity({...editActivity, notes: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  rows="3"
                  placeholder="How did it go? Any observations?"
                />
              </div>
              
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={closeEditForm}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                >
                  {loading ? 'Updating...' : 'Update Activity'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;