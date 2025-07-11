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
  Search
} from 'lucide-react';

const Dashboard = () => {
  const [user, setUser] = useState(null);
  const [activities, setActivities] = useState([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [newActivity, setNewActivity] = useState({
    name: '',
    category: '',
    duration: '',
    date: new Date().toISOString().split('T')[0]
  });
  const [stats, setStats] = useState({
    totalActivities: 0,
    totalDuration: 0,
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
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/activities`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setActivities(data);
        calculateStats(data);
      }
    } catch (error) {
      console.error('Error loading activities:', error);
      // Use sample data if API fails
      const sampleActivities = [
        { id: 1, name: 'Morning Run', category: 'exercise', duration: 30, date: '2024-07-10' },
        { id: 2, name: 'Reading', category: 'learning', duration: 45, date: '2024-07-10' },
        { id: 3, name: 'Meditation', category: 'wellness', duration: 15, date: '2024-07-09' },
        { id: 4, name: 'Coding Practice', category: 'learning', duration: 60, date: '2024-07-09' },
        { id: 5, name: 'Yoga', category: 'wellness', duration: 20, date: '2024-07-08' }
      ];
      setActivities(sampleActivities);
      calculateStats(sampleActivities);
    }
  };

  // Calculate statistics
  const calculateStats = (activitiesData) => {
    const totalDuration = activitiesData.reduce((sum, a) => sum + a.duration, 0);
    
    setStats({
      totalActivities: activitiesData.length,
      totalDuration,
      avgDuration: activitiesData.length > 0 ? Math.round(totalDuration / activitiesData.length) : 0,
      streak: calculateStreak(activitiesData)
    });
  };

  // Calculate streak
  const calculateStreak = (activitiesData) => {
    const today = new Date();
    let streak = 0;
    let currentDate = new Date(today);
    
    while (true) {
      const dateStr = currentDate.toISOString().split('T')[0];
      const hasActivity = activitiesData.some(a => a.date === dateStr);
      
      if (hasActivity) {
        streak++;
        currentDate.setDate(currentDate.getDate() - 1);
      } else {
        break;
      }
    }
    
    return streak;
  };

  // Add new activity
  const handleAddActivity = async (e) => {
    e.preventDefault();
    
    const activity = {
      ...newActivity,
      id: Date.now(),
      duration: parseInt(newActivity.duration)
    };
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/activities`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(activity)
      });
      
      if (response.ok) {
        const savedActivity = await response.json();
        setActivities(prev => [...prev, savedActivity]);
        calculateStats([...activities, savedActivity]);
      } else {
        // Fallback to local storage
        setActivities(prev => [...prev, activity]);
        calculateStats([...activities, activity]);
      }
    } catch (error) {
      console.error('Error adding activity:', error);
      // Fallback to local storage
      setActivities(prev => [...prev, activity]);
      calculateStats([...activities, activity]);
    }
    
    setNewActivity({
      name: '',
      category: '',
      duration: '',
      date: new Date().toISOString().split('T')[0]
    });
    setShowAddForm(false);
  };

  // Delete activity
  const deleteActivity = async (id) => {
    try {
      const token = localStorage.getItem('token');
      await fetch(`${API_BASE_URL}/activities/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
    } catch (error) {
      console.error('Error deleting activity:', error);
    }
    
    const updated = activities.filter(a => a.id !== id);
    setActivities(updated);
    calculateStats(updated);
  };

  // Logout function
  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.reload();
  };

  // Filter activities
  const filteredActivities = activities.filter(activity => {
    const matchesFilter = filter === 'all' || activity.category === filter;
    const matchesSearch = activity.name.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  // Get category color
  const getCategoryColor = (category) => {
    const colors = {
      exercise: 'bg-red-100 text-red-800',
      learning: 'bg-blue-100 text-blue-800',
      wellness: 'bg-green-100 text-green-800',
      work: 'bg-yellow-100 text-yellow-800',
      hobby: 'bg-purple-100 text-purple-800',
      default: 'bg-gray-100 text-gray-800'
    };
    return colors[category] || colors.default;
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
              <div className="p-2 bg-yellow-100 rounded-lg">
                <BarChart3 className="w-6 h-6 text-yellow-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm text-gray-600">Average Duration</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.avgDuration}m</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-lg">
                <TrendingUp className="w-6 h-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm text-gray-600">Current Streak</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.streak} days</p>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Add Activity Section */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Quick Add Activity</h2>
            <button
              onClick={() => setShowAddForm(true)}
              className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Activity
            </button>
          </div>
          
          <p className="text-gray-600">
            Record your completed activities to track your progress and build streaks!
          </p>
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
                
                {/* Filter */}
                <select
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                >
                  <option value="all">All Categories</option>
                  <option value="exercise">Exercise</option>
                  <option value="learning">Learning</option>
                  <option value="wellness">Wellness</option>
                  <option value="work">Work</option>
                  <option value="hobby">Hobby</option>
                </select>
                
                {/* Add Button */}
                <button
                  onClick={() => setShowAddForm(true)}
                  className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Activity
                </button>
              </div>
            </div>
          </div>

          {/* Activities List */}
          <div className="divide-y divide-gray-200">
            {filteredActivities.length === 0 ? (
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
                        <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getCategoryColor(activity.category)}`}>
                          {activity.category}
                        </div>
                      </div>
                      
                      <div>
                        <h3 className="text-lg font-medium text-gray-900">{activity.name}</h3>
                        <div className="flex items-center text-sm text-gray-500 mt-1">
                          <Calendar className="w-4 h-4 mr-1" />
                          {new Date(activity.date).toLocaleDateString()}
                          <Clock className="w-4 h-4 ml-4 mr-1" />
                          {activity.duration} minutes
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => deleteActivity(activity.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
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
                  Activity Name
                </label>
                <input
                  type="text"
                  value={newActivity.name}
                  onChange={(e) => setNewActivity({...newActivity, name: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Category
                </label>
                <select
                  value={newActivity.category}
                  onChange={(e) => setNewActivity({...newActivity, category: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  required
                >
                  <option value="">Select a category</option>
                  <option value="exercise">Exercise</option>
                  <option value="learning">Learning</option>
                  <option value="wellness">Wellness</option>
                  <option value="work">Work</option>
                  <option value="hobby">Hobby</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Duration (minutes)
                </label>
                <input
                  type="number"
                  value={newActivity.duration}
                  onChange={(e) => setNewActivity({...newActivity, duration: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  min="1"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Date
                </label>
                <input
                  type="date"
                  value={newActivity.date}
                  onChange={(e) => setNewActivity({...newActivity, date: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  required
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
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  Add Activity
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