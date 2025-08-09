# Activity Tracker Application

A comprehensive activity and wellness tracking application with role-based access control, built with FastAPI backend and React frontend.

## 🌟 Features

### Core Functionality
- **User Authentication**: Secure JWT-based authentication with terms & conditions acceptance
- **Role-Based Access Control**: Three distinct user roles with fixed permissions
- **Activity Tracking**: Log and monitor various physical activities
- **Goal Management**: Set, track, and manage fitness goals
- **Statistics & Analytics**: Comprehensive user statistics and progress tracking
- **Dashboard**: Real-time overview of activities, goals, and progress

### Wellness Tracking (Premium Feature)
- **Nutrition Tracking**: Log meals, calories, and macronutrients
- **Sleep Monitoring**: Track sleep quality, duration, and patterns
- **Mood Tracking**: Monitor emotional well-being and energy levels
- **Meditation Logging**: Record meditation sessions and mindfulness activities
- **Hydration Tracking**: Monitor daily water intake

### Administrative Features
- **User Management**: Create and manage sub-users
- **Audit Logging**: Complete action history and system monitoring
- **Permission Management**: Fixed role-based permissions system

## 🏗️ Architecture

### Backend (FastAPI)
- **Framework**: FastAPI 2.0.0
- **Database**: SQLAlchemy ORM with SQLite/PostgreSQL support
- **Authentication**: JWT tokens with refresh token support
- **API Documentation**: Auto-generated OpenAPI/Swagger documentation
- **CORS**: Configured for development and production environments

### Frontend (React)
- **Framework**: React with modern hooks
- **Styling**: Tailwind CSS for responsive design
- **State Management**: React useState and useEffect
- **Authentication**: Token-based authentication with auto-login
- **Routing**: Component-based routing for different dashboards

## 👥 User Roles & Permissions

### Admin
- **Full System Access**: Complete control over all features
- **User Management**: Create, update, and delete sub-users
- **Activity Management**: Full CRUD operations on activities and goals
- **Wellness Tracking**: Access to all wellness features
- **Audit Logs**: View system audit trails
- **Statistics**: Comprehensive reporting and analytics

### Exercise Tracker
- **Basic Dashboard Access**: View exercise tracker dashboard
- **Authentication**: Login and logout functionality

### Wellness Tracker
- **Wellness Dashboard**: Access to comprehensive wellness tracking interface
  - Nutrition tracking UI
  - Sleep monitoring interface
  - Mood tracking forms
  - Meditation logging
  - Hydration tracking
- **Wellness Analytics**: View wellness statistics and trends

## 🔐 Authentication Flow

1. **Terms Acceptance**: Users must first agree to terms and conditions
2. **Registration/Login**: Create account or authenticate with existing credentials
3. **JWT Token**: Receive access and refresh tokens
4. **Authenticated Access**: Use tokens for protected API endpoints
5. **Token Refresh**: Automatic token renewal for seamless experience

## 📊 API Endpoints

### Authentication
- `GET /terms` - Get terms and conditions
- `POST /terms/agree` - Accept terms and get auth token
- `POST /register` - Register new user
- `POST /login` - User authentication
- `POST /auth/logout` - User logout
- `GET /auth/me` - Get current user info
- `POST /auth/refresh` - Refresh access token

### Activities
- `POST /activities` - Create new activity *(Admin, Exercise Tracker only)*
- `GET /activities` - Get user activities *(Admin, Exercise Tracker only)*
- `PUT /activities/{id}` - Update specific activity *(Admin, Exercise Tracker only)*
- `DELETE /activities/{id}` - Delete activity *(Admin, Exercise Tracker only)*

### Goals
- `POST /goals` - Create new goal *(Admin, Exercise Tracker only)*
- `GET /goals` - Get user goals *(Admin, Exercise Tracker only)*
- `PUT /goals/{id}` - Update goal *(Admin, Exercise Tracker only)*

### Wellness Endpoints *(Admin, Wellness Tracker only)*
- **Nutrition**: `/wellness/nutrition` (GET, POST, PUT, DELETE)
- **Sleep**: `/wellness/sleep` (GET, POST, PUT, DELETE)
- **Mood**: `/wellness/mood` (GET, POST, PUT, DELETE)
- **Meditation**: `/wellness/meditation` (GET, POST, PUT, DELETE)
- **Hydration**: `/wellness/hydration` (GET, POST, PUT, DELETE)
- **Summary**: `/wellness/summary` - Get wellness dashboard data

### Admin Endpoints
- **Exercise Trackers**: `/exercise_trackers` - Manage exercise tracker users
- **Wellness Trackers**: `/wellness_trackers` - Manage wellness tracker users
- **Audit Logs**: `/audit-logs` - View system audit trails
- **Permissions**: `/permissions` - View role permissions

### Dashboard & Statistics
- `GET /dashboard` - Complete user dashboard data
- `GET /stats` - User statistics
- `GET /profile` - User profile
- `PUT /profile` - Update user profile

## 🛡️ Security Features

### Data Protection
- **Password Hashing**: Secure bcrypt password hashing
- **JWT Tokens**: Secure token-based authentication
- **Token Expiration**: Automatic token expiration and refresh
- **CORS Protection**: Configured CORS for secure cross-origin requests

### Access Control
- **Role-Based Permissions**: Fixed permissions per user role
- **Route Protection**: Protected API endpoints based on permissions
- **Audit Logging**: Complete action history for security monitoring

## 📱 Frontend Components

### Main Components
- **App.jsx**: Main application component with routing logic
- **LoginRegister**: Authentication interface
- **Dashboard**: Basic exercise tracker dashboard (limited functionality)
- **AdminDashboard**: Administrative interface for user management
- **WellnessDashboard**: Comprehensive wellness tracking interface
- **TermsAndConditions**: Terms acceptance component

## 📈 Monitoring & Analytics

### Audit Logging
- All user actions are logged with timestamps
- Admin users can view complete audit trails
- Automatic cleanup of expired auth tokens

### Statistics Tracking
- Activity streaks and progress
- Wellness trend analysis
