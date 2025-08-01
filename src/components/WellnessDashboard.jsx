import React, { useState, useEffect } from 'react';
import { 
  Heart, 
  Plus, 
  Calendar, 
  Clock, 
  Target, 
  TrendingUp, 
  LogOut,
  Trash2,
  Search,
  Utensils,
  Moon,
  Smile,
  Brain,
  Droplets,
  Shield,
  AlertTriangle,
  Edit2
} from 'lucide-react';

const WellnessDashboard = ({ onLogout }) => {
  const [user, setUser] = useState(null);
  const [nutritionEntries, setNutritionEntries] = useState([]);
  const [sleepEntries, setSleepEntries] = useState([]);
  const [moodEntries, setMoodEntries] = useState([]);
  const [meditationEntries, setMeditationEntries] = useState([]);
  const [hydrationEntries, setHydrationEntries] = useState([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [editingEntry, setEditingEntry] = useState(null);
  const [activeTab, setActiveTab] = useState('nutrition');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [roleCheckLoading, setRoleCheckLoading] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);
  const [summary, setSummary] = useState({
    nutrition_entries: 0,
    sleep_entries: 0,
    mood_entries: 0,
    meditation_entries: 0,
    hydration_entries: 0,
    total_entries: 0
  });
  
  // Helper function to get current time in HH:MM format for form defaults
  const getCurrentTime = () => {
    const now = new Date();
    const hours = now.getHours().toString().padStart(2, '0');
    const minutes = now.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  };

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

  // Replace the convertISOToDateTimeLocal function with this:

const convertISOToDateTimeLocal = (isoString) => {
  if (!isoString) return getCurrentDateTimeLocal();
  
  try {
    // Extract date and time components directly from ISO string to avoid timezone conversion
    const match = isoString.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
    if (match) {
      const [, year, month, day, hours, minutes] = match;
      return `${year}-${month}-${day}T${hours}:${minutes}`;
    }
    
    // Fallback to current time if parsing fails
    return getCurrentDateTimeLocal();
  } catch (error) {
    console.error('Error converting ISO to datetime-local:', error);
    return getCurrentDateTimeLocal();
  }
};

// Also add this helper function for sleep time fields:
const extractTimeForForm = (isoString) => {
  if (!isoString) return '';
  
  try {
    // Extract the time portion directly from the ISO string
    const timeMatch = isoString.match(/T(\d{2}):(\d{2})/);
    if (timeMatch) {
      const [, hours, minutes] = timeMatch;
      return `${hours}:${minutes}`;
    }
    return '';
  } catch (error) {
    return '';
  }
};
  // Helper function to format time for API (ensure HH:MM:SS format)
  const formatTimeForAPI = (timeString) => {
    if (!timeString) return null;
    // If it's already in HH:MM format, add :00 for seconds
    if (timeString.length === 5 && timeString.includes(':')) {
      return `${timeString}:00`;
    }
    return timeString;
  };

  // Helper function to format time for display (HH:MM format)
  const formatTimeForDisplay = (timeString) => {
    if (!timeString) return '';
    // If it includes seconds, remove them
    if (timeString.length === 8 && timeString.includes(':')) {
      return timeString.slice(0, 5);
    }
    return timeString;
  };

  // Helper function to extract time from ISO datetime string without timezone conversion
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

  // Helper function to extract date from ISO datetime string without timezone conversion
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
  
  const [newEntry, setNewEntry] = useState({
    // Nutrition fields
    meal_type: 'breakfast',
    food_items: '',
    calories: '',
    protein: '',
    carbs: '',
    sugar: '',
    fat: '',
    // Sleep fields
    bedtime: '',
    wake_time: '',
    sleep_quality: '',
    sleep_duration: '',
    // Mood fields
    mood_rating: '',
    mood_type: 'happy',
    energy_level: '',
    stress_level: '',
    // Meditation fields
    duration: '',
    meditation_type: 'mindfulness',
    // Hydration fields
    water_intake: '',
    // Common fields
    date_time: getCurrentDateTimeLocal(), // Use timezone-safe current datetime
    notes: ''
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

  // Check if user has required role for wellness tracking
  const checkUserRole = (userData) => {
    console.log('Checking user role:', userData);
    
    // Check if user has the wellness_tracker role
    if (userData && userData.role === 'wellness_tracker') {
      return true;
    }
    
    // Also check if roles is an array (in case of multiple roles)
    if (userData && Array.isArray(userData.roles)) {
      return userData.roles.includes('wellness_tracker');
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

  // Fetch current user profile
  const fetchUserProfile = async () => {
    try {
      const response = await authenticatedFetch(`${API_BASE_URL}/auth/me`);
      
      if (response.ok) {
        const userData = await response.json();
        console.log('Fetched user profile:', userData);
        
        localStorage.setItem('user', JSON.stringify(userData));
        setUser(userData);
        
        return userData;
      } else {
        throw new Error('Failed to fetch user profile');
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
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
        const userData = await fetchUserProfile();
        const hasRequiredRole = checkUserRole(userData);
        setHasAccess(hasRequiredRole);
        
        if (hasRequiredRole) {
          loadWellnessData();
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

  // Load wellness data from API
  const loadWellnessData = async () => {
    if (!hasAccess) return;
    
    setLoading(true);
    setError('');
    
    try {
      // Load summary
      const summaryResponse = await authenticatedFetch(`${API_BASE_URL}/wellness/summary`);
      if (summaryResponse.ok) {
        const summaryData = await summaryResponse.json();
        setSummary(summaryData.summary);
      }

      // Load current tab data
      await loadTabData(activeTab);
    } catch (error) {
      console.error('Error loading wellness data:', error);
      setError('Failed to load wellness data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Load data for specific tab
  const loadTabData = async (tab) => {
    try {
      let response;
      switch (tab) {
        case 'nutrition':
          response = await authenticatedFetch(`${API_BASE_URL}/wellness/nutrition`);
          if (response.ok) {
            const data = await response.json();
            setNutritionEntries(data);
          }
          break;
        case 'sleep':
          response = await authenticatedFetch(`${API_BASE_URL}/wellness/sleep`);
          if (response.ok) {
            const data = await response.json();
            setSleepEntries(data);
          }
          break;
        case 'mood':
          response = await authenticatedFetch(`${API_BASE_URL}/wellness/mood`);
          if (response.ok) {
            const data = await response.json();
            setMoodEntries(data);
          }
          break;
        case 'meditation':
          response = await authenticatedFetch(`${API_BASE_URL}/wellness/meditation`);
          if (response.ok) {
            const data = await response.json();
            setMeditationEntries(data);
          }
          break;
        case 'hydration':
          response = await authenticatedFetch(`${API_BASE_URL}/wellness/hydration`);
          if (response.ok) {
            const data = await response.json();
            setHydrationEntries(data);
          }
          break;
      }
    } catch (error) {
      console.error(`Error loading ${tab} data:`, error);
    }
  };

  // Handle tab change
  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setSearchTerm('');
    loadTabData(tab);
  };

  // Handle edit entry - Updated to support all entry types
  const handleEditEntry = (entry) => {
    setEditingEntry(entry);
    
    if (activeTab === 'nutrition') {
      setNewEntry({
        meal_type: entry.meal_type || 'breakfast',
        food_items: entry.food_items || '',
        calories: entry.calories ? entry.calories.toString() : '',
        protein: entry.protein ? entry.protein.toString() : '',
        carbs: entry.carbs ? entry.carbs.toString() : '',
        sugar: entry.sugar ? entry.sugar.toString() : '',
        fat: entry.fat ? entry.fat.toString() : '',
        date_time: convertISOToDateTimeLocal(entry.date),
        notes: entry.notes || '',
        // Keep other fields for form consistency
        bedtime: '',
        wake_time: '',
        sleep_quality: '',
        sleep_duration: '',
        mood_rating: '',
        mood_type: 'happy',
        energy_level: '',
        stress_level: '',
        duration: '',
        meditation_type: 'mindfulness',
        water_intake: ''
      });
    } else if (activeTab === 'sleep') {
        setNewEntry({
        bedtime: extractTimeForForm(entry.bedtime),
        wake_time: extractTimeForForm(entry.wake_time),
        sleep_quality: entry.sleep_quality ? entry.sleep_quality.toString() : '',
        sleep_duration: entry.sleep_duration ? entry.sleep_duration.toString() : '',
        date_time: convertISOToDateTimeLocal(entry.date),
        notes: entry.notes || '',
        // Keep other fields for form consistency
        meal_type: 'breakfast',
        food_items: '',
        calories: '',
        protein: '',
        carbs: '',
        sugar: '',
        fat: '',
        mood_rating: '',
        mood_type: 'happy',
        energy_level: '',
        stress_level: '',
        duration: '',
        meditation_type: 'mindfulness',
        water_intake: ''
      }); 
    } else if (activeTab === 'mood') {
      setNewEntry({
        mood_rating: entry.mood_rating ? entry.mood_rating.toString() : '',
        mood_type: entry.mood_type || 'happy',
        energy_level: entry.energy_level ? entry.energy_level.toString() : '',
        stress_level: entry.stress_level ? entry.stress_level.toString() : '',
        date_time: convertISOToDateTimeLocal(entry.date),
        notes: entry.notes || '',
        // Keep other fields for form consistency
        meal_type: 'breakfast',
        food_items: '',
        calories: '',
        protein: '',
        carbs: '',
        sugar: '',
        fat: '',
        bedtime: '',
        wake_time: '',
        sleep_quality: '',
        sleep_duration: '',
        duration: '',
        meditation_type: 'mindfulness',
        water_intake: ''
      });
    } else if (activeTab === 'meditation') {
      setNewEntry({
        duration: entry.duration ? entry.duration.toString() : '',
        meditation_type: entry.meditation_type || 'mindfulness',
        date_time: convertISOToDateTimeLocal(entry.date),
        notes: entry.notes || '',
        // Keep other fields for form consistency
        meal_type: 'breakfast',
        food_items: '',
        calories: '',
        protein: '',
        carbs: '',
        sugar: '',
        fat: '',
        bedtime: '',
        wake_time: '',
        sleep_quality: '',
        sleep_duration: '',
        mood_rating: '',
        mood_type: 'happy',
        energy_level: '',
        stress_level: '',
        water_intake: ''
      });
    } else if (activeTab === 'hydration') {
      setNewEntry({
        water_intake: entry.water_intake ? entry.water_intake.toString() : '',
        date_time: convertISOToDateTimeLocal(entry.date),
        notes: entry.notes || '',
        // Keep other fields for form consistency
        meal_type: 'breakfast',
        food_items: '',
        calories: '',
        protein: '',
        carbs: '',
        sugar: '',
        fat: '',
        bedtime: '',
        wake_time: '',
        sleep_quality: '',
        sleep_duration: '',
        mood_rating: '',
        mood_type: 'happy',
        energy_level: '',
        stress_level: '',
        duration: '',
        meditation_type: 'mindfulness'
      });
    }
    
    setShowEditForm(true);
  };

  // Handle update entry - Updated to support all entry types
  const handleUpdateEntry = async (e) => {
    e.preventDefault();
    if (!hasAccess || !editingEntry) return;
    
    setLoading(true);
    setError('');
    
    try {
      let entryData = {};
      let endpoint = '';
      
      if (activeTab === 'nutrition') {
        entryData = {
          meal_type: newEntry.meal_type,
          food_items: newEntry.food_items,
          calories: newEntry.calories ? parseInt(newEntry.calories) : null,
          protein: newEntry.protein ? parseFloat(newEntry.protein) : null,
          carbs: newEntry.carbs ? parseFloat(newEntry.carbs) : null,
          sugar: newEntry.sugar ? parseFloat(newEntry.sugar) : null,
          fat: newEntry.fat ? parseFloat(newEntry.fat) : null,
          date: new Date(newEntry.date_time).toISOString(),
          notes: newEntry.notes || null
        };
        endpoint = `/wellness/nutrition/${editingEntry.id}`;
      } else if (activeTab === 'sleep') {
        // Create datetime objects for bedtime and wake_time preserving local time
        let bedtimeISO = null;
        let wakeTimeISO = null;

        if (newEntry.bedtime) {
          // Extract date from the datetime-local input
          const baseDateStr = newEntry.date_time.split('T')[0]; // Get YYYY-MM-DD
          // Combine date with bedtime to create ISO string without timezone conversion
          bedtimeISO = `${baseDateStr}T${newEntry.bedtime}:00.000Z`;
        }

        if (newEntry.wake_time) {
          const baseDateStr = newEntry.date_time.split('T')[0]; // Get YYYY-MM-DD
          let wakeDateStr = baseDateStr;
          
          // If wake time is earlier than bedtime, assume it's the next day
          if (newEntry.bedtime && newEntry.wake_time < newEntry.bedtime) {
            const wakeDate = new Date(baseDateStr);
            wakeDate.setDate(wakeDate.getDate() + 1);
            wakeDateStr = wakeDate.toISOString().split('T')[0];
          }
          
          // Combine date with wake_time to create ISO string without timezone conversion
          wakeTimeISO = `${wakeDateStr}T${newEntry.wake_time}:00.000Z`;
        }

        entryData = {
          bedtime: bedtimeISO,
          wake_time: wakeTimeISO,
          sleep_quality: newEntry.sleep_quality ? parseInt(newEntry.sleep_quality) : 0,
          sleep_duration: newEntry.sleep_duration ? parseInt(newEntry.sleep_duration) : 0,
          notes: newEntry.notes
        };
        endpoint = `/wellness/sleep/${editingEntry.id}`;
      } else if (activeTab === 'mood') {
        entryData = {
          mood_rating: parseInt(newEntry.mood_rating),
          mood_type: newEntry.mood_type,
          energy_level: newEntry.energy_level ? parseInt(newEntry.energy_level) : null,
          stress_level: newEntry.stress_level ? parseInt(newEntry.stress_level) : null,
          date: new Date(newEntry.date_time).toISOString(),
          notes: newEntry.notes || null
        };
        endpoint = `/wellness/mood/${editingEntry.id}`;
      } else if (activeTab === 'meditation') {
        entryData = {
          duration: parseInt(newEntry.duration),
          meditation_type: newEntry.meditation_type,
          date: new Date(newEntry.date_time).toISOString(),
          notes: newEntry.notes || null
        };
        endpoint = `/wellness/meditation/${editingEntry.id}`;
      } else if (activeTab === 'hydration') {
        entryData = {
          water_intake: parseFloat(newEntry.water_intake),
          time_logged: new Date(newEntry.date_time).toISOString(),
          notes: newEntry.notes || null
        };
        endpoint = `/wellness/hydration/${editingEntry.id}`;
      }
      
      const response = await authenticatedFetch(`${API_BASE_URL}${endpoint}`, {
        method: 'PUT',
        body: JSON.stringify(entryData)
      });
      
      if (response.ok) {
        await loadWellnessData();
        resetForm();
        setShowEditForm(false);
        setEditingEntry(null);
      } else {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to update entry');
      }
    } catch (error) {
      console.error('Error updating entry:', error);
      setError('Failed to update entry. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Add new entry
  const handleAddEntry = async (e) => {
    e.preventDefault();
    if (!hasAccess) return;
    
    setLoading(true);
    setError('');
    
    try {
      let entryData = {};
      let endpoint = '';
      
      switch (activeTab) {
        case 'nutrition':
          entryData = {
            meal_type: newEntry.meal_type,
            food_items: newEntry.food_items,
            calories: newEntry.calories ? parseInt(newEntry.calories) : null,
            protein: newEntry.protein ? parseFloat(newEntry.protein) : null,
            carbs: newEntry.carbs ? parseFloat(newEntry.carbs) : null,
            sugar: newEntry.sugar ? parseFloat(newEntry.sugar) : null,
            fat: newEntry.fat ? parseFloat(newEntry.fat) : null,
            date: new Date(newEntry.date_time).toISOString(),
            notes: newEntry.notes || null
          };
          endpoint = '/wellness/nutrition';
          break;
        case 'sleep':
          // Create datetime objects for bedtime and wake_time preserving local time
          let bedtimeISO = null;
          let wakeTimeISO = null;
  
          if (newEntry.bedtime) {
            // Extract date from the datetime-local input
            const baseDateStr = newEntry.date_time.split('T')[0]; // Get YYYY-MM-DD
            // Combine date with bedtime to create ISO string without timezone conversion
            bedtimeISO = `${baseDateStr}T${newEntry.bedtime}:00.000Z`;
          }
  
          if (newEntry.wake_time) {
            const baseDateStr = newEntry.date_time.split('T')[0]; // Get YYYY-MM-DD
            let wakeDateStr = baseDateStr;
            
            // If wake time is earlier than bedtime, assume it's the next day
            if (newEntry.bedtime && newEntry.wake_time < newEntry.bedtime) {
              const wakeDate = new Date(baseDateStr);
              wakeDate.setDate(wakeDate.getDate() + 1);
              wakeDateStr = wakeDate.toISOString().split('T')[0];
            }
            
            // Combine date with wake_time to create ISO string without timezone conversion
            wakeTimeISO = `${wakeDateStr}T${newEntry.wake_time}:00.000Z`;
          }

          entryData = {
            bedtime: bedtimeISO,
            wake_time: wakeTimeISO,
            sleep_quality: newEntry.sleep_quality ? parseInt(newEntry.sleep_quality) : 0,
            sleep_duration: newEntry.sleep_duration ? parseInt(newEntry.sleep_duration) : 0,
            notes: newEntry.notes
          };
          endpoint = '/wellness/sleep';
          break;
        case 'mood':
          entryData = {
            mood_rating: parseInt(newEntry.mood_rating),
            mood_type: newEntry.mood_type,
            energy_level: newEntry.energy_level ? parseInt(newEntry.energy_level) : null,
            stress_level: newEntry.stress_level ? parseInt(newEntry.stress_level) : null,
            date: new Date(newEntry.date_time).toISOString(),
            notes: newEntry.notes || null
          };
          endpoint = '/wellness/mood';
          break;
        case 'meditation':
          entryData = {
            duration: parseInt(newEntry.duration),
            meditation_type: newEntry.meditation_type,
            date: new Date(newEntry.date_time).toISOString(),
            notes: newEntry.notes || null
          };
          endpoint = '/wellness/meditation';
          break;
        case 'hydration':
          entryData = {
            water_intake: parseFloat(newEntry.water_intake),
            time_logged: new Date(newEntry.date_time).toISOString(),
            notes: newEntry.notes || null
          };
          endpoint = '/wellness/hydration';
          break;
      }
      
      const response = await authenticatedFetch(`${API_BASE_URL}${endpoint}`, {
        method: 'POST',
        body: JSON.stringify(entryData)
      });
      
      if (response.ok) {
        await loadWellnessData();
        resetForm();
        setShowAddForm(false);
      } else {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to add entry');
      }
    } catch (error) {
      console.error('Error adding entry:', error);
      setError('Failed to add entry. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Delete entry
  const deleteEntry = async (id, type) => {
    if (!hasAccess) return;
    if (!confirm('Are you sure you want to delete this entry?')) return;
    
    setLoading(true);
    setError('');
    
    try {
      const response = await authenticatedFetch(`${API_BASE_URL}/wellness/${type}/${id}`, {
        method: 'DELETE'
      });
      
      if (response.ok) {
        await loadWellnessData();
      } else {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to delete entry');
      }
    } catch (error) {
      console.error('Error deleting entry:', error);
      setError('Failed to delete entry. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Reset form
  const resetForm = () => {
    setNewEntry({
      meal_type: 'breakfast',
      food_items: '',
      calories: '',
      protein: '',
      carbs: '',
      sugar: '',
      fat: '',
      bedtime: '',
      wake_time: '',
      sleep_quality: '',
      sleep_duration: '',
      mood_rating: '',
      mood_type: 'happy',
      energy_level: '',
      stress_level: '',
      duration: '',
      meditation_type: 'mindfulness',
      water_intake: '',
      date_time: getCurrentDateTimeLocal(),
      notes: ''
    });
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

  // Get current entries based on active tab
  const getCurrentEntries = () => {
    switch (activeTab) {
      case 'nutrition': return nutritionEntries;
      case 'sleep': return sleepEntries;
      case 'mood': return moodEntries;
      case 'meditation': return meditationEntries;
      case 'hydration': return hydrationEntries;
      default: return [];
    }
  };

  // Filter entries
  const filteredEntries = getCurrentEntries().filter(entry => {
    const searchLower = searchTerm.toLowerCase();
    switch (activeTab) {
      case 'nutrition':
        return !searchTerm || 
          (entry.food_items && entry.food_items.toLowerCase().includes(searchLower)) ||
          (entry.meal_type && entry.meal_type.toLowerCase().includes(searchLower)) ||
          (entry.notes && entry.notes.toLowerCase().includes(searchLower));
      case 'sleep':
        return !searchTerm || 
          (entry.notes && entry.notes.toLowerCase().includes(searchLower));
      case 'mood':
        return !searchTerm || 
          (entry.mood_type && entry.mood_type.toLowerCase().includes(searchLower)) ||
          (entry.notes && entry.notes.toLowerCase().includes(searchLower));
      case 'meditation':
        return !searchTerm || 
          (entry.meditation_type && entry.meditation_type.toLowerCase().includes(searchLower)) ||
          (entry.notes && entry.notes.toLowerCase().includes(searchLower));
      case 'hydration':
        return !searchTerm || 
          (entry.notes && entry.notes.toLowerCase().includes(searchLower));
      default:
        return true;
    }
  });

  // Helper function to format date for display using the same method as creation
// Format date and time for display - Updated to handle both date and time_logged fields
const formatDateTime = (isoString) => {
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
    
    // If no time component, try to extract just the date
    const dateOnlyMatch = isoString.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (dateOnlyMatch) {
      const [, year, month, day] = dateOnlyMatch;
      const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    }
    
    // Fallback if regex doesn't match
    console.log('No regex match for:', isoString);
    return 'Invalid date format';
  } catch (error) {
    console.error('Error formatting date:', error);
    return 'Invalid date';
  }
};

  // Helper function to get the correct date field based on entry type
  const getEntryDate = (entry, entryType) => {
    switch (entryType) {
      case 'hydration':
        return entry.date;
      case 'sleep':
        return entry.date;
      default:
        return entry.date;
    }
  };

  // Show loading screen while checking role
  if (roleCheckLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-100 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-lg p-8 text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mb-4"></div>
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
            You don't have permission to access the Wellness Tracker. This feature is only available to users with the "wellness_tracker" role.
          </p>
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
            <div className="flex items-start">
              <AlertTriangle className="w-5 h-5 text-yellow-600 mr-2 mt-0.5" />
              <div className="text-sm text-yellow-800">
                <p className="font-medium">Current Role: {user?.role || 'No role assigned'}</p>
                <p>Required Role: wellness_tracker</p>
              </div>
            </div>
          </div>
          <p className="text-sm text-gray-500 mb-6">
            Please contact your administrator to request access to the Wellness Tracker feature.
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

  const tabs = [
    { id: 'nutrition', label: 'Nutrition', icon: Utensils, color: 'green' },
    { id: 'sleep', label: 'Sleep', icon: Moon, color: 'blue' },
    { id: 'mood', label: 'Mood', icon: Smile, color: 'yellow' },
    { id: 'meditation', label: 'Meditation', icon: Brain, color: 'purple' },
    { id: 'hydration', label: 'Hydration', icon: Droplets, color: 'cyan' }
  ];

  const getTabColor = (tabId) => {
    const tab = tabs.find(t => t.id === tabId);
    return tab ? tab.color : 'gray';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-purple-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Heart className="w-6 h-6 text-purple-600" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Wellness Tracker</h1>
                  <p className="text-sm text-gray-600">Track your health and wellness journey</p>
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              {user && (
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900">{user.username}</p>
                  <p className="text-xs text-gray-600">{user.email}</p>
                </div>
              )}
              <button
                onClick={handleLogout}
                className="flex items-center px-3 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                title="Logout"
              >
                <LogOut className="w-4 h-4 mr-2" />
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4 mb-8">
          <div className="bg-white rounded-lg shadow-sm p-4">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <Utensils className="w-5 h-5 text-green-600" />
              </div>
              <div className="ml-3">
                <p className="text-xs text-gray-600">Nutrition</p>
                <p className="text-lg font-semibold text-gray-900">{summary.nutrition_entries}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm p-4">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Moon className="w-5 h-5 text-blue-600" />
              </div>
              <div className="ml-3">
                <p className="text-xs text-gray-600">Sleep</p>
                <p className="text-lg font-semibold text-gray-900">{summary.sleep_entries}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm p-4">
            <div className="flex items-center">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <Smile className="w-5 h-5 text-yellow-600" />
              </div>
              <div className="ml-3">
                <p className="text-xs text-gray-600">Mood</p>
                <p className="text-lg font-semibold text-gray-900">{summary.mood_entries}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm p-4">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Brain className="w-5 h-5 text-purple-600" />
              </div>
              <div className="ml-3">
                <p className="text-xs text-gray-600">Meditation</p>
                <p className="text-lg font-semibold text-gray-900">{summary.meditation_entries}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm p-4">
            <div className="flex items-center">
              <div className="p-2 bg-cyan-100 rounded-lg">
                <Droplets className="w-5 h-5 text-cyan-600" />
              </div>
              <div className="ml-3">
                <p className="text-xs text-gray-600">Hydration</p>
                <p className="text-lg font-semibold text-gray-900">{summary.hydration_entries}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm p-4">
            <div className="flex items-center">
              <div className="p-2 bg-pink-100 rounded-lg">
                <Target className="w-5 h-5 text-pink-600" />
              </div>
              <div className="ml-3">
                <p className="text-xs text-gray-600">Total</p>
                <p className="text-lg font-semibold text-gray-900">{summary.total_entries}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="bg-white rounded-lg shadow-sm">
          {/* Tabs */}
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-6" aria-label="Tabs">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => handleTabChange(tab.id)}
                    className={`${
                      isActive
                        ? `border-${tab.color}-500 text-${tab.color}-600`
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center`}
                  >
                    <Icon className="w-4 h-4 mr-2" />
                    {tab.label}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Content Header */}
          <div className="p-6 border-b border-gray-200">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 sm:mb-0 capitalize">
                {activeTab} Entries
              </h2>
              
              <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-4">
                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder={`Search ${activeTab} entries...`}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>
                
                {/* Add Button */}
                <button
                  onClick={() => setShowAddForm(true)}
                  disabled={loading}
                  className={`flex items-center px-4 py-2 bg-${getTabColor(activeTab)}-600 text-white rounded-lg hover:bg-${getTabColor(activeTab)}-700 transition-colors disabled:opacity-50`}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}
                </button>
              </div>
            </div>
          </div>

          {/* Entries List */}
          <div className="divide-y divide-gray-200">
            {loading ? (
              <div className="p-8 text-center">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
                <p className="mt-2 text-gray-600">Loading entries...</p>
              </div>
            ) : filteredEntries.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <Heart className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                <p>No {activeTab} entries found. Start by adding your first entry!</p>
              </div>
            ) : (
              filteredEntries.map((entry) => (
                <div key={entry.id} className="p-6 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      {activeTab === 'nutrition' && (
                        <div>
                          <h3 className="text-lg font-medium text-gray-900 capitalize">
                            {entry.meal_type} - {entry.food_items}
                          </h3>
                          <div className="flex items-center text-sm text-gray-500 mt-1 flex-wrap gap-4">
                            <span>{entry.calories} cal</span>
                            {entry.protein && <span>{entry.protein}g protein</span>}
                            {entry.carbs && <span>{entry.carbs}g carbs</span>}
                            {entry.fat && <span>{entry.fat}g fat</span>}
                            <div className="flex items-center">
                              <Calendar className="w-4 h-4 mr-1" />
                              {formatDateTime(getEntryDate(entry, 'nutrition'))}
                            </div>
                          </div>
                        </div>
                      )}
                      
                      {activeTab === 'sleep' && (
                        <div>
                          <h3 className="text-lg font-medium text-gray-900">
                            Sleep Entry
                          </h3>
                          <div className="flex items-center text-sm text-gray-500 mt-1 flex-wrap gap-4">
                            {entry.sleep_duration && <span>{entry.sleep_duration} min</span>}
                            {entry.sleep_quality && <span>Quality: {entry.sleep_quality}/10</span>}
                            {entry.bedtime && (
                              <span>
                                Bedtime: {extractTimeFromISO(entry.bedtime)}
                              </span>
                            )}
                            {entry.wake_time && (
                              <span>
                                Wake: {extractTimeFromISO(entry.wake_time)}
                              </span>
                            )}
                            <div className="flex items-center">
                              <Calendar className="w-4 h-4 mr-1" />
                              {entry.bedtime ? extractDateFromISO(entry.bedtime) : 'No date'}
                            </div>
                          </div>
                        </div>
                      )}
                      
                      {activeTab === 'mood' && (
                        <div>
                          <h3 className="text-lg font-medium text-gray-900 capitalize">
                            {entry.mood_type} Mood
                          </h3>
                          <div className="flex items-center text-sm text-gray-500 mt-1 flex-wrap gap-4">
                            <span>Rating: {entry.mood_rating}/10</span>
                            {entry.energy_level && <span>Energy: {entry.energy_level}/10</span>}
                            {entry.stress_level && <span>Stress: {entry.stress_level}/10</span>}
                            <div className="flex items-center">
                              <Calendar className="w-4 h-4 mr-1" />
                              {formatDateTime(getEntryDate(entry, 'mood'))}
                            </div>
                          </div>
                        </div>
                      )}
                      
                      {activeTab === 'meditation' && (
                        <div>
                          <h3 className="text-lg font-medium text-gray-900 capitalize">
                            {entry.meditation_type} Meditation
                          </h3>
                          <div className="flex items-center text-sm text-gray-500 mt-1 flex-wrap gap-4">
                            <div className="flex items-center">
                              <Clock className="w-4 h-4 mr-1" />
                              {entry.duration} minutes
                            </div>
                            <div className="flex items-center">
                              <Calendar className="w-4 h-4 mr-1" />
                              {formatDateTime(getEntryDate(entry, 'meditation'))}
                            </div>
                          </div>
                        </div>
                      )}
                      
                      {activeTab === 'hydration' && (
                        <div>
                          <h3 className="text-lg font-medium text-gray-900">
                            Water Intake
                          </h3>
                          <div className="flex items-center text-sm text-gray-500 mt-1 flex-wrap gap-4">
                            <span>{entry.water_intake}L</span>
                            <div className="flex items-center">
                              <Calendar className="w-4 h-4 mr-1" />
                              {formatDateTime(getEntryDate(entry, 'hydration'))}
                            </div>
                          </div>
                        </div>
                      )}
                      
                      {entry.notes && (
                        <p className="text-sm text-gray-600 mt-2">{entry.notes}</p>
                      )}
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      {/* Edit Button - Show for all entry types now */}
                      <button
                        onClick={() => handleEditEntry(entry)}
                        disabled={loading}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-50"
                        title="Edit entry"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      
                      <button
                        onClick={() => deleteEntry(entry.id, activeTab)}
                        disabled={loading}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                        title="Delete entry"
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

      {/* Add Entry Modal */}
      {showAddForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6 max-h-96 overflow-y-auto">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 capitalize">
              Add New {activeTab} Entry
            </h3>
            
            <form onSubmit={handleAddEntry} className="space-y-4">
              {/* Nutrition Form */}
              {activeTab === 'nutrition' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Meal Type *
                    </label>
                    <select
                      value={newEntry.meal_type}
                      onChange={(e) => setNewEntry({...newEntry, meal_type: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      required
                    >
                      <option value="breakfast">Breakfast</option>
                      <option value="lunch">Lunch</option>
                      <option value="dinner">Dinner</option>
                      <option value="snack">Snack</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Food Items *
                    </label>
                    <input
                      type="text"
                      value={newEntry.food_items}
                      onChange={(e) => setNewEntry({...newEntry, food_items: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      placeholder="e.g., Grilled chicken salad"
                      required
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Calories
                      </label>
                      <input
                        type="number"
                        value={newEntry.calories}
                        onChange={(e) => setNewEntry({...newEntry, calories: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        placeholder="300"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Protein (g)
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        value={newEntry.protein}
                        onChange={(e) => setNewEntry({...newEntry, protein: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        placeholder="25"
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Carbs (g)
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        value={newEntry.carbs}
                        onChange={(e) => setNewEntry({...newEntry, carbs: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        placeholder="30"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Sugar (g)
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        value={newEntry.sugar}
                        onChange={(e) => setNewEntry({...newEntry, sugar: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        placeholder="5"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Fat (g)
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        value={newEntry.fat}
                        onChange={(e) => setNewEntry({...newEntry, fat: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        placeholder="10"
                      />
                    </div>
                  </div>
                </>
              )}

              {/* Sleep Form */}
              {activeTab === 'sleep' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Entry Date *
                    </label>
                    <input
                      type="datetime-local"
                      value={newEntry.date_time}
                      onChange={(e) => setNewEntry({...newEntry, date_time: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Bedtime
                      </label>
                      <input
                        type="time"
                        value={newEntry.bedtime}
                        onChange={(e) => setNewEntry({...newEntry, bedtime: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Wake Time
                      </label>
                      <input
                        type="time"
                        value={newEntry.wake_time}
                        onChange={(e) => setNewEntry({...newEntry, wake_time: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Sleep Quality (1-10)
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="10"
                        value={newEntry.sleep_quality}
                        onChange={(e) => setNewEntry({...newEntry, sleep_quality: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="8"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Duration (minutes)
                      </label>
                      <input
                        type="number"
                        value={newEntry.sleep_duration}
                        onChange={(e) => setNewEntry({...newEntry, sleep_duration: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="480"
                      />
                    </div>
                  </div>
                </>
              )}

              {/* Mood Form */}
              {activeTab === 'mood' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Mood Rating (1-10) *
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="10"
                      value={newEntry.mood_rating}
                      onChange={(e) => setNewEntry({...newEntry, mood_rating: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                      placeholder="7"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Mood Type *
                    </label>
                    <select
                      value={newEntry.mood_type}
                      onChange={(e) => setNewEntry({...newEntry, mood_type: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                      required
                    >
                      <option value="happy">Happy</option>
                      <option value="sad">Sad</option>
                      <option value="anxious">Anxious</option>
                      <option value="calm">Calm</option>
                      <option value="excited">Excited</option>
                      <option value="angry">Angry</option>
                      <option value="neutral">Neutral</option>
                    </select>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Energy Level (1-10)
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="10"
                        value={newEntry.energy_level}
                        onChange={(e) => setNewEntry({...newEntry, energy_level: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                        placeholder="6"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Stress Level (1-10)
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="10"
                        value={newEntry.stress_level}
                        onChange={(e) => setNewEntry({...newEntry, stress_level: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                        placeholder="3"
                      />
                    </div>
                  </div>
                </>
              )}

              {/* Meditation Form */}
              {activeTab === 'meditation' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Duration(minutes) *
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={newEntry.duration}
                      onChange={(e) => setNewEntry({...newEntry, duration: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      placeholder="20"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Meditation Type *
                    </label>
                    <select
                      value={newEntry.meditation_type}
                      onChange={(e) => setNewEntry({...newEntry, meditation_type: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      required
                    >
                      <option value="mindfulness">Mindfulness</option>
                      <option value="breathing">Breathing</option>
                      <option value="visualization">Visualization</option>
                      <option value="movement">Movement</option>
                    </select>
                  </div>
                </>
              )}

              {/* Hydration Form */}
              {activeTab === 'hydration' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Water Intake (Liters) *
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      value={newEntry.water_intake}
                      onChange={(e) => setNewEntry({...newEntry, water_intake: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                      placeholder="0.5"
                      required
                    />
                  </div>
                </>
              )}

              {/* Common Date & Time Field for all forms except sleep */}
              {activeTab !== 'sleep' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Date & Time *
                  </label>
                  <input
                    type="datetime-local"
                    value={newEntry.date_time}
                    onChange={(e) => setNewEntry({...newEntry, date_time: e.target.value})}
                    className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-${getTabColor(activeTab)}-500 focus:border-transparent`}
                    required
                  />
                </div>
              )}

              {/* Common Notes Field */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes
                </label>
                <textarea
                  value={newEntry.notes}
                  onChange={(e) => setNewEntry({...newEntry, notes: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  rows="3"
                  placeholder="Any additional notes..."
                />
              </div>
              
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddForm(false);
                    resetForm();
                  }}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className={`px-4 py-2 bg-${getTabColor(activeTab)}-600 text-white rounded-lg hover:bg-${getTabColor(activeTab)}-700 transition-colors disabled:opacity-50`}
                >
                  {loading ? 'Adding...' : `Add ${activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Entry Modal - Updated to support nutrition, sleep, mood, meditation, and hydration */}
      {showEditForm && (activeTab === 'nutrition' || activeTab === 'sleep' || activeTab === 'mood' || activeTab === 'meditation' || activeTab === 'hydration') && editingEntry && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6 max-h-96 overflow-y-auto">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 capitalize">
              Edit {activeTab} Entry
            </h3>
            
            <form onSubmit={handleUpdateEntry} className="space-y-4">
              {/* Nutrition Edit Form */}
              {activeTab === 'nutrition' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Meal Type *
                    </label>
                    <select
                      value={newEntry.meal_type}
                      onChange={(e) => setNewEntry({...newEntry, meal_type: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      required
                    >
                      <option value="breakfast">Breakfast</option>
                      <option value="lunch">Lunch</option>
                      <option value="dinner">Dinner</option>
                      <option value="snack">Snack</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Food Items *
                    </label>
                    <input
                      type="text"
                      value={newEntry.food_items}
                      onChange={(e) => setNewEntry({...newEntry, food_items: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      placeholder="e.g., Grilled chicken salad"
                      required
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Calories
                      </label>
                      <input
                        type="number"
                        value={newEntry.calories}
                        onChange={(e) => setNewEntry({...newEntry, calories: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        placeholder="300"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Protein (g)
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        value={newEntry.protein}
                        onChange={(e) => setNewEntry({...newEntry, protein: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        placeholder="25"
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Carbs (g)
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        value={newEntry.carbs}
                        onChange={(e) => setNewEntry({...newEntry, carbs: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        placeholder="30"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Sugar (g)
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        value={newEntry.sugar}
                        onChange={(e) => setNewEntry({...newEntry, sugar: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        placeholder="5"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Fat (g)
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        value={newEntry.fat}
                        onChange={(e) => setNewEntry({...newEntry, fat: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        placeholder="10"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Date & Time *
                    </label>
                    <input
                      type="datetime-local"
                      value={newEntry.date_time}
                      onChange={(e) => setNewEntry({...newEntry, date_time: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      required
                    />
                  </div>
                </>
              )}

              {/* Sleep Edit Form */}
              {activeTab === 'sleep' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Entry Date *
                    </label>
                    <input
                      type="datetime-local"
                      value={newEntry.date_time}
                      onChange={(e) => setNewEntry({...newEntry, date_time: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Bedtime
                      </label>
                      <input
                        type="time"
                        value={newEntry.bedtime}
                        onChange={(e) => setNewEntry({...newEntry, bedtime: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Wake Time
                      </label>
                      <input
                        type="time"
                        value={newEntry.wake_time}
                        onChange={(e) => setNewEntry({...newEntry, wake_time: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Sleep Quality (1-10)
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="10"
                        value={newEntry.sleep_quality}
                        onChange={(e) => setNewEntry({...newEntry, sleep_quality: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="8"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Duration (minutes)
                      </label>
                      <input
                        type="number"
                        value={newEntry.sleep_duration}
                        onChange={(e) => setNewEntry({...newEntry, sleep_duration: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="480"
                      />
                    </div>
                  </div>
                </>
              )}

              {/* Mood Edit Form */}
              {activeTab === 'mood' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Date & Time *
                    </label>
                    <input
                      type="datetime-local"
                      value={newEntry.date_time}
                      onChange={(e) => setNewEntry({...newEntry, date_time: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Mood Type *
                    </label>
                    <select
                      value={newEntry.mood_type}
                      onChange={(e) => setNewEntry({...newEntry, mood_type: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      required
                    >
                      <option value="happy">Happy</option>
                      <option value="sad">Sad</option>
                      <option value="anxious">Anxious</option>
                      <option value="calm">Calm</option>
                      <option value="excited">Excited</option>
                      <option value="angry">Angry</option>
                      <option value="neutral">Neutral</option>
                      <option value="frustrated">Frustrated</option>
                      <option value="content">Content</option>
                      <option value="overwhelmed">Overwhelmed</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Mood Rating (1-10) *
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="10"
                      value={newEntry.mood_rating}
                      onChange={(e) => setNewEntry({...newEntry, mood_rating: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      placeholder="7"
                      required
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Energy Level (1-10)
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="10"
                        value={newEntry.energy_level}
                        onChange={(e) => setNewEntry({...newEntry, energy_level: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        placeholder="5"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Stress Level (1-10)
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="10"
                        value={newEntry.stress_level}
                        onChange={(e) => setNewEntry({...newEntry, stress_level: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        placeholder="3"
                      />
                    </div>
                  </div>
                </>
              )}

              {/* Meditation Edit Form */}
              {activeTab === 'meditation' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Date & Time *
                    </label>
                    <input
                      type="datetime-local"
                      value={newEntry.date_time}
                      onChange={(e) => setNewEntry({...newEntry, date_time: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Meditation Type *
                    </label>
                    <select
                      value={newEntry.meditation_type}
                      onChange={(e) => setNewEntry({...newEntry, meditation_type: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      required
                    >
                      <option value="mindfulness">Mindfulness</option>
                      <option value="guided">Guided</option>
                      <option value="breathing">Breathing</option>
                      <option value="transcendental">Transcendental</option>
                      <option value="movement">Movement</option>
                      <option value="mantra">Mantra</option>
                      <option value="visualization">Visualization</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Duration (minutes) *
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={newEntry.duration}
                      onChange={(e) => setNewEntry({...newEntry, duration: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      placeholder="20"
                      required
                    />
                  </div>
                </>
              )}

              {/* Hydration Edit Form */}
              {activeTab === 'hydration' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Date & Time *
                    </label>
                    <input
                      type="datetime-local"
                      value={newEntry.date_time}
                      onChange={(e) => setNewEntry({...newEntry, date_time: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Water Intake (liters) *
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      value={newEntry.water_intake}
                      onChange={(e) => setNewEntry({...newEntry, water_intake: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                      placeholder="0.5"
                      required
                    />
                  </div>
                </>
              )}

              {/* Common Notes Field */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes
                </label>
                <textarea
                  value={newEntry.notes}
                  onChange={(e) => setNewEntry({...newEntry, notes: e.target.value})}
                  className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-${getTabColor(activeTab)}-500 focus:border-transparent`}
                  rows="3"
                  placeholder="Any additional notes..."
                />
              </div>
              
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditForm(false);
                    setEditingEntry(null);
                    resetForm();
                  }}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className={`px-4 py-2 bg-${getTabColor(activeTab)}-600 text-white rounded-lg hover:bg-${getTabColor(activeTab)}-700 transition-colors disabled:opacity-50`}
                >
                  {loading ? 'Updating...' : `Update ${activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default WellnessDashboard;