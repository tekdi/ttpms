# TPPMS React Frontend 🚀

Team Project & People Management System - Modern React Frontend with Docker deployment

## 📋 Table of Contents

- [Quick Start](#-quick-start)
- [Environment Configuration](#-environment-configuration)
- [Development Setup](#-development-setup)
- [Production Deployment](#-production-deployment)
- [API Configuration](#-api-configuration)
- [Features](#-features)
- [Security](#-security)
- [Troubleshooting](#-troubleshooting)

## 🚀 Quick Start

### Prerequisites
- Docker and Docker Compose installed
- Backend API running (see backend README.md)
- Node.js 18+ (for local development)

### 1. Environment Setup
```bash
# Copy environment template
cp env.example .env

# Edit environment variables (REQUIRED)
nano .env
```

**⚠️ Important**: Update the following variables in your `.env` file:
- `VITE_API_BASE_URL` - Your backend API URL
- `VITE_GOOGLE_CLIENT_ID` - Your Google OAuth Client ID

### 2. Deploy (Production)
```bash
# Production deployment
docker-compose up --build -d

# Check status
docker-compose ps
docker-compose logs -f
```

### 3. Access Application
- **Production**: http://localhost:3000
- **Development**: http://localhost:5173
- **Health Check**: http://localhost:3000/health

## 🔧 Environment Configuration

### Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `VITE_API_BASE_URL` | Backend API URL | `http://localhost:8000/api` |
| `VITE_GOOGLE_CLIENT_ID` | Google OAuth Client ID | `your-client-id.apps.googleusercontent.com` |
| `VITE_APP_NAME` | Application name | `"TPPMS"` |
| `VITE_APP_DESCRIPTION` | App description | `"Team Project & People Management System"` |
| `VITE_APP_VERSION` | Application version | `"1.0.0"` |

### Deployment Configuration

| Variable | Description | Options |
|----------|-------------|---------|
| `DEPLOY_TARGET` | Deployment mode | `development`, `production` |
| `FRONTEND_PORT` | External port | `3000`, `5173` |
| `CONTAINER_NAME` | Container name | `tppms-frontend` |

### Environment Examples

#### Development (.env)
```bash
DEPLOY_TARGET=development
FRONTEND_PORT=5173
INTERNAL_PORT=5173
VITE_DEBUG_MODE=true
VITE_ENABLE_CONSOLE_LOGS=true
VITE_API_BASE_URL=http://localhost:8000/api
VITE_GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
```

#### Production (.env)
```bash
DEPLOY_TARGET=production
FRONTEND_PORT=3000
INTERNAL_PORT=80
VITE_DEBUG_MODE=false
VITE_ENABLE_CONSOLE_LOGS=false
VITE_API_BASE_URL=https://api.yourdomain.com/api
VITE_GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
```

## 💻 Development Setup

### Local Development (Without Docker)
```bash
# Install dependencies
npm install

# Copy environment file
cp env.example .env

# Edit .env with your configuration
nano .env

# Start development server
npm run dev
```

### Docker Development
```bash
# Set development mode in .env
DEPLOY_TARGET=development
FRONTEND_PORT=5173
INTERNAL_PORT=5173

# Start development container
docker-compose up --build

# View logs
docker-compose logs -f tppms-frontend
```

### Development Features
- ✅ Hot reload enabled
- ✅ Debug mode active
- ✅ Console logging enabled
- ✅ Source maps available
- ✅ Volume mounting for live code changes

### Development Commands
```bash
# View logs
docker-compose logs -f tppms-frontend

# Access container shell
docker-compose exec tppms-frontend sh

# Rebuild container
docker-compose up --build --force-recreate

# Run tests (if available)
npm test
```

## 🏭 Production Deployment

### Local Production
```bash
# Set production mode in .env
DEPLOY_TARGET=production
FRONTEND_PORT=3000
VITE_DEBUG_MODE=false

# Deploy
docker-compose up --build -d
```

### Server Deployment
```bash
# 1. Clone repository
git clone https://github.com/tekdi/ttpms.git
cd ttpms/frontend

# 2. Configure environment
cp env.example .env
# Edit .env with production values

# 3. Deploy
docker-compose up --build -d

# 4. Setup reverse proxy (nginx/traefik)
# 5. Configure SSL certificate
```

### Production Optimizations
- ✅ Multi-stage Docker build
- ✅ Nginx static file serving
- ✅ Gzip compression enabled
- ✅ Security headers configured
- ✅ Health check endpoint
- ✅ Minimal image size (~50MB)

## 🔗 API Configuration

### Backend Connection

The frontend connects to the backend API using the `VITE_API_BASE_URL` environment variable.

#### Local Development
```bash
VITE_API_BASE_URL=http://localhost:8000/api
```

#### Production
```bash
VITE_API_BASE_URL=https://api.yourdomain.com/api
```

### Required Backend Endpoints

The frontend expects these API endpoints to be available:

#### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `GET /api/auth/me` - Get current user

#### Projects
- `GET /api/projects/my-po-projects-simple` - Get user projects
- `GET /api/projects/{id}/users` - Get project users
- `GET /api/projects/{id}/weekly-allocations` - Get allocations

#### Allocations
- `POST /api/projects/{id}/create-allocation` - Create allocation
- `PUT /api/allocations/{id}` - Update allocation
- `GET /api/allocation/check-overallocation` - Check overallocation

#### Admin (if admin features enabled)
- `GET /api/admin/dashboard-summary` - Admin dashboard
- `GET /api/bench/summary` - Bench summary report

### API Authentication

The frontend uses session-based authentication with the `X-Session-ID` header:

```javascript
// Automatic header injection
headers: {
  'X-Session-ID': sessionStorage.getItem('sessionId')
}
```

## ✨ Features

### Core Features
- 🔐 **Session-based Authentication** - Secure login with Google OAuth support
- 👥 **Role-based Access Control** - Admin, Project Owner, Team Member roles
- 📊 **Project Management** - Create, view, and manage projects
- ⏰ **Time Tracking** - Weekly allocation tracking and reporting
- 📈 **Dashboard Analytics** - Real-time insights and summaries
- 📱 **Responsive Design** - Mobile-friendly interface

### User Roles

#### Admin
- View system-wide dashboard
- Manage all projects and users
- Access bench summary reports
- System configuration

#### Project Owner
- Manage assigned projects
- Allocate team members to projects
- Track weekly allocations
- View project analytics

#### Team Member
- View assigned projects
- Track personal time allocations
- Submit weekly reports
- View personal dashboard

### Technical Features
- ⚡ **Vite Build System** - Fast development and optimized builds
- 🎨 **Tailwind CSS** - Modern, utility-first styling
- 🔄 **Real-time Updates** - Live data synchronization
- 📦 **Component Architecture** - Reusable React components
- 🚀 **Performance Optimized** - Code splitting and lazy loading

## 🔒 Security

### Production Security Features
- ✅ Security headers configured
- ✅ Content Security Policy (CSP)
- ✅ Non-root user in container
- ✅ Minimal attack surface
- ✅ No sensitive data in logs
- ✅ Environment variable validation

### Security Best Practices
1. **Environment Variables**: Never commit `.env` files to version control
2. **HTTPS**: Use SSL/TLS in production
3. **API Keys**: Rotate Google OAuth client ID regularly
4. **Dependencies**: Keep dependencies updated
5. **Monitoring**: Monitor for security vulnerabilities

### Google OAuth Setup

1. **Create Google OAuth App**:
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create a new project or select existing
   - Enable Google+ API
   - Create OAuth 2.0 credentials

2. **Configure OAuth**:
   ```bash
   # Add to .env
   VITE_GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
   ```

3. **Set Authorized Origins**:
   - Development: `http://localhost:5173`, `http://localhost:3000`
   - Production: `https://yourdomain.com`

## 🔍 Troubleshooting

### Common Issues

#### 1. Container Won't Start
```bash
# Check logs
docker-compose logs tppms-frontend

# Common causes:
# - Missing required environment variables
# - Port already in use
# - Docker daemon not running
```

#### 2. API Connection Failed
```bash
# Check API URL in .env
echo $VITE_API_BASE_URL

# Test API connectivity
curl http://localhost:8000/api/health

# Check network connectivity
docker-compose exec tppms-frontend ping backend
```

#### 3. Build Failures
```bash
# Clean build cache
docker system prune -f

# Rebuild from scratch
docker-compose build --no-cache

# Check environment variables
docker-compose config
```

#### 4. Environment Variables Not Working
```bash
# Verify .env file exists
ls -la .env

# Check environment loading
docker-compose exec tppms-frontend env | grep VITE_

# Rebuild after .env changes
docker-compose up --build --force-recreate
```

#### 5. Google OAuth Issues
```bash
# Check client ID configuration
echo $VITE_GOOGLE_CLIENT_ID

# Verify authorized origins in Google Console
# Development: http://localhost:5173, http://localhost:3000
# Production: https://yourdomain.com
```

### Debug Commands

```bash
# View container status
docker-compose ps

# View real-time logs
docker-compose logs -f

# Access container shell
docker-compose exec tppms-frontend sh

# Test health endpoint
curl http://localhost:3000/health

# View environment variables
docker-compose exec tppms-frontend env | grep VITE_
```

### Performance Issues

```bash
# Check resource usage
docker stats tppms-frontend

# Optimize for production
VITE_DEBUG_MODE=false
VITE_ENABLE_CONSOLE_LOGS=false

# Enable nginx caching
# (Already configured in production build)
```

## 📊 Monitoring

### Health Checks
```bash
# Built-in health endpoint
curl http://localhost:3000/health

# Docker health check
docker-compose ps
# Should show "healthy" status
```

### Logs
```bash
# Application logs
docker-compose logs -f tppms-frontend

# Nginx access logs (production)
docker-compose exec tppms-frontend tail -f /var/log/nginx/access.log

# Nginx error logs (production)
docker-compose exec tppms-frontend tail -f /var/log/nginx/error.log
```

## 📝 Development Notes

### Project Structure
```
tppms-react/
├── Dockerfile              # Multi-stage Docker build
├── docker-compose.yml      # Container orchestration
├── .env.example            # Environment template
├── README.md               # This file
├── src/
│   ├── components/         # Reusable React components
│   │   ├── AdminDashboard.jsx
│   │   ├── GlobalNotification.jsx
│   │   ├── Navbar.jsx
│   │   └── ...
│   ├── pages/              # Page components
│   │   ├── Admin.jsx
│   │   ├── Login.jsx
│   │   ├── ProjectOwner.jsx
│   │   └── TeamMember.jsx
│   ├── config/             # Configuration files
│   │   └── environment.js
│   ├── utils/              # Utility functions
│   │   ├── api.js
│   │   ├── apiWithStatusHandling.js
│   │   └── csv.js
│   └── styles/             # CSS files
└── scripts/                # Build and deployment scripts
```

### Key Technologies
- **React 18** - Modern React with hooks
- **Vite** - Fast build tool and dev server
- **Tailwind CSS** - Utility-first CSS framework
- **Chart.js** - Data visualization
- **React Router** - Client-side routing
- **Docker** - Containerization

### Development Workflow
1. Make changes to source code
2. Hot reload shows changes instantly (development mode)
3. Test changes locally
4. Build and test production image
5. Deploy to staging/production

## 🆘 Need Help?

### Quick Fixes
1. **Check logs**: `docker-compose logs -f`
2. **Verify environment**: `docker-compose config`
3. **Test API**: `curl http://localhost:8000/api/health`
4. **Rebuild**: `docker-compose up --build --force-recreate`

### Support Resources
- Backend setup: See `../backend/README.md`
- Docker documentation: [docs.docker.com](https://docs.docker.com/)
- React documentation: [reactjs.org](https://reactjs.org/)
- Vite documentation: [vitejs.dev](https://vitejs.dev/)

---

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

**Note**: This is a production-ready frontend application. Ensure all environment variables are properly configured before deploying to production environments.