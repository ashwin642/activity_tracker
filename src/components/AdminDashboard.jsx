import React, { useState, useEffect } from 'react';
import { 
  Users, 
  LogOut,
  Search,
  Eye,
  Trash2,
  Shield,
  AlertTriangle,
  UserCheck,
  Plus,
  X,
  Heart
} from 'lucide-react';

const AdminDashboard = ({ onLogout }) => {
  const [admin, setAdmin] = useState(null);
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [showUserDetails, setShowUserDetails] = useState(false);
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [newUser, setNewUser] = useState({
    username: '',
    email: '',
    password: '',
    role: 'exercise_tracker'
  });
  const [addUserLoading, setAddUserLoading] = useState(false);
  const [addUserError, setAddUserError] = useState('');

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
      
      // Check if user is admin based on role
      if (user.role !== 'admin') {
        setError('Access denied. Admin privileges required.');
        return;
      }
    }
    
    loadAllUsers();
  }, []);

  // Load all users from API - fetch both exercise_trackers and wellness_trackers
  const loadAllUsers = async () => {
    setLoading(true);
    setError('');
    
    try {
      // Fetch exercise_trackers
      const exerciseResponse = await authenticatedFetch(`${API_BASE_URL}/exercise_trackers`);
      let exerciseUsers = [];
      
      if (exerciseResponse.ok) {
        exerciseUsers = await exerciseResponse.json();
        console.log('Loaded exercise_trackers:', exerciseUsers);
      } else if (exerciseResponse.status === 403) {
        setError('Access denied. Admin privileges required.');
        return;
      } else {
        console.warn('Failed to load exercise trackers:', exerciseResponse.status);
      }

      // Fetch wellness_trackers
      const wellnessResponse = await authenticatedFetch(`${API_BASE_URL}/wellness_trackers`);
      let wellnessUsers = [];
      
      if (wellnessResponse.ok) {
        wellnessUsers = await wellnessResponse.json();
        console.log('Loaded wellness_trackers:', wellnessUsers);
      } else {
        console.warn('Failed to load wellness trackers:', wellnessResponse.status);
      }

      // Combine both user types
      const allUsers = [...exerciseUsers, ...wellnessUsers];
      setUsers(allUsers);
    } catch (error) {
      console.error('Error loading users:', error);
      setError('Failed to load users. Please try again.');
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  // Add new user (exercise_tracker or wellness_tracker)
  const addUser = async () => {
    setAddUserLoading(true);
    setAddUserError('');
    
    // Basic validation
    if (!newUser.username.trim() || !newUser.email.trim() || !newUser.password.trim()) {
      setAddUserError('All fields are required');
      setAddUserLoading(false);
      return;
    }

    if (newUser.password.length < 6) {
      setAddUserError('Password must be at least 6 characters long');
      setAddUserLoading(false);
      return;
    }

    try {
      // Determine the correct endpoint based on role
      const endpoint = newUser.role === 'wellness_tracker' ? 'wellness_trackers' : 'exercise_trackers';
      
      const response = await authenticatedFetch(`${API_BASE_URL}/${endpoint}`, {
        method: 'POST',
        body: JSON.stringify({
          username: newUser.username.trim(),
          email: newUser.email.trim(),
          password: newUser.password,
          role: newUser.role
        })
      });
      
      if (response.ok) {
        const createdUser = await response.json();
        console.log('Created user:', createdUser);
        
        // Reset form and close modal
        setNewUser({ username: '', email: '', password: '', role: 'exercise_tracker' });
        setShowAddUserModal(false);
        
        // Reload users list
        await loadAllUsers();
      } else {
        const errorData = await response.json();
        if (response.status === 400) {
          setAddUserError(errorData.detail || 'Invalid user data provided');
        } else if (response.status === 409) {
          setAddUserError('Username or email already exists');
        } else {
          throw new Error(errorData.detail || 'Failed to create user');
        }
      }
    } catch (error) {
      console.error('Error creating user:', error);
      setAddUserError('Failed to create user. Please try again.');
    } finally {
      setAddUserLoading(false);
    }
  };

  // View user details
  const viewUserDetails = (user) => {
    setSelectedUser(user);
    setShowUserDetails(true);
  };

  // Delete user
  const deleteUser = async (userId, username, userRole) => {
    if (!confirm(`Are you sure you want to delete user "${username}"? This action cannot be undone.`)) {
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      // Determine the correct endpoint based on role
      const endpoint = userRole === 'wellness_tracker' ? 'wellness_trackers' : 'exercise_trackers';
      
      const response = await authenticatedFetch(`${API_BASE_URL}/${endpoint}/${userId}`, {
        method: 'DELETE'
      });
      
      if (response.ok) {
        console.log(`Successfully deleted user: ${username}`);
        await loadAllUsers();
        
        // Close user details if the deleted user was selected
        if (selectedUser && selectedUser.id === userId) {
          setShowUserDetails(false);
          setSelectedUser(null);
        }
      } else if (response.status === 404) {
        setError('User not found or already deleted');
        await loadAllUsers(); // Refresh to sync state
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

  // Close add user modal and reset form
  const closeAddUserModal = () => {
    setShowAddUserModal(false);
    setNewUser({ username: '', email: '', password: '', role: 'exercise_tracker' });
    setAddUserError('');
  };

  // Filter users based on search and status
  const filteredUsers = users.filter(user => {
    const matchesSearch = !searchTerm || 
      user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesFilter = filterStatus === 'all' || 
      (filterStatus === 'admin' && user.role === 'admin') ||
      (filterStatus === 'exercise_tracker' && user.role === 'exercise_tracker') ||
      (filterStatus === 'wellness_tracker' && user.role === 'wellness_tracker');
    
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

  // Calculate basic stats from users array
  const totalUsers = users.length;
  const activeUsers = users.filter(u => u.is_active).length;
  const exerciseTrackers = users.filter(u => u.role === 'exercise_tracker').length;
  const wellnessTrackers = users.filter(u => u.role === 'wellness_tracker').length;

  // Get icon and color for user role
  const getUserRoleDisplay = (role) => {
    switch (role) {
      case 'admin':
        return {
          icon: Shield,
          bgColor: 'bg-red-100',
          iconColor: 'text-red-600',
          badgeColor: 'text-red-800 bg-red-100',
          label: 'Admin'
        };
      case 'wellness_tracker':
        return {
          icon: Users,
          bgColor: 'bg-blue-100',
          iconColor: 'text-blue-600',
          badgeColor: 'text-blue-800 bg-blue-100',
          label: 'Wellness Tracker'
        };
      case 'exercise_tracker':
      default:
        return {
          icon: Heart,
          bgColor: 'bg-green-100',
          iconColor: 'text-green-600',
          badgeColor: 'text-green-800 bg-green-100',
          label: 'Exercise Tracker'
        };
    }
  };

  if (admin && admin.role !== 'admin') {
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

        {/* Enhanced Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm text-gray-600">Total Sub-Users</p>
                <p className="text-2xl font-semibold text-gray-900">{totalUsers}</p>
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
                <p className="text-2xl font-semibold text-gray-900">{activeUsers}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <Heart className="w-6 h-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm text-gray-600">Exercise Trackers</p>
                <p className="text-2xl font-semibold text-gray-900">{exerciseTrackers}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm text-gray-600">Wellness Trackers</p>
                <p className="text-2xl font-semibold text-gray-900">{wellnessTrackers}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Users Management Section */}
        <div className="bg-white rounded-lg shadow-sm">
          <div className="p-6 border-b border-gray-200">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 sm:mb-0">Sub-User Management</h2>
              
              <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-4">
                {/* Add User Button */}
                <button
                  onClick={() => setShowAddUserModal(true)}
                  className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Sub-User
                </button>
                
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
                  <option value="admin">Admin</option>
                  <option value="exercise_tracker">Exercise Tracker</option>
                  <option value="wellness_tracker">Wellness Tracker</option>
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
              filteredUsers.map((user) => {
                const roleDisplay = getUserRoleDisplay(user.role);
                const RoleIcon = roleDisplay.icon;
                
                return (
                  <div key={user.id} className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="flex-shrink-0">
                          <div className={`w-12 h-12 rounded-full flex items-center justify-center ${roleDisplay.bgColor}`}>
                            <RoleIcon className={`w-6 h-6 ${roleDisplay.iconColor}`} />
                          </div>
                        </div>
                        
                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            <h3 className="text-lg font-medium text-gray-900">
                              {user.username}
                            </h3>
                            <span className={`px-2 py-1 text-xs font-semibold rounded-full ${roleDisplay.badgeColor}`}>
                              {roleDisplay.label}
                            </span>
                          </div>
                          <div className="flex items-center text-sm text-gray-500 mt-1 space-x-4">
                            <span>{user.email}</span>
                            <span>•</span>
                            <span>Joined: {formatDate(user.created_at)}</span>
                            <span>•</span>
                            <span>ID: {user.id}</span>
                            <span>•</span>
                            <span>Status: {user.is_active ? 'Active' : 'Inactive'}</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => viewUserDetails(user)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="View details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        
                        <button
                          onClick={() => deleteUser(user.id, user.username, user.role)}
                          disabled={loading || user.role === 'admin'}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          title={user.role === 'admin' ? "Cannot delete admin users" : "Delete user"}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Add User Modal */}
      {showAddUserModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Add New Sub-User</h3>
                <button
                  onClick={closeAddUserModal}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            
            <div className="p-6">
              {addUserError && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-700">{addUserError}</p>
                </div>
              )}
              
              <div className="space-y-4">
                <div>
                  <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1">
                    Username
                  </label>
                  <input
                    type="text"
                    id="username"
                    value={newUser.username}
                    onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter username"
                    required
                    disabled={addUserLoading}
                  />
                </div>
                
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    id="email"
                    value={newUser.email}
                    onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter email address"
                    required
                    disabled={addUserLoading}
                  />
                </div>
                
                <div>
                  <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-1">
                    Role
                  </label>
                  <select
                    id="role"
                    value={newUser.role}
                    onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                    disabled={addUserLoading}
                  >
                    <option value="exercise_tracker">Exercise Tracker</option>
                    <option value="wellness_tracker">Wellness Tracker</option>
                  </select>
                </div>
                
                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                    Password
                  </label>
                  <input
                    type="password"
                    id="password"
                    value={newUser.password}
                    onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter password (min. 6 characters)"
                    required
                    minLength="6"
                    disabled={addUserLoading}
                  />
                </div>
              </div>
              
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  type="button"
                  onClick={closeAddUserModal}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                  disabled={addUserLoading}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={addUser}
                  disabled={addUserLoading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                >
                  {addUserLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Creating...
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4 mr-2" />
                      Create User
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* User Details Modal */}
      {showUserDetails && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  {(() => {
                    const roleDisplay = getUserRoleDisplay(selectedUser.role);
                    const RoleIcon = roleDisplay.icon;
                    return (
                      <>
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${roleDisplay.bgColor}`}>
                          <RoleIcon className={`w-5 h-5 ${roleDisplay.iconColor}`} />
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900">
                            {selectedUser.username}
                            <span className={`ml-2 px-2 py-1 text-xs font-semibold rounded-full ${roleDisplay.badgeColor}`}>
                              {roleDisplay.label}
                            </span>
                          </h3>
                          <p className="text-sm text-gray-600">{selectedUser.email}</p>
                        </div>
                      </>
                    );
                  })()}
                </div>
                <button
                  onClick={() => setShowUserDetails(false)}
                  className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
                >
                  ×
                </button>
              </div>
            </div>
            
            <div className="p-6">
              {/* User Info */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-semibold text-gray-900 mb-3">User Information</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium text-gray-700">User ID:</span>
                    <span className="ml-2 text-gray-600">{selectedUser.id}</span>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Username:</span>
                    <span className="ml-2 text-gray-600">{selectedUser.username}</span>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Email:</span>
                    <span className="ml-2 text-gray-600">{selectedUser.email}</span>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Role:</span>
                    <span className="ml-2 text-gray-600">{selectedUser.role}</span>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Status:</span>
                    <span className="ml-2 text-gray-600">{selectedUser.is_active ? 'Active' : 'Inactive'}</span>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Created:</span>
                    <span className="ml-2 text-gray-600">{formatDate(selectedUser.created_at)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;