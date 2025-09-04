# TPPMS Backend API

A FastAPI-based backend service for the Time and Project Performance Management System (TPPMS).

## 🚀 Features

- **FastAPI Framework**: Modern, fast web framework for building APIs
- **Session-based Authentication**: Secure user authentication without passwords
- **MySQL Database**: Robust relational database support
- **CORS Support**: Cross-origin resource sharing for frontend integration
- **Environment Configuration**: Flexible configuration management
- **Docker Support**: Containerized deployment ready
- **RESTful API**: Clean and intuitive API endpoints

## 📋 Prerequisites

- Python 3.8+
- MySQL 5.7+ or 8.0+
- pip (Python package manager)
- Git

## 🛠️ Installation & Setup

### 1. Clone the Repository

```bash
git clone https://github.com/tekdi/ttpms.git
cd ttpms/backend
```

### 2. Create Virtual Environment

```bash
# Create virtual environment
python -m venv venv

# Activate virtual environment
# On Linux/Mac:
source venv/bin/activate
# On Windows:
venv\Scripts\activate
```

### 3. Install Dependencies

```bash
pip install -r requirements.txt
```

### 4. Environment Configuration

```bash
# Copy environment template
cp env.example .env

# Edit .env file with your configuration
nano .env
```

**Required Environment Variables:**

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | MySQL connection string | `mysql+pymysql://username:password@localhost:3306/tppms` |
| `SECRET_KEY` | JWT signing key (32+ chars) | Generate using command below |

**Generate Secure Secret Key:**
```bash
python -c "import secrets; print(secrets.token_urlsafe(32))"
```

### 5. Database Setup

```bash
# Create MySQL database
mysql -u root -p
CREATE DATABASE tppms;
EXIT;

# Import schema (if available)
mysql -u root -p tppms < ../tppms_schema.sql
```

### 6. Start the Server

```bash
# Development mode
uvicorn main:app --reload --host 0.0.0.0 --port 8000

# Production mode
uvicorn main:app --host 0.0.0.0 --port 8000 --workers 4
```

The API will be available at: `http://localhost:8000`

## 🐳 Docker Deployment

### Using Docker Compose (Recommended)

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

### Manual Docker Build

```bash
# Build image
docker build -t tppms-backend .

# Run container
docker run -d \
  --name tppms-backend \
  -p 8000:8000 \
  --env-file .env \
  tppms-backend
```

## 📚 API Documentation

Once the server is running, access the interactive API documentation:

- **Swagger UI**: `http://localhost:8000/docs`
- **ReDoc**: `http://localhost:8000/redoc`

### Key Endpoints

#### Authentication
```bash
POST /api/auth/login          # User login
POST /api/auth/logout         # User logout
GET  /api/auth/me            # Get current user info
```

#### Users & Roles
```bash
GET  /api/users              # List all users
GET  /api/users/{user_id}    # Get user details
GET  /api/roles              # List all roles
```

#### Projects & Time Tracking
```bash
GET  /api/projects           # List projects
GET  /api/timesheet         # Get timesheet data
POST /api/timesheet/update  # Update time entries
```

## 🔧 Configuration

### Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DATABASE_URL` | ✅ | - | MySQL connection string |
| `SECRET_KEY` | ✅ | - | JWT signing secret |
| `ENVIRONMENT` | ❌ | `production` | Environment mode |
| `DEBUG` | ❌ | `false` | Debug mode |
| `ALLOWED_ORIGINS` | ❌ | `["*"]` | CORS allowed origins |
| `LOG_LEVEL` | ❌ | `INFO` | Logging level |

### CORS Configuration

For production, update `ALLOWED_ORIGINS` in your `.env`:

```bash
# Development (allow all)
ALLOWED_ORIGINS=["*"]

# Production (specific domains)
ALLOWED_ORIGINS=["https://yourdomain.com","https://www.yourdomain.com"]
```

## 🧪 Testing

```bash
# Run tests (if available)
pytest

# Test API endpoints
curl -X GET http://localhost:8000/api/health

# Test authentication
curl -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com", "password": "password"}'
```

## 📝 Development

### Code Structure

```
backend/
├── main.py              # FastAPI application and routes
├── config.py            # Configuration management
├── database.py          # Database connection setup
├── requirements.txt     # Python dependencies
├── Dockerfile          # Docker configuration
├── docker-compose.yml  # Multi-container setup
└── .env.example        # Environment template
```

### Adding New Endpoints

1. Define Pydantic models for request/response
2. Add route handlers in `main.py`
3. Update API documentation
4. Test the endpoints

### Database Migrations

For schema changes:
1. Update the database schema
2. Create migration scripts
3. Test in development environment
4. Apply to production

## 🔒 Security

### Best Practices Implemented

- ✅ Environment variable validation
- ✅ Secure session-based authentication
- ✅ CORS configuration
- ✅ Input validation with Pydantic
- ✅ SQL injection prevention with SQLAlchemy

### Security Recommendations

1. **Secret Key**: Use a strong, random SECRET_KEY (32+ characters)
2. **Database**: Use dedicated database user with minimal permissions
3. **HTTPS**: Always use HTTPS in production
4. **CORS**: Restrict ALLOWED_ORIGINS to specific domains
5. **Environment**: Never commit `.env` files to version control

### Generate Secure Credentials

```bash
# Generate SECRET_KEY
python -c "import secrets; print(secrets.token_urlsafe(32))"

# Generate database password
python -c "import secrets; print(secrets.token_urlsafe(16))"
```

## 🚀 Deployment

### Production Checklist

- [ ] Set `ENVIRONMENT=production`
- [ ] Use strong `SECRET_KEY`
- [ ] Configure specific `ALLOWED_ORIGINS`
- [ ] Set up SSL/TLS certificates
- [ ] Configure reverse proxy (nginx/apache)
- [ ] Set up monitoring and logging
- [ ] Configure database backups
- [ ] Set up health checks

### Environment-specific Configurations

**Development:**
```bash
ENVIRONMENT=development
DEBUG=true
ALLOWED_ORIGINS=["http://localhost:3000","http://localhost:5173"]
```

**Production:**
```bash
ENVIRONMENT=production
DEBUG=false
ALLOWED_ORIGINS=["https://yourdomain.com"]
```

## 📊 Monitoring & Logging

### Health Check

```bash
curl http://localhost:8000/api/health
```

### Logs

```bash
# Docker logs
docker-compose logs -f tppms-backend

# Application logs are configured with structured logging
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

For support and questions:

1. Check the [API Documentation](http://localhost:8000/docs)
2. Review this README
3. Check existing issues on GitHub
4. Create a new issue if needed

## 🔄 Version History

- **v1.0.0** - Initial release with core functionality
  - Session-based authentication
  - User and role management
  - Project and timesheet APIs
  - Docker support

---

**Note**: This is a production-ready backend service. Ensure all security configurations are properly set before deploying to production environments.