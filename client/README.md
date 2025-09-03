# TPPMS React Frontend

A complete React-based frontend for the Team Project & People Management System (TPPMS), built to work exactly like the HTML frontend with enhanced functionality and modern UI components.

## 🚀 Features

### ✅ Complete Authentication System
- **Email/Password Login**: Traditional login with backend API integration
- **Google OAuth Integration**: Full Google Sign-In support with automatic role detection
- **Session Management**: Secure session handling with automatic role-based routing
- **Role-Based Access Control**: Automatic redirection based on user roles (Admin, Project Owner, Team Member)

### ✅ Comprehensive Admin Dashboard
- **Bench Summary**: Real-time bench analytics with charts and metrics
- **User Management**: Complete user overview with active, new, and inactive users
- **Project Management**: Project status tracking and management
- **Data Visualization**: Interactive charts using Chart.js
- **CSV Export**: Download functionality for bench summary data

### ✅ Project Owner Dashboard
- **Project List View**: Comprehensive project overview with allocation percentages
- **Time Allocation Management**: Editable weekly time allocation tables
- **Project Selection**: Interactive project selection and management
- **Copy Last Week**: Functionality to copy previous week's allocations

### ✅ Team Member Dashboard
- **Time Allocation View**: Weekly breakdown of project time allocations
- **Project Overview**: List of assigned projects with roles
- **Summary Dashboard**: Visual summary with metrics and weekly overview
- **Responsive Tables**: Sticky columns and mobile-friendly design

### ✅ Advanced Time Selection
- **Smart Period Detection**: Automatic current period highlighting
- **Week Calculations**: Dynamic week calculation based on month/year
- **Visual Indicators**: Current period highlighting with color coding
- **Interactive Selection**: Click-based month and week selection

### ✅ Modern UI/UX
- **Responsive Design**: Mobile-first responsive layout
- **Tailwind CSS**: Modern utility-first CSS framework
- **Font Awesome Icons**: Professional icon set throughout the application
- **Smooth Animations**: CSS transitions and hover effects
- **Professional Styling**: Consistent design language matching the HTML frontend

## 🛠️ Technology Stack

- **React 18**: Latest React with hooks and modern patterns
- **React Router**: Client-side routing with protected routes
- **Tailwind CSS**: Utility-first CSS framework
- **Chart.js**: Interactive charts and data visualization
- **Font Awesome**: Professional icon library
- **Vite**: Fast build tool and development server

## 📁 Project Structure

```
src/
├── components/
│   ├── AdminDashboard.jsx    # Admin dashboard with charts
│   ├── Navbar.jsx            # Navigation with role-based menu
│   └── TimeSelector.jsx      # Advanced time period selection
├── pages/
│   ├── Admin.jsx             # Complete admin interface
│   ├── Login.jsx             # Authentication with Google OAuth
│   ├── ProjectOwner.jsx      # Project owner dashboard
│   └── TeamMember.jsx        # Team member interface
├── utils/
│   ├── api.js                # Backend API integration
│   └── csv.js                # CSV export functionality
├── App.jsx                   # Main application with routing
└── index.css                 # Global styles and custom CSS
```

## 🔧 Installation & Setup

### Prerequisites
- Node.js 16+ and npm
- Backend server running on `http://127.0.0.1:8000`

### Setup Steps
1. **Clone and Install Dependencies**
   ```bash
   cd tppms-react
   npm install
   ```

2. **Start Development Server**
   ```bash
   npm run dev
   ```

3. **Build for Production**
   ```bash
   npm run build
   ```

## 🌐 API Integration

The React frontend integrates with the TPPMS backend APIs:

### Authentication Endpoints
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `GET /api/auth/me` - Current user info

### Admin Endpoints
- `GET /api/admin/dashboard-summary` - Admin dashboard data
- `GET /api/admin/user-counts` - User statistics
- `GET /api/admin/users/*` - User management
- `GET /api/admin/projects/*` - Project management

### Project & Allocation Endpoints
- `GET /api/projects/my-projects` - User's projects
- `GET /api/projects/my-po-projects` - Project owner projects
- `GET /api/projects/*/editable-allocations` - Editable allocations
- `PUT /api/allocations/*` - Update allocations

