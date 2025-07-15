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
  MapPin,
  Zap
} from 'lucide-react';

const Dashboard = ({ onLogout }) => {
  const [user, setUser] = useState(null);
  const [activities, setActivities] = useState([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [newActivity, setNewActivity] = useState({
    activity_name: '',
    duration: '',
    distance: '',
    calories_burned: '',
    notes: '',
    date: new Date().toISOString().slice(0, 16) // YYYY-MM-DDTHH:MM format
  });
  const [stats, setStats] = useState({
    totalActivities: 0,
    totalDuration: 0,
    totalDistance: 0,
    totalCalories: 0,
    avgDuration: 0,
    streak: 0
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

  // Load user data on component mount
  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      setUser(JSON.parse(userData));
    }
    loadActivities();
  }, []);

  // Load activities from API
  const loadActivities = async () => {
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
    const totalDistance = activitiesData.reduce((sum, a) => sum + (a.distance || 0), 0);
    const totalCalories = activitiesData.reduce((sum, a) => sum + (a.calories_burned || 0), 0);
    
    setStats({
      totalActivities: activitiesData.length,
      totalDuration,
      totalDistance,
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
    setLoading(true);
    setError('');
    
    try {
      // Prepare activity data according to your schema
      const activityData = {
        activity_name: newActivity.activity_name,
        duration: parseInt(newActivity.duration) || 0,
        distance: newActivity.distance ? parseFloat(newActivity.distance) : null,
        calories_burned: newActivity.calories_burned ? parseInt(newActivity.calories_burned) : null,
        notes: newActivity.notes || null,
        date: new Date(newActivity.date).toISOString()
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
          distance: '',
          calories_burned: '',
          notes: '',
          date: new Date().toISOString().slice(0, 16)
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

  // Delete activity
  const deleteActivity = async (id) => {
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

  // Format date for display
  const formatDate = (dateString) => {
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      return 'Invalid date';
    }
  };

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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
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
              <div className="p-2 bg-purple-100 rounded-lg">
                <MapPin className="w-6 h-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm text-gray-600">Total Distance</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.totalDistance.toFixed(1)}km</p>
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
                            {formatDate(activity.date)}
                          </div>
                          <div className="flex items-center">
                            <Clock className="w-4 h-4 mr-1" />
                            {activity.duration} min
                          </div>
                          {activity.distance && (
                            <div className="flex items-center">
                              <MapPin className="w-4 h-4 mr-1" />
                              {activity.distance} km
                            </div>
                          )}
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
                  Distance (km)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={newActivity.distance}
                  onChange={(e) => setNewActivity({...newActivity, distance: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="5.0"
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
    </div>
  );
};

export default Dashboard;