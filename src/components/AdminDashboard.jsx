import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Activity, 
  LogOut,
  Search,
  Filter,
  Eye,
  Trash2,
  Calendar,
  Clock,
  MapPin,
  Zap,
  Target,
  TrendingUp,
  Shield,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  BarChart3,
  UserCheck,
  UserX
} from 'lucide-react';

const AdminDashboard = ({ onLogout }) => {
  const [admin, setAdmin] = useState(null);
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [userActivities, setUserActivities] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [showUserDetails, setShowUserDetails] = useState(false);
  const [expandedUsers, setExpandedUsers] = useState(new Set());
  const [systemStats, setSystemStats] = useState({
    totalUsers: 0,
    activeUsers: 0,
    totalActivities: 0,
    avgActivitiesPerUser: 0
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
    localStorage.removeItem('token');
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

      if (response.status === 401) {
        console.log('Access token expired, attempting to refresh...');
        try {
          const newAccessToken = await refreshAccessToken();
          
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

  // Load admin data and all users on component mount
  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      const user = JSON.parse(userData);
      setAdmin(user);
      
      // Check if user is admin
      if (!user.is_admin) {
        setError('Access denied. Admin privileges required.');
        return;
      }
    }
    
    loadAllUsers();
    loadSystemStats();
  }, []);

  // Load all users from API
  const loadAllUsers = async () => {
    setLoading(true);
    setError('');
    
    try {
      const response = await authenticatedFetch(`${API_BASE_URL}/admin/users`);
      
      if (response.ok) {
        const data = await response.json();
        console.log('Loaded users:', data);
        setUsers(data);
      } else if (response.status === 403) {
        setError('Access denied. Admin privileges required.');
      } else {
        const errorData = await response.json();
        throw new Error(errorData.detail || `Failed to load users: ${response.status}`);
      }
    } catch (error) {
      console.error('Error loading users:', error);
      setError('Failed to load users. Please try again.');
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  // Load system statistics
  const loadSystemStats = async () => {
    try {
      const response = await authenticatedFetch(`${API_BASE_URL}/admin/stats`);
      
      if (response.ok) {
        const data = await response.json();
        setSystemStats(data);
      }
    } catch (error) {
      console.error('Error loading system stats:', error);
    }
  };

  // Load activities for a specific user
  const loadUserActivities = async (userId) => {
    setLoading(true);
    setError('');
    
    try {
      const response = await authenticatedFetch(`${API_BASE_URL}/admin/users/${userId}/activities`);
      
      if (response.ok) {
        const data = await response.json();
        setUserActivities(data);
      } else {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to load user activities');
      }
    } catch (error) {
      console.error('Error loading user activities:', error);
      setError('Failed to load user activities.');
      setUserActivities([]);
    } finally {
      setLoading(false);
    }
  };

  // Toggle user expansion
  const toggleUserExpansion = async (userId) => {
    const newExpanded = new Set(expandedUsers);
    
    if (newExpanded.has(userId)) {
      newExpanded.delete(userId);
      setExpandedUsers(newExpanded);
    } else {
      newExpanded.add(userId);
      setExpandedUsers(newExpanded);
      
      // Load activities for this user
      await loadUserActivities(userId);
    }
  };

  // View user details
  const viewUserDetails = async (user) => {
    setSelectedUser(user);
    setShowUserDetails(true);
    await loadUserActivities(user.id);
  };

  // Delete user (admin only)
  const deleteUser = async (userId, username) => {
    if (!confirm(`Are you sure you want to delete user "${username}"? This action cannot be undone.`)) {
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      const response = await authenticatedFetch(`${API_BASE_URL}/admin/users/${userId}`, {
        method: 'DELETE'
      });
      
      if (response.ok) {
        await loadAllUsers();
        await loadSystemStats();
        
        // Close user details if the deleted user was selected
        if (selectedUser && selectedUser.id === userId) {
          setShowUserDetails(false);
          setSelectedUser(null);
        }
      } else {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to delete user');
      }
    } catch (error) {
      console.error('Error deleting user:', error);
      setError('Failed to delete user. Please try again.');
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

  // Filter users based on search and status
  const filteredUsers = users.filter(user => {
    const matchesSearch = !searchTerm || 
      user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesFilter = filterStatus === 'all' || 
      (filterStatus === 'admin' && user.is_admin) ||
      (filterStatus === 'regular' && !user.is_admin);
    
    return matchesSearch && matchesFilter;
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

  // Calculate user statistics
  const calculateUserStats = (activities) => {
    const totalDuration = activities.reduce((sum, a) => sum + (a.duration || 0), 0);
    const totalDistance = activities.reduce((sum, a) => sum + (a.distance || 0), 0);
    const totalCalories = activities.reduce((sum, a) => sum + (a.calories_burned || 0), 0);
    
    return {
      totalActivities: activities.length,
      totalDuration,
      totalDistance,
      totalCalories,
      avgDuration: activities.length > 0 ? Math.round(totalDuration / activities.length) : 0
    };
  };

  if (admin && !admin.is_admin) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-red-100 flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="w-16 h-16 text-red-600 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-red-800 mb-2">Access Denied</h1>
          <p className="text-red-700 mb-4">You need admin privileges to access this page.</p>
          <button
            onClick={handleLogout}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            Return to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-blue-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center">
              <div className="flex items-center">
                <Shield className="w-8 h-8 text-blue-600 mr-3" />
                <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <span className="text-gray-600">Welcome, Admin {admin?.username || 'User'}!</span>
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
              <AlertTriangle className="w-5 h-5 text-red-500 mr-2" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        )}

        {/* System Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm text-gray-600">Total Users</p>
                <p className="text-2xl font-semibold text-gray-900">{systemStats.totalUsers}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <UserCheck className="w-6 h-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm text-gray-600">Active Users</p>
                <p className="text-2xl font-semibold text-gray-900">{systemStats.activeUsers}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Activity className="w-6 h-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm text-gray-600">Total Activities</p>
                <p className="text-2xl font-semibold text-gray-900">{systemStats.totalActivities}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center">
              <div className="p-2 bg-orange-100 rounded-lg">
                <BarChart3 className="w-6 h-6 text-orange-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm text-gray-600">Avg Activities/User</p>
                <p className="text-2xl font-semibold text-gray-900">{systemStats.avgActivitiesPerUser}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Users Management Section */}
        <div className="bg-white rounded-lg shadow-sm">
          <div className="p-6 border-b border-gray-200">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 sm:mb-0">User Management</h2>
              
              <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-4">
                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search users..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                
                {/* Filter */}
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="all">All Users</option>
                  <option value="admin">Admins</option>
                  <option value="regular">Regular Users</option>
                </select>
              </div>
            </div>
          </div>

          {/* Users List */}
          <div className="divide-y divide-gray-200">
            {loading ? (
              <div className="p-8 text-center">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <p className="mt-2 text-gray-600">Loading users...</p>
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <Users className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                <p>No users found matching your criteria.</p>
              </div>
            ) : (
              filteredUsers.map((user) => (
                <div key={user.id} className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="flex-shrink-0">
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                          user.is_admin ? 'bg-red-100' : 'bg-blue-100'
                        }`}>
                          {user.is_admin ? (
                            <Shield className="w-6 h-6 text-red-600" />
                          ) : (
                            <Users className="w-6 h-6 text-blue-600" />
                          )}
                        </div>
                      </div>
                      
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <h3 className="text-lg font-medium text-gray-900">
                            {user.username}
                          </h3>
                          {user.is_admin && (
                            <span className="px-2 py-1 text-xs font-semibold text-red-800 bg-red-100 rounded-full">
                              Admin
                            </span>
                          )}
                        </div>
                        <div className="flex items-center text-sm text-gray-500 mt-1 space-x-4">
                          <span>{user.email}</span>
                          <span>•</span>
                          <span>Joined: {formatDate(user.created_at)}</span>
                          <span>•</span>
                          <span>ID: {user.id}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => toggleUserExpansion(user.id)}
                        className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                        title="Toggle activities"
                      >
                        {expandedUsers.has(user.id) ? (
                          <ChevronDown className="w-4 h-4" />
                        ) : (
                          <ChevronRight className="w-4 h-4" />
                        )}
                      </button>
                      
                      <button
                        onClick={() => viewUserDetails(user)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="View details"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      
                      <button
                        onClick={() => deleteUser(user.id, user.username)}
                        disabled={loading || user.is_admin}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        title={user.is_admin ? "Cannot delete admin users" : "Delete user"}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  
                  {/* Expanded Activities */}
                  {expandedUsers.has(user.id) && (
                    <div className="mt-4 pl-16">
                      {userActivities.length === 0 ? (
                        <p className="text-gray-500 text-sm">No activities found for this user.</p>
                      ) : (
                        <div className="space-y-2">
                          <h4 className="font-medium text-gray-700 text-sm">Recent Activities</h4>
                          {userActivities.slice(0, 5).map((activity) => (
                            <div key={activity.id} className="flex items-center justify-between text-sm bg-gray-50 p-3 rounded-lg">
                              <div>
                                <span className="font-medium">{activity.activity_name}</span>
                                <span className="text-gray-500 ml-2">• {formatDate(activity.date)}</span>
                              </div>
                              <div className="flex items-center space-x-4 text-gray-500">
                                <div className="flex items-center">
                                  <Clock className="w-3 h-3 mr-1" />
                                  {activity.duration}m
                                </div>
                                {activity.distance && (
                                  <div className="flex items-center">
                                    <MapPin className="w-3 h-3 mr-1" />
                                    {activity.distance}km
                                  </div>
                                )}
                                {activity.calories_burned && (
                                  <div className="flex items-center">
                                    <Zap className="w-3 h-3 mr-1" />
                                    {activity.calories_burned} cal
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                          {userActivities.length > 5 && (
                            <button
                              onClick={() => viewUserDetails(user)}
                              className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                            >
                              View all {userActivities.length} activities →
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* User Details Modal */}
      {showUserDetails && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    selectedUser.is_admin ? 'bg-red-100' : 'bg-blue-100'
                  }`}>
                    {selectedUser.is_admin ? (
                      <Shield className="w-5 h-5 text-red-600" />
                    ) : (
                      <Users className="w-5 h-5 text-blue-600" />
                    )}
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      {selectedUser.username}
                      {selectedUser.is_admin && (
                        <span className="ml-2 px-2 py-1 text-xs font-semibold text-red-800 bg-red-100 rounded-full">
                          Admin
                        </span>
                      )}
                    </h3>
                    <p className="text-sm text-gray-600">{selectedUser.email}</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowUserDetails(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ×
                </button>
              </div>
            </div>
            
            <div className="p-6">
              {/* User Stats */}
              {userActivities.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                  {(() => {
                    const stats = calculateUserStats(userActivities);
                    return (
                      <>
                        <div className="bg-gray-50 rounded-lg p-4 text-center">
                          <Target className="w-6 h-6 text-green-600 mx-auto mb-2" />
                          <p className="text-2xl font-bold text-gray-900">{stats.totalActivities}</p>
                          <p className="text-sm text-gray-600">Activities</p>
                        </div>
                        <div className="bg-gray-50 rounded-lg p-4 text-center">
                          <Clock className="w-6 h-6 text-blue-600 mx-auto mb-2" />
                          <p className="text-2xl font-bold text-gray-900">{stats.totalDuration}m</p>
                          <p className="text-sm text-gray-600">Total Time</p>
                        </div>
                        <div className="bg-gray-50 rounded-lg p-4 text-center">
                          <MapPin className="w-6 h-6 text-purple-600 mx-auto mb-2" />
                          <p className="text-2xl font-bold text-gray-900">{stats.totalDistance.toFixed(1)}km</p>
                          <p className="text-sm text-gray-600">Distance</p>
                        </div>
                        <div className="bg-gray-50 rounded-lg p-4 text-center">
                          <Zap className="w-6 h-6 text-orange-600 mx-auto mb-2" />
                          <p className="text-2xl font-bold text-gray-900">{stats.totalCalories}</p>
                          <p className="text-sm text-gray-600">Calories</p>
                        </div>
                      </>
                    );
                  })()}
                </div>
              )}
              
              {/* Activities List */}
              <div>
                <h4 className="font-semibold text-gray-900 mb-4">All Activities</h4>
                {userActivities.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">No activities found for this user.</p>
                ) : (
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {userActivities.map((activity) => (
                      <div key={activity.id} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <h5 className="font-medium text-gray-900">{activity.activity_name}</h5>
                            <p className="text-sm text-gray-600">{formatDate(activity.date)}</p>
                            {activity.notes && (
                              <p className="text-sm text-gray-600 mt-1">{activity.notes}</p>
                            )}
                          </div>
                          <div className="flex items-center space-x-4 text-sm text-gray-500">
                            <div className="flex items-center">
                              <Clock className="w-4 h-4 mr-1" />
                              {activity.duration}m
                            </div>
                            {activity.distance && (
                              <div className="flex items-center">
                                <MapPin className="w-4 h-4 mr-1" />
                                {activity.distance}km
                              </div>
                            )}
                            {activity.calories_burned && (
                              <div className="flex items-center">
                                <Zap className="w-4 h-4 mr-1" />
                                {activity.calories_burned} cal
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;