### Bench Management
- `GET /api/bench/summary` - Bench summary
- `GET /api/bench/fully-benched` - Fully benched users
- `GET /api/bench/partial-benched` - Partially benched users

## 🔐 Authentication Flow

1. **Login Process**
   - User enters email/password or uses Google OAuth
   - Backend validates credentials and returns user data
   - Frontend stores session and user information
   - Automatic role detection and routing

2. **Role-Based Routing**
   - **Admin**: `/admin` - Full admin dashboard
   - **Project Owner**: `/po` - Project management interface
   - **Team Member**: `/team` - Time allocation view

3. **Session Management**
   - Session ID stored in sessionStorage
   - Automatic API authentication
   - Secure logout with session cleanup

## 📊 Data Visualization

### Admin Dashboard Charts
- **Bench Summary Bar Chart**: Visual representation of bench status
- **User Distribution Doughnut Chart**: User status breakdown
- **Project Status Chart**: Project lifecycle overview

### Interactive Elements
- **Real-time Updates**: Live data from backend APIs
- **Responsive Charts**: Mobile-friendly chart components
- **Data Export**: CSV download functionality

## 🎨 UI Components

### Time Selector
- **Smart Period Detection**: Automatic current period highlighting
- **Interactive Selection**: Click-based month and week selection
- **Visual Feedback**: Color-coded current and selected periods

### Navigation
- **Role-Based Menu**: Dynamic navigation based on user role
- **User Profile**: User information and logout functionality
- **Mobile Responsive**: Collapsible mobile navigation

### Tables
- **Sticky Columns**: Fixed first column for better UX
- **Responsive Design**: Mobile-friendly table layouts
- **Hover Effects**: Interactive row highlighting

## 🚀 Key Improvements Over HTML Frontend

1. **Enhanced User Experience**
   - Single-page application (SPA) with smooth transitions
   - Real-time data updates without page refreshes
   - Interactive charts and data visualization

2. **Better Performance**
   - Component-based architecture for efficient rendering
   - Optimized API calls with proper error handling
   - Lazy loading and code splitting capabilities

3. **Modern Development**
   - Type-safe development with proper error handling
   - Component reusability and maintainability
   - Modern React patterns and best practices

4. **Enhanced Functionality**
   - Advanced time period selection with visual indicators
   - Comprehensive admin dashboard with charts
   - Better project management interface

## 🔒 Security Features

- **Session Management**: Secure session handling
- **Role-Based Access**: Protected routes based on user roles
- **API Security**: Proper authentication headers
- **Input Validation**: Client-side and server-side validation

## 📱 Responsive Design

- **Mobile-First**: Optimized for mobile devices
- **Tablet Support**: Responsive layouts for tablets
- **Desktop Experience**: Full-featured desktop interface
- **Touch-Friendly**: Optimized for touch interactions

## 🧪 Testing

The application has been tested for:
- ✅ Authentication flows (email/password and Google OAuth)
- ✅ Role-based routing and access control
- ✅ API integration with backend services
- ✅ Responsive design across devices
- ✅ Data visualization and chart functionality
- ✅ CSV export functionality
- ✅ Time period selection and management

## 🚀 Getting Started

1. **Start the Backend Server**
   ```bash
   cd backend
   python main.py
   ```

2. **Start the React Frontend**
   ```bash
   cd tppms-react
   npm run dev
   ```

3. **Access the Application**
   - Open `http://localhost:5173` in your browser
   - Login with test credentials or Google OAuth
   - Navigate based on your user role

## 📝 Test Credentials

- **Email**: `bhavesh.korane@tekditechnologies.com`
- **Password**: Any password (ignored by backend)
- **Default Role**: Team Member (auto-detected based on actual roles)

## 🤝 Contributing

This React frontend is designed to be a complete replacement for the HTML frontend while maintaining all functionality and improving the user experience. All components are built with modern React patterns and are fully compatible with the existing backend APIs.

## 📄 License

This project is part of the TPPMS system and follows the same licensing terms.
