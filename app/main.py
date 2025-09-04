import logging
from fastapi import FastAPI, HTTPException, Depends, status, Request, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from passlib.context import CryptContext
from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any
import uuid
from pydantic import BaseModel
from config import settings
from database import get_db, SessionLocal
import calendar
import json
# from utils import calculate_experience

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Initialize FastAPI app
app = FastAPI(title="TPPMS API", version="1.0.0")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins for development
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Session storage
user_sessions = {}  # {session_id: user_id}
session_to_user = {}  # {session_id: user_data}

# Security
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Pydantic models for request/response
class LoginRequest(BaseModel):
    email: str
    password: str

class UserResponse(BaseModel):
    id: int
    login: str
    firstname: str
    lastname: str
    admin: bool
    status: int
    created_on: Optional[str] = None

class RoleResponse(BaseModel):
    id: int
    name: str
    permissions: Optional[str] = None

class ProjectResponse(BaseModel):
    id: int
    name: str
    description: Optional[str] = None
    status: int
    role: str

class LoginResponse(BaseModel):
    success: bool
    data: Dict[str, Any]
    message: str = "Login successful"

# Session management functions
def generate_session_id():
    """Generate unique session ID"""
    return str(uuid.uuid4())

def create_user_session(user_data):
    """Create session for user"""
    session_id = generate_session_id()
    user_sessions[session_id] = user_data["id"]
    session_to_user[session_id] = user_data
    return session_id

def get_user_from_session(session_id):
    """Get user data from session"""
    if session_id in user_sessions:
        user_data = session_to_user.get(session_id)
        return user_data
    return None

def remove_user_session(session_id):
    """Remove user session on logout"""
    if session_id in user_sessions:
        user_id = user_sessions[session_id]
        del user_sessions[session_id]
    if session_id in session_to_user:
        del session_to_user[session_id]

def get_session_id(request: Request):
    """Get session ID from request headers"""
    session_id = request.headers.get("X-Session-ID")
    if not session_id:
        raise HTTPException(status_code=401, detail="Session ID required")
    return session_id

def get_current_user(session_id: str = Depends(get_session_id), db: SessionLocal = Depends(get_db)):
    """Get current user from session"""
    user_data = get_user_from_session(session_id)
    if not user_data:
        raise HTTPException(status_code=401, detail="Invalid session")
    return user_data

def get_current_week_info():
    """Calculate current week information based on Monday-Friday (Corporate Week)"""
    today = datetime.now()
    
    # Use the same logic as frontend timeManager
    # Find the first Monday of the year
    january_first = datetime(today.year, 1, 1)
    first_monday = january_first
    while first_monday.weekday() != 0:  # Monday is 0
        first_monday += timedelta(days=1)
    
    # Calculate current week number
    diff_time = today - first_monday
    diff_weeks = (diff_time.days // 7) + 1
    current_week = max(1, diff_weeks)
    
    # Calculate the Monday of current week
    monday = first_monday + timedelta(weeks=current_week - 1)
    
    # Find the Friday of this week
    friday = monday + timedelta(days=4)
    
    return {
        "current_week": current_week,
        "current_year": today.year,
        "monday_date": monday.strftime("%Y-%m-%d"),
        "friday_date": friday.strftime("%Y-%m-%d"),
        "monday_display": monday.strftime("%b %d"),
        "friday_display": friday.strftime("%b %d")
    }

def get_editable_weeks():
    """Get weeks that fall within the last 15 days"""
    today = datetime.now()
    fifteen_days_ago = today - timedelta(days=15)
    
    weeks = []
    current_date = fifteen_days_ago
    
    while current_date <= today:
        # Find Monday of this week
        days_since_monday = current_date.weekday()
        monday = current_date - timedelta(days=days_since_monday)
        friday = monday + timedelta(days=4)
        
        # Only include if this week overlaps with our 15-day window
        if friday >= fifteen_days_ago and monday <= today:
            week_number = monday.isocalendar()[1]
            year = monday.year
            
            # Check if week spans two months
            if monday.month != friday.month:
                display_text = f"Week {week_number}: {monday.strftime('%b %d')}-{friday.strftime('%b %d')}"
            else:
                display_text = f"Week {week_number}: {monday.strftime('%b %d')}-{friday.strftime('%d')}"
            
            week_info = {
                "week_number": week_number,
                "year": year,
                "monday_date": monday.strftime("%Y-%m-%d"),
                "friday_date": friday.strftime("%Y-%m-%d"),
                "display_text": display_text,
                "is_current_week": monday <= today <= friday,
                "is_editable": True
            }
            
            # Avoid duplicate weeks
            if not any(w["week_number"] == week_number and w["year"] == year for w in weeks):
                weeks.append(week_info)
        
        current_date += timedelta(days=7)
    
    return weeks

def get_week_info_for_week(week_number, year):
    """Get week information for a specific week number and year (Corporate Week)"""
    # Use the same logic as frontend timeManager
    # Find the first Monday of the year
    january_first = datetime(year, 1, 1)
    first_monday = january_first
    while first_monday.weekday() != 0:  # Monday is 0
        first_monday += timedelta(days=1)
    
    # Calculate the Monday of the specified week
    monday = first_monday + timedelta(weeks=week_number - 1)
    
    # Find the Friday of this week
    friday = monday + timedelta(days=4)
    
    return {
        "week": week_number,
        "year": year,
        "monday_date": monday.strftime("%Y-%m-%d"),
        "friday_date": friday.strftime("%Y-%m-%d"),
        "monday_display": monday.strftime("%b %d"),
        "friday_display": friday.strftime("%b %d")
    }

# API Routes

@app.get("/")
def read_root():
    return {"message": "TPPMS API is running"}

@app.get("/api/test-auth")
def test_auth(current_user: dict = Depends(get_current_user)):
    """Test authentication endpoint"""
    return {
        "success": True,
        "message": "Authentication working",
        "user_id": current_user["id"],
        "user_login": current_user["login"]
    }

@app.get("/api/test-week-calculation")
def test_week_calculation():
    """Test week calculation to verify consistency with frontend"""
    current_week_info = get_current_week_info()
    current_week = current_week_info["current_week"]
    current_year = current_week_info["current_year"]
    
    # Test specific weeks including week 33
    test_weeks = []
    for week in [33, 34, 35]:
        week_info = get_week_info_for_week(week, current_year)
        test_weeks.append(week_info)
    
    # Add today's info for comparison
    today = datetime.now()
    today_iso = today.isocalendar()
    
    return {
        "success": True,
        "current_week_info": current_week_info,
        "test_weeks": test_weeks,
        "today_info": {
            "date": today.strftime("%Y-%m-%d"),
            "iso_week": today_iso[1],
            "iso_year": today_iso[0],
            "weekday": today.strftime("%A")
        }
    }

@app.get("/api/test-po-query/{user_id}")
def test_po_query(user_id: int, db: SessionLocal = Depends(get_db)):
    """Test PO projects query for a specific user"""
    try:
        
        # Test the exact query
        result = db.execute(text("""
            SELECT DISTINCT p.id, p.name, p.description, p.status, r.name as role_name
            FROM projects p 
            JOIN members m ON p.id = m.project_id 
            JOIN member_roles mr ON m.id = mr.member_id 
            JOIN roles r ON mr.role_id = r.id 
            WHERE m.user_id = :user_id 
            AND p.status = 1
            AND (r.name = 'Project Owner' OR r.name = 'Project Creator' OR r.name LIKE '%Manager%' OR r.name LIKE '%Admin%')
            ORDER BY p.name
        """), {"user_id": user_id})
        
        projects = [dict(project._mapping) for project in result.fetchall()]
        
        return {
            "success": True,
            "user_id": user_id,
            "projects": projects
        }
        
    except Exception as e:
        return {
            "success": False,
            "error": str(e)
        }

@app.post("/api/auth/login", response_model=LoginResponse)
def login(request: LoginRequest, db: SessionLocal = Depends(get_db)):
    """User login with email only - no password verification"""
    try:
        
        # Get user by email - only check if user exists and is active
        result = db.execute(
            text("SELECT * FROM users WHERE login = :email AND status = 1"),
            {"email": request.email}
        )
        user = result.fetchone()
        
        if not user:
            raise HTTPException(status_code=401, detail="User not found or inactive")
        
        user_dict = dict(user._mapping)
        
        # No password verification - just check if user exists and is active
        
        # Get user roles
        roles_result = db.execute(text("""
            SELECT r.id, r.name, r.permissions 
            FROM roles r 
            JOIN member_roles mr ON r.id = mr.role_id 
            JOIN members m ON mr.member_id = m.id 
            WHERE m.user_id = :user_id
        """), {"user_id": user_dict["id"]})
        
        roles = [dict(role._mapping) for role in roles_result.fetchall()]

        user_roles = []
        for i in roles:
            user_roles.append(i['id']) 
        # Get user projects
        projects_result = db.execute(text("""
            SELECT p.id, p.name, p.description, p.status, r.name as role_name
            FROM projects p 
            JOIN members m ON p.id = m.project_id 
            JOIN member_roles mr ON m.id = mr.member_id 
            JOIN roles r ON mr.role_id = r.id 
            WHERE m.user_id = :user_id AND p.status = 1
        """), {"user_id": user_dict["id"]})
        
        projects = [dict(project._mapping) for project in projects_result.fetchall()]

        # Calculate total experience if needed
        # total_experience = calculate_experience(user_dict)
        total_experience = 0

        
        # Create user session
        user_data = {
            "id": user_dict["id"],
            "login": user_dict["login"],
            "firstname": user_dict["firstname"],
            "lastname": user_dict["lastname"],
            "PO":bool(3 in user_roles),
            "admin": bool(user_dict["admin"]),
            "status": user_dict["status"],
            "total_experience": total_experience,
            "skills": user_dict.get("skill", None),
            "created_on": user_dict["created_on"].isoformat() if user_dict["created_on"] else None
        }


        session_id = create_user_session(user_data)
        
        # Prepare response
        response_data = {
            "user": user_data,
            "roles": roles,
            "projects": projects,
            "session_id": session_id,
            "message": "Login successful"
        }

        
        return LoginResponse(success=True, data=response_data)
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"bhavesh Login failed: {str(e)}")

@app.get("/api/auth/me")
def get_current_user_info(current_user: dict = Depends(get_current_user)):
    """Get current user information"""
    try:
        return {
            "success": True,
            "data": {
                "id": current_user["id"],
                "login": current_user["login"],
                "firstname": current_user["firstname"],
                "lastname": current_user["lastname"],
                "admin": bool(current_user["admin"]),
                "status": current_user["status"],
                "created_on": current_user["created_on"].isoformat() if current_user["created_on"] else None
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get user info: {str(e)}")

@app.get("/api/users/profile")
def get_user_profile(current_user: dict = Depends(get_current_user), db: SessionLocal = Depends(get_db)):
    """Get current user profile with roles and projects"""
    try:
        user_id = current_user["id"]
        
        # Get user roles
        roles_result = db.execute(text("""
            SELECT r.id, r.name, r.permissions 
            FROM roles r 
            JOIN member_roles mr ON r.id = mr.role_id 
            JOIN members m ON mr.member_id = m.id 
            WHERE m.user_id = :user_id
        """), {"user_id": user_id})
        
        roles = [dict(role._mapping) for role in roles_result.fetchall()]

        
        # Get user projects
        projects_result = db.execute(text("""
            SELECT p.id, p.name, p.description, p.status, r.name as role_name
            FROM projects p 
            JOIN members m ON p.id = m.project_id 
            JOIN member_roles mr ON m.id = mr.member_id 
            JOIN roles r ON mr.role_id = r.id 
            WHERE m.user_id = :user_id AND p.status = 1
        """), {"user_id": user_id})
        
        projects = [dict(project._mapping) for project in projects_result.fetchall()]
        
        return {
            "success": True,
            "data": {
                "user": {
                    "id": current_user["id"],
                    "login": current_user["login"],
                    "firstname": current_user["firstname"],
                    "lastname": current_user["lastname"],
                    "admin": bool(current_user["admin"]),
                    "status": current_user["status"],
                    "created_on": current_user["created_on"].isoformat() if current_user["created_on"] else None
                },
                "roles": roles,
                "projects": projects
            }
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get profile: {str(e)}")

@app.post("/api/auth/logout")
def logout(session_id: str = Depends(get_session_id)):
    """User logout"""
    remove_user_session(session_id)
    return {
        "success": True,
        "message": "Logged out successfully"
    }

@app.get("/api/projects/my-projects")
def get_user_projects(current_user: dict = Depends(get_current_user), db: SessionLocal = Depends(get_db)):
    """Get projects assigned to current user"""
    try:
        user_id = current_user["id"]
        
        result = db.execute(text("""
            SELECT p.id, p.name, p.description, p.status, r.name as role_name
            FROM projects p 
            JOIN members m ON p.id = m.project_id 
            JOIN member_roles mr ON m.id = mr.member_id 
            JOIN roles r ON mr.role_id = r.id 
            WHERE m.user_id = :user_id AND p.status = 1
        """), {"user_id": user_id})
        
        projects = [dict(project._mapping) for project in result.fetchall()]
        
        return {
            "success": True,
            "data": {
                "projects": projects
            }
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get projects: {str(e)}")

@app.get("/api/allocation")
def get_user_allocations(
    year: int,
    month: Optional[int] = None,
    weeks: Optional[str] = None,
    current_user: dict = Depends(get_current_user),
    db: SessionLocal = Depends(get_db)
):
    """Get user time allocations"""
    try:
        user_id = current_user["id"]
        
        # Build query based on parameters
        query = """
            SELECT ua.*, p.name as project_name 
            FROM user_allocation ua 
            JOIN projects p ON ua.project_id = p.id 
            WHERE ua.user_id = :user_id AND ua.year = :year
        """
        params = {"user_id": user_id, "year": year}
        
        if weeks:
            week_list = [int(w.strip()) for w in weeks.split(",")]
            query += " AND ua.week IN :weeks"
            params["weeks"] = tuple(week_list)
        
        query += " ORDER BY ua.week, p.name"
        
        result = db.execute(text(query), params)
        allocations = [dict(allocation._mapping) for allocation in result.fetchall()]
        
        return {
            "success": True,
            "data": {
                "allocations": allocations
            }
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get allocations: {str(e)}")

@app.get("/api/projects/{project_id}/users")
def get_project_users(
    project_id: int,
    current_user: dict = Depends(get_current_user),
    db: SessionLocal = Depends(get_db)
):
    """Get all users in a specific project"""
    logger.info(f"API: project-users called - project_id: {project_id}, user_id: {current_user.get('id')}")
    try:
        # First check if current user has access to this project
        access_check = db.execute(text("""
            SELECT m.id FROM members m 
            WHERE m.user_id = :user_id AND m.project_id = :project_id
        """), {"user_id": current_user["id"], "project_id": project_id})
        
        if not access_check.fetchone():
            raise HTTPException(status_code=403, detail="Access denied to this project")
        
        # Get all users in the project with their roles
        result = db.execute(text("""
            SELECT 
                u.id,
                u.login,
                u.firstname,
                u.lastname,
                u.admin,
                u.status,
                u.created_on,
                r.name as role_name,
                r.id as role_id
            FROM users u 
            JOIN members m ON u.id = m.user_id 
            JOIN member_roles mr ON m.id = mr.member_id 
            JOIN roles r ON mr.role_id = r.id 
            WHERE m.project_id = :project_id AND u.status = 1
            ORDER BY u.firstname, u.lastname
        """), {"project_id": project_id})
        
        users = [dict(user._mapping) for user in result.fetchall()]
        
        # Get project details
        project_result = db.execute(text("""
            SELECT id, name, description, status 
            FROM projects 
            WHERE id = :project_id
        """), {"project_id": project_id})
        
        project = project_result.fetchone()
        if not project:
            raise HTTPException(status_code=404, detail="Project not found")
        
        logger.info(f"API: project-users result - project_id: {project_id}, found {len(users)} users")
        
        return {
            "success": True,
            "data": {
                "project": dict(project._mapping),
                "users": users
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get project users: {str(e)}")

@app.get("/api/projects/my-po-projects")
def get_my_po_projects(current_user: dict = Depends(get_current_user), db: SessionLocal = Depends(get_db)):
    """Get projects where current user is Project Owner"""
    try:
        user_id = current_user["id"]
        
        # Query to find projects where user has Project Owner or Project Creator role
        result = db.execute(text("""
            SELECT DISTINCT p.id, p.name, p.description, p.status, r.name as role_name
            FROM projects p 
            JOIN members m ON p.id = m.project_id 
            JOIN member_roles mr ON m.id = mr.member_id 
            JOIN roles r ON mr.role_id = r.id 
            WHERE m.user_id = :user_id 
            AND p.status = 1
            AND (r.name = 'Project Owner' OR r.name = 'Project Creator' OR r.name LIKE '%Manager%' OR r.name LIKE '%Admin%')
            ORDER BY p.name
        """), {"user_id": user_id})
        
        projects = [dict(project._mapping) for project in result.fetchall()]
        
        return {
            "success": True,
            "data": {
                "projects": projects
            }
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get PO projects: {str(e)}")

@app.get("/api/projects/my-po-projects-simple")
def get_my_po_projects_simple(
    current_user: dict = Depends(get_current_user),
    db: SessionLocal = Depends(get_db)
):
    """Get simple list of projects where current user is Project Owner - no allocation data"""
    logger.info(f"API: my-po-projects-simple called - user_id: {current_user.get('id')}, user_login: {current_user.get('login')}")
    try:
        user_id = current_user["id"]

        # Simple query to get PO projects without complex JOINs
        result = db.execute(text("""
            SELECT DISTINCT p.id, p.name, p.description, p.status, r.name as role_name
            FROM projects p
            JOIN members m ON p.id = m.project_id
            JOIN member_roles mr ON m.id = mr.member_id
            JOIN roles r ON mr.role_id = r.id
            WHERE m.user_id = :user_id
            AND p.status = 1
            AND (r.name = 'Project Owner' OR r.name = 'Project Creator' OR r.name LIKE '%Manager%' OR r.name LIKE '%Admin%')
            ORDER BY p.name
        """), {"user_id": user_id})

        projects = [dict(project._mapping) for project in result.fetchall()]
        
        logger.info(f"API: my-po-projects-simple result - found {len(projects)} projects for user {user_id}")

        return {
            "success": True,
            "data": {
                "projects": projects
            }
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get PO projects: {str(e)}")

# ===== ADMIN DASHBOARD APIs =====

@app.get("/api/admin/dashboard-summary")
def get_admin_dashboard_summary(
    current_user: dict = Depends(get_current_user),
    db: SessionLocal = Depends(get_db)
):
    """Get admin dashboard summary data - Admin access only"""
    try:
        # Check if user is admin
        if not current_user.get("admin", False):
            raise HTTPException(status_code=403, detail="Admin access required")
        

        # Get user management counts
        active_users_query = """
            SELECT COUNT(*) FROM users 
            WHERE status = 1
        """
        active_users_result = db.execute(text(active_users_query))
        active_users_count = active_users_result.fetchone()[0]

        new_users_query = """
            SELECT COUNT(*) FROM users 
            WHERE status = 2
        """
        new_users_result = db.execute(text(new_users_query))
        new_users_count = new_users_result.fetchone()[0]

        inactive_users_query = """
            SELECT COUNT(*) FROM users 
            WHERE status = 3
        """
        inactive_users_result = db.execute(text(inactive_users_query))
        inactive_users_count = inactive_users_result.fetchone()[0]

        # Get project management counts
        active_projects_query = """
            SELECT COUNT(*) FROM projects 
            WHERE status = 1
        """
        active_projects_result = db.execute(text(active_projects_query))
        active_projects_count = active_projects_result.fetchone()[0]

        on_hold_projects_query = """
            SELECT COUNT(*) FROM projects 
            WHERE status = 2
        """
        on_hold_projects_result = db.execute(text(on_hold_projects_query))
        on_hold_projects_count = on_hold_projects_result.fetchone()[0]

        completed_projects_query = """
            SELECT COUNT(*) FROM projects 
            WHERE status = 3
        """
        completed_projects_result = db.execute(text(completed_projects_query))
        completed_projects_count = completed_projects_result.fetchone()[0]

        return {
            "success": True,
            "data": {
                "user_management": {
                    "active_users": {
                        "count": active_users_count,
                        "description": "users"
                    },
                    "new_users": {
                        "count": new_users_count,
                        "description": "pending approval"
                    },
                    "inactive_users": {
                        "count": inactive_users_count,
                        "description": "users"
                    }
                },
                "project_management": {
                    "active_projects": {
                        "count": active_projects_count,
                        "description": "projects"
                    },
                    "on_hold_projects": {
                        "count": on_hold_projects_count,
                        "description": "projects"
                    },
                    "completed_projects": {
                        "count": completed_projects_count,
                        "description": "projects"
                    }
                }
            }
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get dashboard summary: {str(e)}")

# User Management Count API
@app.get("/api/admin/user-counts")
def get_user_counts(
    current_user: dict = Depends(get_current_user),
    db: SessionLocal = Depends(get_db)
):
    """Get user counts by status - Admin access only"""
    logger.info(f"API: user-counts called - user: {current_user.get('login')}")
    try:
        if not current_user.get("admin", False):
            raise HTTPException(status_code=403, detail="Admin access required")
        
        # Get counts for different user statuses
        count_query = """
            SELECT 
                SUM(CASE WHEN status = 1 THEN 1 ELSE 0 END) as active_users,
                SUM(CASE WHEN status = 2 THEN 1 ELSE 0 END) as new_users,
                SUM(CASE WHEN status = 3 THEN 1 ELSE 0 END) as inactive_users
            FROM users
        """
        
        result = db.execute(text(count_query))
        counts = result.fetchone()
        
        logger.info(f"API: user-counts result - active: {counts[0]}, new: {counts[1]}, inactive: {counts[2]}")
        
        return {
            "success": True,
            "data": {
                "active_users": counts[0] or 0,
                "new_users": counts[1] or 0,
                "inactive_users": counts[2] or 0
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"API: user-counts error - {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get user counts: {str(e)}")

# User Management Detail APIs
@app.get("/api/admin/users/active")
def get_active_users(
    page: int = Query(default=1, ge=1),
    per_page: int = Query(default=20, ge=1, le=1000),
    search: Optional[str] = None,
    current_user: dict = Depends(get_current_user),
    db: SessionLocal = Depends(get_db)
):
    """Get active users list - Admin access only"""
    try:
        if not current_user.get("admin", False):
            raise HTTPException(status_code=403, detail="Admin access required")
        
        offset = (page - 1) * per_page
        
        # Build query with enhanced user data - only individual users with grouped roles
        base_query = """
            SELECT 
                u.id, u.firstname, u.lastname, u.login as email, u.status, 
                u.created_on as created_at, u.admin, u.date_of_joining, u.total_experience, u.skill,
                GROUP_CONCAT(DISTINCT COALESCE(r.name, 'N/A') ORDER BY r.name SEPARATOR ', ') as roles,
                CASE 
                    WHEN u.date_of_joining IS NOT NULL THEN 
                        CONCAT(ROUND(COALESCE(u.total_experience, 0) + (DATEDIFF(CURDATE(), u.date_of_joining) / 365.25), 1), ' years')
                    ELSE 
                        COALESCE(u.total_experience, 'N/A')
                END as total_experience_years
            FROM users u
            LEFT JOIN members m ON u.id = m.user_id
            LEFT JOIN member_roles mr ON m.id = mr.member_id
            LEFT JOIN roles r ON mr.role_id = r.id
            WHERE u.status = 1 
            AND u.firstname != '' 
            AND u.lastname != ''
            AND u.firstname NOT LIKE '%Team%'
            AND u.firstname NOT LIKE '%Users%'
            AND u.firstname NOT LIKE '%Anonymous%'
            AND u.firstname NOT LIKE '%Clients%'
            AND u.firstname NOT LIKE '%Consultants%'
            AND u.firstname NOT LIKE '%Non member%'
            AND u.firstname NOT LIKE '%All Tekdi%'
            AND u.firstname NOT LIKE '%Only Vowel%'
            AND u.firstname NOT LIKE '%Ashwin Test%'
            GROUP BY u.id, u.firstname, u.lastname, u.login, u.status, u.created_on, u.admin, u.date_of_joining, u.total_experience, u.skill
        """
        
        params = {}
        if search:
            base_query += " AND (u.firstname LIKE :search OR u.lastname LIKE :search OR u.email LIKE :search)"
            params["search"] = f"%{search}%"
        
        # Get total count
        count_query = f"SELECT COUNT(*) FROM ({base_query}) as subquery"
        count_result = db.execute(text(count_query), params)
        total = count_result.fetchone()[0]
        
        # Get paginated data
        base_query += " ORDER BY u.firstname, u.lastname LIMIT :limit OFFSET :offset"
        params["limit"] = per_page
        params["offset"] = offset
        
        result = db.execute(text(base_query), params)
        users = [dict(user._mapping) for user in result.fetchall()]
        
        logger.info(f"API: users/active result - found {len(users)} users")
        
        # Log first few users for debugging
        for i, user in enumerate(users[:3]):
            logger.info(f"API: users/active - User {i+1}: {user['firstname']} {user['lastname']}, Roles: {user.get('roles', 'N/A')}")
        
        return {
            "success": True,
            "data": {
                "users": users,
                "pagination": {
                    "page": page,
                    "per_page": per_page,
                    "total": total,
                    "pages": (total + per_page - 1) // per_page
                }
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get active users: {str(e)}")

@app.get("/api/admin/users/new")
def get_new_users(
    page: int = Query(default=1, ge=1),
    per_page: int = Query(default=20, ge=1, le=100),
    search: Optional[str] = None,
    current_user: dict = Depends(get_current_user),
    db: SessionLocal = Depends(get_db)
):
    """Get new users pending approval - Admin access only"""
    try:
        if not current_user.get("admin", False):
            raise HTTPException(status_code=403, detail="Admin access required")
        
        offset = (page - 1) * per_page
        
        base_query = """
            SELECT 
                u.id, u.firstname, u.lastname, u.login as email, u.status, 
                u.created_on as created_at, u.last_login_on as last_login, 
                COALESCE(r.name, 'N/A') as role
            FROM users u
            LEFT JOIN members m ON u.id = m.user_id
            LEFT JOIN member_roles mr ON m.id = mr.member_id
            LEFT JOIN roles r ON mr.role_id = r.id
            WHERE u.status = 2
        """
        
        params = {}
        if search:
            base_query += " AND (u.firstname LIKE :search OR u.lastname LIKE :search OR u.email LIKE :search)"
            params["search"] = f"%{search}%"
        
        # Get total count
        count_query = f"SELECT COUNT(*) FROM ({base_query}) as subquery"
        count_result = db.execute(text(count_query), params)
        total = count_result.fetchone()[0]
        
        # Get paginated data
        base_query += " ORDER BY u.created_at DESC LIMIT :limit OFFSET :offset"
        params["limit"] = per_page
        params["offset"] = offset
        
        result = db.execute(text(base_query), params)
        users = [dict(user._mapping) for user in result.fetchall()]
        
        return {
            "success": True,
            "data": {
                "users": users,
                "pagination": {
                    "page": page,
                    "per_page": per_page,
                    "total": total,
                    "pages": (total + per_page - 1) // per_page
                }
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get new users: {str(e)}")

@app.get("/api/admin/users/inactive")
def get_inactive_users(
    page: int = Query(default=1, ge=1),
    per_page: int = Query(default=20, ge=1, le=100),
    search: Optional[str] = None,
    current_user: dict = Depends(get_current_user),
    db: SessionLocal = Depends(get_db)
):
    """Get inactive users - Admin access only"""
    try:
        if not current_user.get("admin", False):
            raise HTTPException(status_code=403, detail="Admin access required")
        
        offset = (page - 1) * per_page
        
        base_query = """
            SELECT 
                u.id, u.firstname, u.lastname, u.login as email, u.status, 
                u.created_on as created_at, u.last_login_on as last_login, 
                COALESCE(r.name, 'N/A') as role
            FROM users u
            LEFT JOIN members m ON u.id = m.user_id
            LEFT JOIN member_roles mr ON m.id = mr.member_id
            LEFT JOIN roles r ON mr.role_id = r.id
            WHERE u.status = 3
        """
        
        params = {}
        if search:
            base_query += " AND (u.firstname LIKE :search OR u.lastname LIKE :search OR u.email LIKE :search)"
            params["search"] = f"%{search}%"
        
        # Get total count
        count_query = f"SELECT COUNT(*) FROM ({base_query}) as subquery"
        count_result = db.execute(text(count_query), params)
        total = count_result.fetchone()[0]
        
        # Get paginated data
        base_query += " ORDER BY u.last_login DESC LIMIT :limit OFFSET :offset"
        params["limit"] = per_page
        params["offset"] = offset
        
        result = db.execute(text(base_query), params)
        users = [dict(user._mapping) for user in result.fetchall()]
        
        return {
            "success": True,
            "data": {
                "users": users,
                "pagination": {
                    "page": page,
                    "per_page": per_page,
                    "total": total,
                    "pages": (total + per_page - 1) // per_page
                }
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get inactive users: {str(e)}")

# Project Management Detail APIs
@app.get("/api/admin/projects/active")
def get_active_projects(
    page: int = Query(default=1, ge=1),
    per_page: int = Query(default=20, ge=1, le=100),
    search: Optional[str] = None,
    current_user: dict = Depends(get_current_user),
    db: SessionLocal = Depends(get_db)
):
    """Get active projects list - Admin access only"""
    try:
        if not current_user.get("admin", False):
            raise HTTPException(status_code=403, detail="Admin access required")
        
        offset = (page - 1) * per_page
        
        base_query = """
            SELECT 
                p.id, p.name, p.description, p.status, p.customer_id,
                p.created_on as created_at, 'N/A' as customer_name,
                COUNT(DISTINCT m.user_id) as member_count,
                COALESCE(SUM(ua.billable_hrs + ua.non_billable_hrs + ua.leave_hrs), 0) as total_hours
            FROM projects p
            LEFT JOIN members m ON p.id = m.project_id
            LEFT JOIN user_allocation ua ON p.id = ua.project_id
            WHERE p.status = 1
        """
        
        params = {}
        if search:
            base_query += " AND (p.name LIKE :search OR p.description LIKE :search)"
            params["search"] = f"%{search}%"
        
        base_query += " GROUP BY p.id, p.name, p.description, p.status, p.customer_id, p.created_at, c.name"
        
        # Get total count
        count_query = f"SELECT COUNT(*) FROM ({base_query}) as subquery"
        count_result = db.execute(text(count_query), params)
        total = count_result.fetchone()[0]
        
        # Get paginated data
        base_query += " ORDER BY p.name LIMIT :limit OFFSET :offset"
        params["limit"] = per_page
        params["offset"] = offset
        
        result = db.execute(text(base_query), params)
        projects = [dict(project._mapping) for project in result.fetchall()]
        
        return {
            "success": True,
            "data": {
                "projects": projects,
                "pagination": {
                    "page": page,
                    "per_page": per_page,
                    "total": total,
                    "pages": (total + per_page - 1) // per_page
                }
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get active projects: {str(e)}")

@app.get("/api/admin/projects/on-hold")
def get_on_hold_projects(
    page: int = Query(default=1, ge=1),
    per_page: int = Query(default=20, ge=1, le=100),
    search: Optional[str] = None,
    current_user: dict = Depends(get_current_user),
    db: SessionLocal = Depends(get_db)
):
    """Get on-hold projects list - Admin access only"""
    try:
        if not current_user.get("admin", False):
            raise HTTPException(status_code=403, detail="Admin access required")
        
        offset = (page - 1) * per_page
        
        base_query = """
            SELECT 
                p.id, p.name, p.description, p.status, p.customer_id,
                p.created_on as created_at, 'N/A' as customer_name,
                COUNT(DISTINCT m.user_id) as member_count,
                COALESCE(SUM(ua.billable_hrs + ua.non_billable_hrs + ua.leave_hrs), 0) as total_hours
            FROM projects p
            LEFT JOIN members m ON p.id = m.project_id
            LEFT JOIN user_allocation ua ON p.id = ua.project_id
            WHERE p.status = 2
        """
        
        params = {}
        if search:
            base_query += " AND (p.name LIKE :search OR p.description LIKE :search)"
            params["search"] = f"%{search}%"
        
        base_query += " GROUP BY p.id, p.name, p.description, p.status, p.customer_id, p.created_at, c.name"
        
        # Get total count
        count_query = f"SELECT COUNT(*) FROM ({base_query}) as subquery"
        count_result = db.execute(text(count_query), params)
        total = count_result.fetchone()[0]
        
        # Get paginated data
        base_query += " ORDER BY p.name LIMIT :limit OFFSET :offset"
        params["limit"] = per_page
        params["offset"] = offset
        
        result = db.execute(text(base_query), params)
        projects = [dict(project._mapping) for project in result.fetchall()]
        
        return {
            "success": True,
            "data": {
                "projects": projects,
                "pagination": {
                    "page": page,
                    "per_page": per_page,
                    "total": total,
                    "pages": (total + per_page - 1) // per_page
                }
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get on-hold projects: {str(e)}")

@app.get("/api/admin/projects/completed")
def get_completed_projects(
    page: int = Query(default=1, ge=1),
    per_page: int = Query(default=20, ge=1, le=100),
    search: Optional[str] = None,
    current_user: dict = Depends(get_current_user),
    db: SessionLocal = Depends(get_db)
):
    """Get completed projects list - Admin access only"""
    try:
        if not current_user.get("admin", False):
            raise HTTPException(status_code=403, detail="Admin access required")
        
        offset = (page - 1) * per_page
        
        base_query = """
            SELECT 
                p.id, p.name, p.description, p.status, p.customer_id,
                p.created_on as created_at, 'N/A' as customer_name,
                COUNT(DISTINCT m.user_id) as member_count,
                COALESCE(SUM(ua.billable_hrs + ua.non_billable_hrs + ua.leave_hrs), 0) as total_hours
            FROM projects p
            LEFT JOIN members m ON p.id = m.project_id
            LEFT JOIN user_allocation ua ON p.id = ua.project_id
            WHERE p.status = 3
        """
        
        params = {}
        if search:
            base_query += " AND (p.name LIKE :search OR p.description LIKE :search)"
            params["search"] = f"%{search}%"
        
        base_query += " GROUP BY p.id, p.name, p.description, p.status, p.customer_id, p.created_at, c.name"
        
        # Get total count
        count_query = f"SELECT COUNT(*) FROM ({base_query}) as subquery"
        count_result = db.execute(text(count_query), params)
        total = count_result.fetchone()[0]
        
        # Get paginated data
        base_query += " ORDER BY p.name LIMIT :limit OFFSET :offset"
        params["limit"] = per_page
        params["offset"] = offset
        
        result = db.execute(text(base_query), params)
        projects = [dict(project._mapping) for project in result.fetchall()]
        
        return {
            "success": True,
            "data": {
                "projects": projects,
                "pagination": {
                    "page": page,
                    "per_page": per_page,
                    "total": total,
                    "pages": (total + per_page - 1) // per_page
                }
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get completed projects: {str(e)}")

# ===== BENCH SUMMARY APIs =====

@app.get("/api/bench/summary")
def get_bench_summary(
    year: int = Query(..., description="Year"),
    week: int = Query(..., description="Week number"),
    current_user: dict = Depends(get_current_user),
    db: SessionLocal = Depends(get_db)
):
    """Get bench summary counts - Admin access only"""
    try:
        if not current_user.get("admin", False):
            raise HTTPException(status_code=403, detail="Admin access required")
        

        # First, check if the requested week has data, if not, find the most recent week with data
        check_data_query = """
            SELECT COUNT(*) as record_count
            FROM user_allocation
            WHERE year = :year AND week = :week
        """
        
        check_result = db.execute(text(check_data_query), {"year": year, "week": week})
        record_count = check_result.fetchone()[0]
        
        actual_year = year
        actual_week = week
        
        # If no data in requested week, find the most recent week with data
        if record_count == 0:
            
            recent_data_query = """
                SELECT year, week
                FROM user_allocation
                ORDER BY year DESC, week DESC
                LIMIT 1
            """
            
            recent_result = db.execute(text(recent_data_query))
            recent_data = recent_result.fetchone()
            
            if recent_data:
                actual_year = recent_data[0]
                actual_week = recent_data[1]
            else:
                return {
                    "success": True,
                    "data": {
                        "fully_benched": 0,
                        "partial_benched": 0,
                        "non_billable": 0,
                        "over_utilised": 0,
                        "actual_year": year,
                        "actual_week": week
                    }
                }

        # Calculate week_start (Monday) from actual year and week
        week_start = get_week_start_from_year_week(actual_year, actual_week)
        
        # Get bench summary counts using proper cross-project aggregation
        summary_query = """
            WITH user_totals AS (
                SELECT 
                    ua.user_id,
                    SUM(COALESCE(ua.billable_hrs, 0)) as total_billable,
                    SUM(COALESCE(ua.non_billable_hrs, 0)) as total_non_billable,
                    SUM(COALESCE(ua.leave_hrs, 0)) as total_leave,
                    SUM(COALESCE(ua.billable_hrs, 0) + COALESCE(ua.non_billable_hrs, 0) + COALESCE(ua.leave_hrs, 0)) as total_hours
                FROM user_allocation ua
                JOIN users u ON ua.user_id = u.id
                WHERE ua.year = :year AND ua.week = :week
                GROUP BY ua.user_id
            )
            SELECT 
                COUNT(CASE WHEN (total_billable + total_non_billable) = 0 THEN 1 END) as fully_benched,
                COUNT(CASE WHEN total_hours > 0 AND total_hours < 40 THEN 1 END) as partial_benched,
                COUNT(CASE WHEN total_non_billable > 0 THEN 1 END) as non_billable,
                COUNT(CASE WHEN total_hours > 40 THEN 1 END) as over_utilised
            FROM user_totals
        """
        
        result = db.execute(text(summary_query), {"year": actual_year, "week": actual_week})
        summary_data = result.fetchone()
        
        
        return {
            "success": True,
            "data": {
                "fully_benched": summary_data[0] or 0,
                "partial_benched": summary_data[1] or 0,
                "non_billable": summary_data[2] or 0,
                "over_utilised": summary_data[3] or 0,
                "actual_year": actual_year,
                "actual_week": actual_week
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get bench summary: {str(e)}")

@app.get("/api/bench/fully-benched")
def get_fully_benched_users(
    year: int = Query(..., description="Year"),
    week: int = Query(..., description="Week number"),
    current_user: dict = Depends(get_current_user),
    db: SessionLocal = Depends(get_db)
):
    """Get fully benched users list - Admin access only"""
    try:
        if not current_user.get("admin", False):
            raise HTTPException(status_code=403, detail="Admin access required")
        

        # First, check if the requested week has data, if not, find the most recent week with data
        check_data_query = """
            SELECT COUNT(*) as record_count
            FROM user_allocation
            WHERE year = :year AND week = :week
        """
        
        check_result = db.execute(text(check_data_query), {"year": year, "week": week})
        record_count = check_result.fetchone()[0]
        
        actual_year = year
        actual_week = week
        
        # If no data in requested week, find the most recent week with data
        if record_count == 0:
            
            recent_data_query = """
                SELECT year, week
                FROM user_allocation
                ORDER BY year DESC, week DESC
                LIMIT 1
            """
            
            recent_result = db.execute(text(recent_data_query))
            recent_data = recent_result.fetchone()
            
            if recent_data:
                actual_year = recent_data[0]
                actual_week = recent_data[1]
            else:
                return {
                    "success": True,
                    "data": {
                        "users": [],
                        "actual_year": year,
                        "actual_week": week
                    }
                }

        # Debug what data exists for the actual week
        debug_query = """
            SELECT 
                ua.user_id,
                CONCAT(u.firstname, ' ', u.lastname) as name,
                ua.billable_hrs,
                ua.non_billable_hrs,
                ua.leave_hrs,
                (COALESCE(ua.billable_hrs, 0) + COALESCE(ua.non_billable_hrs, 0)) as total_billable_non_billable
            FROM user_allocation ua
            JOIN users u ON ua.user_id = u.id
            WHERE ua.year = :year AND ua.week = :week
            ORDER BY u.firstname, u.lastname
        """
        
        debug_result = db.execute(text(debug_query), {"year": actual_year, "week": actual_week})
        debug_data = [dict(row._mapping) for row in debug_result.fetchall()]

        # Get fully benched users using exact classification rule with enhanced data
        query = """
            SELECT 
                ua.user_id,
                CONCAT(u.firstname, ' ', u.lastname) as name,
                ua.week_start as on_bench_since,
                COALESCE(ua.updated_by, 'N/A') as last_project_owner,
                CASE 
                    WHEN u.date_of_joining IS NOT NULL THEN 
                        CONCAT(ROUND(COALESCE(u.total_experience, 0) + (DATEDIFF(CURDATE(), u.date_of_joining) / 365.25), 1), ' years')
                    ELSE 
                        COALESCE(u.total_experience, 'N/A')
                END as years_of_exp,
                COALESCE(u.skill, 'N/A') as skills
            FROM user_allocation ua
            JOIN users u ON ua.user_id = u.id
            WHERE ua.year = :year AND ua.week = :week 
            AND (COALESCE(ua.billable_hrs, 0) + COALESCE(ua.non_billable_hrs, 0)) = 0
            ORDER BY u.firstname, u.lastname
        """
        
        result = db.execute(text(query), {"year": actual_year, "week": actual_week})
        users = [dict(user._mapping) for user in result.fetchall()]
        
        
        return {
            "success": True,
            "data": {
                "users": users,
                "actual_year": actual_year,
                "actual_week": actual_week
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get fully benched users: {str(e)}")

@app.get("/api/bench/partial-benched")
def get_partial_benched_users(
    year: int = Query(..., description="Year"),
    week: int = Query(..., description="Week number"),
    current_user: dict = Depends(get_current_user),
    db: SessionLocal = Depends(get_db)
):
    """Get partial benched users list - Admin access only"""
    try:
        if not current_user.get("admin", False):
            raise HTTPException(status_code=403, detail="Admin access required")
        

        # First, check if the requested week has data, if not, find the most recent week with data
        check_data_query = """
            SELECT COUNT(*) as record_count
            FROM user_allocation
            WHERE year = :year AND week = :week
        """
        
        check_result = db.execute(text(check_data_query), {"year": year, "week": week})
        record_count = check_result.fetchone()[0]
        
        actual_year = year
        actual_week = week
        
        # If no data in requested week, find the most recent week with data
        if record_count == 0:
            
            recent_data_query = """
                SELECT year, week
                FROM user_allocation
                ORDER BY year DESC, week DESC
                LIMIT 1
            """
            
            recent_result = db.execute(text(recent_data_query))
            recent_data = recent_result.fetchone()
            print(recent_data,"="*100)
            
            if recent_data:
                actual_year = recent_data[0]
                actual_week = recent_data[1]
            else:
                return {
                    "success": True,
                    "data": {
                        "users": [],
                        "actual_year": year,
                        "actual_week": week
                    }
                }

        # Get partial benched users using exact classification rule with enhanced data
        query = """
            SELECT 
                ua.user_id,
                CONCAT(u.firstname, ' ', u.lastname) as name,
                ua.week_start as on_partial_bench_since,
                COALESCE(ua.updated_by, 'N/A') as project_owner,
                (COALESCE(ua.billable_hrs, 0) + COALESCE(ua.non_billable_hrs, 0) + COALESCE(ua.leave_hrs, 0)) as total_hrs,
                CASE 
                    WHEN u.date_of_joining IS NOT NULL THEN 
                        CONCAT(ROUND(COALESCE(u.total_experience, 0) + (DATEDIFF(CURDATE(), u.date_of_joining) / 365.25), 1), ' years')
                    ELSE 
                        COALESCE(u.total_experience, 'N/A')
                END as years_of_exp,
                COALESCE(u.skill, 'N/A') as skills
            FROM user_allocation ua
            JOIN users u ON ua.user_id = u.id
            WHERE ua.year = :year AND ua.week = :week 
            AND 0 < (COALESCE(ua.billable_hrs, 0) + COALESCE(ua.non_billable_hrs, 0) + COALESCE(ua.leave_hrs, 0)) 
            AND (COALESCE(ua.billable_hrs, 0) + COALESCE(ua.non_billable_hrs, 0) + COALESCE(ua.leave_hrs, 0)) < 40
            ORDER BY u.firstname, u.lastname
        """
        
        result = db.execute(text(query), {"year": actual_year, "week": actual_week})
        users = [dict(user._mapping) for user in result.fetchall()]
        
        return {
            "success": True,
            "data": {
                "users": users,
                "actual_year": actual_year,
                "actual_week": actual_week
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get partial benched users: {str(e)}")

@app.get("/api/bench/non-billable")
def get_non_billable_users(
    year: int = Query(..., description="Year"),
    week: int = Query(..., description="Week number"),
    current_user: dict = Depends(get_current_user),
    db: SessionLocal = Depends(get_db)
):
    """Get non-billable users list - Admin access only"""
    try:
        if not current_user.get("admin", False):
            raise HTTPException(status_code=403, detail="Admin access required")
        

        # First, check if the requested week has data, if not, find the most recent week with data
        check_data_query = """
            SELECT COUNT(*) as record_count
            FROM user_allocation
            WHERE year = :year AND week = :week
        """
        
        check_result = db.execute(text(check_data_query), {"year": year, "week": week})
        record_count = check_result.fetchone()[0]
        
        actual_year = year
        actual_week = week
        
        # If no data in requested week, find the most recent week with data
        if record_count == 0:
            
            recent_data_query = """
                SELECT year, week
                FROM user_allocation
                ORDER BY year DESC, week DESC
                LIMIT 1
            """
            
            recent_result = db.execute(text(recent_data_query))
            recent_data = recent_result.fetchone()
            
            if recent_data:
                actual_year = recent_data[0]
                actual_week = recent_data[1]
            else:
                return {
                    "success": True,
                    "data": {
                        "users": [],
                        "actual_year": year,
                        "actual_week": week
                    }
                }

        # Get non-billable users using exact classification rule with enhanced data
        query = """
            SELECT 
                ua.user_id,
                CONCAT(u.firstname, ' ', u.lastname) as name,
                ua.project_id,
                p.name as project_name,
                ua.week_start as non_billable_since,
                COALESCE(ua.updated_by, 'N/A') as project_owner,
                COALESCE(ua.non_billable_hrs, 0) as non_billable_hrs,
                (COALESCE(ua.billable_hrs, 0) + COALESCE(ua.non_billable_hrs, 0) + COALESCE(ua.leave_hrs, 0)) as total_hrs,
                COALESCE(wr.remark, 'N/A') as reason_for_non_billability,
                CASE 
                    WHEN u.date_of_joining IS NOT NULL THEN 
                        CONCAT(ROUND(COALESCE(u.total_experience, 0) + (DATEDIFF(CURDATE(), u.date_of_joining) / 365.25), 1), ' years')
                    ELSE 
                        COALESCE(u.total_experience, 'N/A')
                END as years_of_exp,
                COALESCE(u.skill, 'N/A') as skills
            FROM user_allocation ua
            JOIN users u ON ua.user_id = u.id
            JOIN projects p ON ua.project_id = p.id
            LEFT JOIN weekly_remark wr ON ua.user_id = wr.user_id AND ua.week = wr.week
            WHERE ua.year = :year AND ua.week = :week 
            AND COALESCE(ua.non_billable_hrs, 0) > 0
            ORDER BY u.firstname, u.lastname
        """
        
        result = db.execute(text(query), {"year": actual_year, "week": actual_week})
        users = [dict(user._mapping) for user in result.fetchall()]
        
        return {
            "success": True,
            "data": {
                "users": users,
                "actual_year": actual_year,
                "actual_week": actual_week
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get non-billable users: {str(e)}")

@app.get("/api/bench/over-utilised")
def get_over_utilised_users(
    year: int = Query(..., description="Year"),
    week: int = Query(..., description="Week number"),
    current_user: dict = Depends(get_current_user),
    db: SessionLocal = Depends(get_db)
):
    """Get over-utilised users list - Admin access only"""
    try:
        if not current_user.get("admin", False):
            raise HTTPException(status_code=403, detail="Admin access required")
        

        # First, check if the requested week has data, if not, find the most recent week with data
        check_data_query = """
            SELECT COUNT(*) as record_count
            FROM user_allocation
            WHERE year = :year AND week = :week
        """
        
        check_result = db.execute(text(check_data_query), {"year": year, "week": week})
        record_count = check_result.fetchone()[0]
        
        actual_year = year
        actual_week = week
        
        # If no data in requested week, find the most recent week with data
        if record_count == 0:
            
            recent_data_query = """
                SELECT year, week
                FROM user_allocation
                ORDER BY year DESC, week DESC
                LIMIT 1
            """
            
            recent_result = db.execute(text(recent_data_query))
            recent_data = recent_result.fetchone()
            
            if recent_data:
                actual_year = recent_data[0]
                actual_week = recent_data[1]
            else:
                return {
                    "success": True,
                    "data": {
                        "users": [],
                        "actual_year": year,
                        "actual_week": week
                    }
                }

        # Get over-utilised users using proper aggregation across all projects
        query = """
            SELECT 
                u.id as user_id,
                CONCAT(u.firstname, ' ', u.lastname) as name,
                SUM(COALESCE(ua.billable_hrs, 0) + COALESCE(ua.non_billable_hrs, 0) + COALESCE(ua.leave_hrs, 0)) as total_hrs,
                GROUP_CONCAT(DISTINCT p.name ORDER BY p.name SEPARATOR ', ') as project_name,
                CASE 
                    WHEN u.date_of_joining IS NOT NULL THEN 
                        CONCAT(ROUND(COALESCE(u.total_experience, 0) + (DATEDIFF(CURDATE(), u.date_of_joining) / 365.25), 1), ' years')
                    ELSE 
                        COALESCE(u.total_experience, 'N/A')
                END as years_of_exp,
                COALESCE(u.skill, 'N/A') as skills
            FROM users u
            JOIN user_allocation ua ON u.id = ua.user_id
            JOIN projects p ON ua.project_id = p.id
            WHERE ua.year = :year AND ua.week = :week 
            GROUP BY u.id, u.firstname, u.lastname, u.date_of_joining, u.total_experience, u.skill
            HAVING SUM(COALESCE(ua.billable_hrs, 0) + COALESCE(ua.non_billable_hrs, 0) + COALESCE(ua.leave_hrs, 0)) > 40
            ORDER BY total_hrs DESC, u.firstname, u.lastname
        """
        
        result = db.execute(text(query), {"year": actual_year, "week": actual_week})
        users = [dict(user._mapping) for user in result.fetchall()]
        
        return {
            "success": True,
            "data": {
                "users": users,
                "actual_year": actual_year,
                "actual_week": actual_week
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get over-utilised users: {str(e)}")

# API for updating weekly remarks (non-billability reasons)
@app.put("/api/weekly-remark/{user_id}/{week}")
def update_weekly_remark(
    user_id: int,
    week: int,
    remark_data: dict,
    current_user: dict = Depends(get_current_user),
    db: SessionLocal = Depends(get_db)
):
    """Update weekly remark for non-billability reason - Admin access only"""
    logger.info(f"API: update-weekly-remark called - user_id: {user_id}, week: {week}, user: {current_user.get('login')}, remark: {remark_data}")
    try:
        if not current_user.get("admin", False):
            raise HTTPException(status_code=403, detail="Admin access required")
        
        remark = remark_data.get('remark', '').strip()
        
        # Validate input
        if len(remark) > 250:  # weekly_remark.remark is varchar(250)
            raise HTTPException(status_code=400, detail="Remark too long (max 250 characters)")
        
        # Check if user exists
        user_check = db.execute(text("SELECT id FROM users WHERE id = :user_id"), {"user_id": user_id})
        if not user_check.fetchone():
            raise HTTPException(status_code=404, detail="User not found")
        
        # Validate week number
        if week < 1 or week > 53:
            raise HTTPException(status_code=400, detail="Invalid week number (must be 1-53)")
        
        # Use MySQL's INSERT ... ON DUPLICATE KEY UPDATE for upsert
        upsert_query = """
            INSERT INTO weekly_remark (user_id, week, remark) 
            VALUES (:user_id, :week, :remark)
            ON DUPLICATE KEY UPDATE remark = :remark
        """
        
        db.execute(text(upsert_query), {
            "user_id": user_id,
            "week": week,
            "remark": remark
        })
        
        db.commit()
        logger.info(f"API: update-weekly-remark result - Successfully saved remark for user {user_id}, week {week}: '{remark}'")
        
        return {
            "success": True,
            "message": "Weekly remark updated successfully",
            "data": {
                "user_id": user_id,
                "week": week,
                "remark": remark
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"API: update-weekly-remark error - {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to update weekly remark: {str(e)}")

# Debug endpoint to check what data exists
@app.get("/api/bench/debug")
def debug_bench_data(
    current_user: dict = Depends(get_current_user),
    db: SessionLocal = Depends(get_db)
):
    """Debug endpoint to check what bench data exists - Admin access only"""
    try:
        if not current_user.get("admin", False):
            raise HTTPException(status_code=403, detail="Admin access required")
        
        # Check what weeks have data
        weeks_query = """
            SELECT DISTINCT year, week, COUNT(*) as record_count
            FROM user_allocation
            GROUP BY year, week
            ORDER BY year DESC, week DESC
            LIMIT 10
        """
        
        weeks_result = db.execute(text(weeks_query))
        weeks_data = [dict(row._mapping) for row in weeks_result.fetchall()]
        
        # Check some sample data
        sample_query = """
            SELECT 
                ua.user_id,
                CONCAT(u.firstname, ' ', u.lastname) as name,
                ua.year,
                ua.week,
                ua.billable_hrs,
                ua.non_billable_hrs,
                ua.leave_hrs,
                (COALESCE(ua.billable_hrs, 0) + COALESCE(ua.non_billable_hrs, 0)) as total_billable_non_billable
            FROM user_allocation ua
            JOIN users u ON ua.user_id = u.id
            ORDER BY ua.year DESC, ua.week DESC
            LIMIT 5
        """
        
        sample_result = db.execute(text(sample_query))
        sample_data = [dict(row._mapping) for row in sample_result.fetchall()]
        
        return {
            "success": True,
            "data": {
                "available_weeks": weeks_data,
                "sample_data": sample_data
            }
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get debug data: {str(e)}")

# Helper function to calculate week_start from year and week
def get_week_start_from_year_week(year: int, week: int) -> str:
    """Calculate Monday date for given year and ISO week number"""
    try:
        # Get Monday of the specified ISO week
        week_start = datetime.fromisocalendar(year, week, 1)
        return week_start.strftime('%Y-%m-%d')
    except Exception as e:
        # Fallback to current date
        return datetime.now().strftime('%Y-%m-%d')

@app.get("/api/projects")
def get_all_projects(
    current_user: dict = Depends(get_current_user),
    db: SessionLocal = Depends(get_db)
):
    """Get all projects in the system - Admin access only"""
    try:
        # Check if user is admin
        if not current_user.get("admin", False):
            raise HTTPException(status_code=403, detail="Admin access required")
        

        # Get all active projects
        result = db.execute(text("""
            SELECT 
                p.id, 
                p.name, 
                p.description, 
                p.status,
                -- Calculate allocation percentages (placeholder - you may need to adjust based on your data structure)
                0 as allocated_percent
            FROM projects p
            WHERE p.status = 1
            ORDER BY p.name
        """))

        projects = [dict(project._mapping) for project in result.fetchall()]

        return {
            "success": True,
            "data": projects
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get projects: {str(e)}")

@app.get("/api/projects/my-po-dashboard")
def get_po_dashboard(
    year: int = Query(default=2025),
    month: Optional[int] = None,
    weeks: Optional[str] = None,
    search: Optional[str] = None,
    status: Optional[str] = None,
    sort_by: str = Query(default="name"),
    sort_order: str = Query(default="asc"),
    page: int = Query(default=1),
    page_size: int = Query(default=10),
    current_user: dict = Depends(get_current_user),
    db: SessionLocal = Depends(get_db)
):
    """Comprehensive PO dashboard data with project details, allocations, and calculations"""
    try:
        user_id = current_user["id"]
        
        # Build the main query with all necessary joins
        base_query = """
            SELECT 
                p.id, p.name, p.description, p.status, p.customer_id,
                r.name as role_name,
                -- Allocation summary calculations
                COALESCE(SUM(ua.billable_hrs), 0) as total_billable,
                COALESCE(SUM(ua.non_billable_hrs), 0) as total_non_billable,
                COALESCE(SUM(ua.leave_hrs), 0) as total_leave,
                COALESCE(SUM(ua.billable_hrs + ua.non_billable_hrs + ua.leave_hrs), 0) as total_hours,
                -- Project member count
                COUNT(DISTINCT m2.user_id) as member_count
            FROM projects p
            JOIN members m ON p.id = m.project_id 
            JOIN member_roles mr ON m.id = mr.member_id 
            JOIN roles r ON mr.role_id = r.id 
            LEFT JOIN user_allocation ua ON p.id = ua.project_id AND ua.year = :year
            LEFT JOIN members m2 ON p.id = m2.project_id
            WHERE m.user_id = :user_id 
            AND p.status = 1
            AND (r.name = 'Project Owner' OR r.name = 'Project Creator' OR r.name LIKE '%Manager%' OR r.name LIKE '%Admin%')
        """
        
        params = {"user_id": user_id, "year": year}
        
        # Add filters
        if search:
            base_query += " AND (p.name LIKE :search OR p.description LIKE :search)"
            params["search"] = f"%{search}%"
        
        if status and status != "all":
            if status == "active":
                base_query += " AND p.status = 1"
            elif status == "onhold":
                base_query += " AND p.status = 2"
            elif status == "completed":
                base_query += " AND p.status = 3"
        
        # Add time period filters
        if weeks:
            week_list = [int(w.strip()) for w in weeks.split(",")]
            base_query += " AND ua.week IN :weeks"
            params["weeks"] = tuple(week_list)
        
        if month:
            base_query += " AND MONTH(ua.week_start) = :month"
            params["month"] = month
        
        # Group by project
        base_query += " GROUP BY p.id, p.name, p.description, p.status, p.customer_id, r.name"
        
        # Add sorting
        sort_mapping = {
            "name": "p.name",
            "allocated": "total_hours",
            "not_allocated": "total_hours",
            "status": "p.status"
        }
        sort_field = sort_mapping.get(sort_by, "p.name")
        sort_direction = "DESC" if sort_order == "desc" else "ASC"
        base_query += f" ORDER BY {sort_field} {sort_direction}"
        
        # Add pagination
        offset = (page - 1) * page_size
        base_query += " LIMIT :limit OFFSET :offset"
        params["limit"] = page_size
        params["offset"] = offset
        
        
        # Execute main query
        result = db.execute(text(base_query), params)
        projects = [dict(project._mapping) for project in result.fetchall()]
        
        # Get total count for pagination
        count_query = """
            SELECT COUNT(DISTINCT p.id) as total
            FROM projects p
            JOIN members m ON p.id = m.project_id 
            JOIN member_roles mr ON m.id = mr.member_id 
            JOIN roles r ON mr.role_id = r.id 
            WHERE m.user_id = :user_id 
            AND p.status = 1
            AND (r.name = 'Project Owner' OR r.name = 'Project Creator' OR r.name LIKE '%Manager%' OR r.name LIKE '%Admin%')
        """
        count_params = {"user_id": user_id}
        
        if search:
            count_query += " AND (p.name LIKE :search OR p.description LIKE :search)"
            count_params["search"] = f"%{search}%"
        
        if status and status != "all":
            if status == "active":
                count_query += " AND p.status = 1"
            elif status == "onhold":
                count_query += " AND p.status = 2"
            elif status == "completed":
                count_query += " AND p.status = 3"
        
        count_result = db.execute(text(count_query), count_params)
        total_count = count_result.fetchone().total
        
        # Process projects and add calculated fields
        processed_projects = []
        for project in projects:
            # Calculate allocation percentages (assuming 40 hours per week as standard)
            total_hours = project['total_hours'] or 0
            standard_hours_per_week = 40
            weeks_in_period = 5  # Default to 5 weeks if not specified
            
            if weeks:
                weeks_in_period = len(week_list)
            elif month:
                weeks_in_period = 4  # Approximate weeks per month
            
            total_possible_hours = standard_hours_per_week * weeks_in_period
            allocated_percentage = min((total_hours / total_possible_hours) * 100, 100) if total_possible_hours > 0 else 0
            not_allocated_percentage = max(100 - allocated_percentage, 0)
            
            # Add calculated fields
            processed_project = {
                **project,
                "allocated_percentage": round(allocated_percentage, 1),
                "not_allocated_percentage": round(not_allocated_percentage, 1),
                "customer_name": project.get('description', 'N/A')[:50],  # Use description as customer name for now
                "business_unit": project.get('role_name', 'N/A'),  # Use role name as BU for now
                "status_label": get_status_label(project['status'])
            }
            processed_projects.append(processed_project)
        
        # Get weekly allocation data for selected project (if any)
        weekly_data = {}
        if projects:
            # Get weekly breakdown for the first project as example
            first_project_id = projects[0]['id']
            weekly_query = """
                SELECT 
                    ua.week,
                    ua.billable_hrs,
                    ua.non_billable_hrs,
                    ua.leave_hrs,
                    ua.user_id,
                    CONCAT(u.firstname, ' ', u.lastname) as user_name,
                    r.name as user_role
                FROM user_allocation ua
                JOIN users u ON ua.user_id = u.id
                JOIN members m ON u.id = m.user_id AND m.project_id = ua.project_id
                JOIN member_roles mr ON m.id = mr.member_id
                JOIN roles r ON mr.role_id = r.id
                WHERE ua.project_id = :project_id AND ua.year = :year
                ORDER BY ua.week, u.firstname, u.lastname
            """
            weekly_result = db.execute(text(weekly_query), {"project_id": first_project_id, "year": year})
            weekly_allocations = [dict(allocation._mapping) for allocation in weekly_result.fetchall()]
            
            # Group by week and user
            for allocation in weekly_allocations:
                week = allocation['week']
                user_id = allocation['user_id']
                if week not in weekly_data:
                    weekly_data[week] = {}
                weekly_data[week][user_id] = {
                    "user_name": allocation['user_name'],
                    "user_role": allocation['user_role'],
                    "billable": float(allocation['billable_hrs'] or 0),
                    "non_billable": float(allocation['non_billable_hrs'] or 0),
                    "leave": float(allocation['leave_hrs'] or 0),
                    "total": float(allocation['billable_hrs'] or 0) + float(allocation['non_billable_hrs'] or 0) + float(allocation['leave_hrs'] or 0)
                }
        
        return {
            "success": True,
            "data": {
                "projects": processed_projects,
                "weekly_data": weekly_data,
                "pagination": {
                    "page": page,
                    "page_size": page_size,
                    "total": total_count,
                    "total_pages": (total_count + page_size - 1) // page_size
                },
                "filters": {
                    "year": year,
                    "month": month,
                    "weeks": weeks,
                    "search": search,
                    "status": status,
                    "sort_by": sort_by,
                    "sort_order": sort_order
                }
            }
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get PO dashboard: {str(e)}")

@app.get("/api/projects/{project_id}/weekly-allocations")
def get_project_weekly_allocations(
    project_id: int,
    year: int = Query(default=2025),
    weeks: Optional[str] = None,
    current_user: dict = Depends(get_current_user),
    db: SessionLocal = Depends(get_db)
):
    """Get detailed weekly allocation data for a specific project"""
    try:
        # Check if current user has access to this project
        access_check = db.execute(text("""
            SELECT m.id FROM members m 
            WHERE m.user_id = :user_id AND m.project_id = :project_id
        """), {"user_id": current_user["id"], "project_id": project_id})

        print(current_user,"*"*100)
        
        if current_user.get("admin", False) :
            pass
        elif not access_check.fetchone():
            raise HTTPException(status_code=403, detail="Access denied to this project")
        
        # Build query for weekly allocations
        query = """
            SELECT 
                ua.week,
                ua.billable_hrs,
                ua.non_billable_hrs,
                ua.leave_hrs,
                ua.user_id,
                CONCAT(u.firstname, ' ', u.lastname) as user_name,
                r.name as user_role,
                (ua.billable_hrs + ua.non_billable_hrs + ua.leave_hrs) as total_hours
            FROM user_allocation ua
            JOIN users u ON ua.user_id = u.id
            JOIN members m ON u.id = m.user_id AND m.project_id = ua.project_id
            JOIN member_roles mr ON m.id = mr.member_id
            JOIN roles r ON mr.role_id = r.id
            WHERE ua.project_id = :project_id AND ua.year = :year
        """
        
        params = {"project_id": project_id, "year": year}
        
        if weeks:
            week_list = [int(w.strip()) for w in weeks.split(",")]
            query += " AND ua.week IN :weeks"
            params["weeks"] = tuple(week_list)
        
        query += " ORDER BY ua.week, u.firstname, u.lastname"
        
        result = db.execute(text(query), params)
        allocations = [dict(allocation._mapping) for allocation in result.fetchall()]
        
        
        # Transform data to user-centric structure (frontend expects this)
        user_data = {}
        week_totals = {}
        
        for allocation in allocations:
            week = allocation['week']
            user_id = allocation['user_id']
            
            # Initialize user data if not exists
            if user_id not in user_data:
                user_data[user_id] = {
                    "user_id": user_id,
                    "user_name": allocation['user_name'],
                    "user_role": allocation['user_role'],
                    "totals": {"billable": 0, "non_billable": 0, "leave": 0, "total": 0}
                }
            
            # Initialize week totals if not exists
            if week not in week_totals:
                week_totals[week] = {"billable": 0, "non_billable": 0, "leave": 0, "total": 0}
            
            # Add allocation data
            billable = float(allocation['billable_hrs'] or 0)
            non_billable = float(allocation['non_billable_hrs'] or 0)
            leave = float(allocation['leave_hrs'] or 0)
            total = float(allocation['total_hours'] or 0)
            
            # Add week data to user (frontend expects week31, week32, etc.)
            week_key = f"week{week}"
            user_data[user_id][week_key] = {
                "billable": billable,
                "non_billable": non_billable,
                "leave": leave,
                "total": total
            }
            
            # Update user totals
            user_data[user_id]["totals"]["billable"] += billable
            user_data[user_id]["totals"]["non_billable"] += non_billable
            user_data[user_id]["totals"]["leave"] += leave
            user_data[user_id]["totals"]["total"] += total
            
            # Update week totals
            week_totals[week]["billable"] += billable
            week_totals[week]["non_billable"] += non_billable
            week_totals[week]["leave"] += leave
            week_totals[week]["total"] += total
        
        # Get project details
        project_result = db.execute(text("""
            SELECT id, name, description, status 
            FROM projects 
            WHERE id = :project_id
        """), {"project_id": project_id})
        
        project = project_result.fetchone()
        if not project:
            raise HTTPException(status_code=404, detail="Project not found")
        
        return {
            "success": True,
            "data": {
                "project": dict(project._mapping),
                "users": list(user_data.values()),
                "week_totals": week_totals,
                "filters": {
                    "year": year,
                    "weeks": weeks
                }
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get weekly allocations: {str(e)}")

# ===== ALLOCATION EDITING APIs =====

@app.get("/api/projects/{project_id}/editable-allocations")
def get_editable_allocations(
    project_id: int,
    current_user: dict = Depends(get_current_user),
    db: SessionLocal = Depends(get_db)
):
    """Get allocation data for the last 15 days only"""
    try:
        # Check if user has access to this project
        # Admin users have access to all projects
        if current_user.get("admin", False):
            has_access = True
        else:
            # For non-admin users, check project membership
            access_query = """
                SELECT COUNT(*) FROM members m
                JOIN member_roles mr ON m.id = mr.member_id
                JOIN roles r ON mr.role_id = r.id
                WHERE m.user_id = :user_id AND m.project_id = :project_id
                AND (r.name = 'Project Owner' OR r.name = 'Project Creator' OR r.name = 'Admin')
            """
            access_result = db.execute(text(access_query), {
                "user_id": current_user['id'],
                "project_id": project_id
            })
            
            has_access = access_result.fetchone()[0] > 0
        
        if not has_access:
            raise HTTPException(status_code=403, detail="Access denied to this project")
        
        # Get editable weeks (last 15 days)
        editable_weeks = get_editable_weeks()
        week_dates = [week["monday_date"] for week in editable_weeks]
        
        if not week_dates:
            return {
                "success": True,
                "data": {
                    "allocations": [],
                    "editable_weeks": editable_weeks,
                    "message": "No editable weeks found"
                }
            }
        
        # Get allocation data for editable weeks only
        query = """
            SELECT 
                ua.id,
                ua.year,
                ua.week_start,
                ua.week,
                ua.user_id,
                ua.project_id,
                ua.billable_hrs,
                ua.non_billable_hrs,
                ua.leave_hrs,
                ua.updated_by,
                CONCAT(u.firstname, ' ', u.lastname) as user_name,
                r.name as user_role,
                (ua.billable_hrs + ua.non_billable_hrs + ua.leave_hrs) as total_hours
            FROM user_allocation ua
            JOIN users u ON ua.user_id = u.id
            JOIN members m ON u.id = m.user_id AND m.project_id = ua.project_id
            JOIN member_roles mr ON m.id = mr.member_id
            JOIN roles r ON mr.role_id = r.id
            WHERE ua.project_id = :project_id 
            AND ua.week_start IN :week_dates
            ORDER BY ua.week_start DESC, u.firstname, u.lastname
        """
        
        
        result = db.execute(text(query), {
            "project_id": project_id,
            "week_dates": tuple(week_dates) if len(week_dates) > 1 else f"('{week_dates[0]}')"
        })
        
        allocations = [dict(allocation._mapping) for allocation in result.fetchall()]
        
        return {
            "success": True,
            "data": {
                "allocations": allocations,
                "editable_weeks": editable_weeks,
                "current_date": datetime.now().strftime("%Y-%m-%d")
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get editable allocations: {str(e)}")

@app.put("/api/allocations/{allocation_id}")
def update_allocation(
    allocation_id: int,
    allocation_data: dict,
    current_user: dict = Depends(get_current_user),
    db: SessionLocal = Depends(get_db)
):
    """Update allocation hours with validation"""
    logger.info(f"API: update-allocation called - allocation_id: {allocation_id}, user: {current_user.get('login')}, allocation_data: {allocation_data}")
    try:
        # Validate input data
        billable_hrs = float(allocation_data.get('billable_hrs', 0))
        non_billable_hrs = float(allocation_data.get('non_billable_hrs', 0))
        leave_hrs = float(allocation_data.get('leave_hrs', 0))
        
        # Note: 40-hour validation is handled on frontend with overallocation modal
        # Backend allows overallocation but tracks it for reporting
        total_hours = billable_hrs + non_billable_hrs + leave_hrs
        
        # Check if allocation exists and is editable (within 15 days)
        current_date = datetime.now().date()
        fifteen_days_ago = current_date - timedelta(days=15)
        
        # Get current allocation data
        current_allocation = db.execute(text("""
            SELECT ua.*, CONCAT(u.firstname, ' ', u.lastname) as user_name
            FROM user_allocation ua
            JOIN users u ON ua.user_id = u.id
            WHERE ua.id = :allocation_id
        """), {"allocation_id": allocation_id})
        
        allocation = current_allocation.fetchone()
        if not allocation:
            raise HTTPException(status_code=404, detail="Allocation not found")
        
        # Check if current user has access to this allocation
        # Admin users can edit any allocation
        if not current_user.get("admin", False):
            # For non-admin users, check if they have access to the project
            access_check = db.execute(text("""
                SELECT m.id FROM members m 
                WHERE m.user_id = :user_id AND m.project_id = :project_id
            """), {"user_id": current_user["id"], "project_id": allocation.project_id})
            
            if not access_check.fetchone():
                raise HTTPException(status_code=403, detail="Access denied to this allocation")
        
        # Check if allocation is within editable period (admin can edit any time)
        if not current_user.get("admin", False) and allocation.week_start < fifteen_days_ago:
            raise HTTPException(
                status_code=400, 
                detail="Allocation is outside the editable period (last 15 days only)"
            )
        
        # Update allocation
        update_query = """
            UPDATE user_allocation 
            SET billable_hrs = :billable_hrs,
                non_billable_hrs = :non_billable_hrs,
                leave_hrs = :leave_hrs,
                updated_by = :updated_by
            WHERE id = :allocation_id
        """
        
        db.execute(text(update_query), {
            "allocation_id": allocation_id,
            "billable_hrs": billable_hrs,
            "non_billable_hrs": non_billable_hrs,
            "leave_hrs": leave_hrs,
            "updated_by": current_user["login"]
        })
        
        db.commit()
        
        logger.info(f"API: update-allocation result - allocation_id: {allocation_id}, user_name: {allocation.user_name}, total_hours: {total_hours}")
        
        return {
            "success": True,
            "message": f"Allocation updated successfully for {allocation.user_name}",
            "data": {
                "allocation_id": allocation_id,
                "billable_hrs": billable_hrs,
                "non_billable_hrs": non_billable_hrs,
                "leave_hrs": leave_hrs,
                "total_hours": total_hours,
                "updated_by": current_user["login"]
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to update allocation: {str(e)}")

@app.post("/api/projects/{project_id}/copy-last-week")
def copy_last_week_allocation(
    project_id: int,
    copy_data: dict,
    current_user: dict = Depends(get_current_user),
    db: SessionLocal = Depends(get_db)
):
    """Copy allocation data from the previous week to the current week"""
    try:
        user_id = copy_data.get('user_id')
        if not user_id:
            raise HTTPException(status_code=400, detail="User ID is required")
        
        # Get current week info using corporate week calculation
        current_week_info = get_current_week_info()
        current_week = current_week_info["current_week"]
        current_year = current_week_info["current_year"]
        
        # Calculate previous week
        last_week = current_week - 1
        last_year = current_year
        
        # Handle year boundary
        if last_week < 1:
            last_week = 52  # Assuming 52 weeks in a year
            last_year = current_year - 1
        
        # Get week info for both current and last week
        current_week_details = get_week_info_for_week(current_week, current_year)
        last_week_details = get_week_info_for_week(last_week, last_year)
        
        
        # Find last week's allocation data
        last_week_query = """
            SELECT ua.*, CONCAT(u.firstname, ' ', u.lastname) as user_name
            FROM user_allocation ua
            JOIN users u ON ua.user_id = u.id
            WHERE ua.project_id = :project_id 
            AND ua.user_id = :user_id
            AND ua.week = :last_week
            AND ua.year = :last_year
        """
        
        last_week_result = db.execute(text(last_week_query), {
            "project_id": project_id,
            "user_id": user_id,
            "last_week": last_week,
            "last_year": last_year
        })
        
        last_week_data = last_week_result.fetchone()
        
        
        if not last_week_data:
            raise HTTPException(status_code=404, detail="No allocation data found for last week")
        
        # Check if current week allocation already exists
        current_week_query = """
            SELECT id FROM user_allocation 
            WHERE project_id = :project_id 
            AND user_id = :user_id
            AND week = :current_week
            AND year = :current_year
        """
        
        current_week_result = db.execute(text(current_week_query), {
            "project_id": project_id,
            "user_id": user_id,
            "current_week": current_week,
            "current_year": current_year
        })
        
        existing_allocation = current_week_result.fetchone()
        
        # Prepare data for insert/update
        allocation_data = {
            "project_id": project_id,
            "user_id": user_id,
            "week": current_week,
            "year": current_year,
            "week_start": current_week_details["monday_date"],
            "billable_hrs": last_week_data.billable_hrs,
            "non_billable_hrs": last_week_data.non_billable_hrs,
            "leave_hrs": last_week_data.leave_hrs,
            "updated_by": current_user['login']
        }
        
        
        if existing_allocation:
            # Update existing allocation
            update_query = """
                UPDATE user_allocation 
                SET billable_hrs = :billable_hrs,
                    non_billable_hrs = :non_billable_hrs,
                    leave_hrs = :leave_hrs,
                    updated_by = :updated_by
                WHERE id = :allocation_id
            """
            db.execute(text(update_query), {
                **allocation_data,
                "allocation_id": existing_allocation.id
            })
            message = "Last week's allocation copied and updated successfully"
        else:
            # Insert new allocation
            insert_query = """
                INSERT INTO user_allocation 
                (project_id, user_id, week, year, week_start, billable_hrs, non_billable_hrs, leave_hrs, updated_by)
                VALUES (:project_id, :user_id, :week, :year, :week_start, :billable_hrs, :non_billable_hrs, :leave_hrs, :updated_by)
            """
            db.execute(text(insert_query), allocation_data)
            message = "Last week's allocation copied successfully"
        
        db.commit()
        
        return {
            "success": True,
            "message": message,
            "data": allocation_data
        }
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to copy last week allocation: {str(e)}")

@app.post("/api/projects/{project_id}/create-allocation")
def create_allocation(
    project_id: int,
    allocation_data: dict,
    current_user: dict = Depends(get_current_user),
    db: SessionLocal = Depends(get_db)
):
    """Create a new allocation record"""
    logger.info(f"API: create-allocation called - project_id: {project_id}, user: {current_user.get('login')}, allocation_data: {allocation_data}")
    try:
        
        # Validate input data
        user_id = allocation_data.get('user_id')
        week = allocation_data.get('week')
        year = allocation_data.get('year')
        week_start = allocation_data.get('week_start')
        billable_hrs = float(allocation_data.get('billable_hrs', 0))
        non_billable_hrs = float(allocation_data.get('non_billable_hrs', 0))
        leave_hrs = float(allocation_data.get('leave_hrs', 0))
        
        # Convert to proper types and handle zero values
        user_id = int(user_id) if user_id is not None else None
        week = int(week) if week is not None else None
        year = int(year) if year is not None else None
        week_start = str(week_start) if week_start is not None else None
        
        
        # Enhanced validation with detailed logging
        
        # Check for None values specifically (not falsy values)
        if user_id is None or week is None or year is None or week_start is None:
            missing_fields = []
            if user_id is None: 
                missing_fields.append('user_id')
            if week is None: 
                missing_fields.append('week')
            if year is None: 
                missing_fields.append('year')
            if week_start is None: 
                missing_fields.append('week_start')
            raise HTTPException(status_code=400, detail=f"Missing required fields: {', '.join(missing_fields)}")
        
        
        # Note: 40-hour validation is handled on frontend with overallocation modal
        # Backend allows overallocation but tracks it for reporting
        total_hours = billable_hrs + non_billable_hrs + leave_hrs
        
        # Check if current user has access to this project
        
        # Admin users have access to all projects
        if not current_user.get("admin", False):
            # For non-admin users, check project membership
            access_check = db.execute(text("""
                SELECT m.id FROM members m 
                WHERE m.user_id = :user_id AND m.project_id = :project_id
            """), {"user_id": current_user["id"], "project_id": project_id})
            
            if not access_check.fetchone():
                raise HTTPException(status_code=403, detail="Access denied to this project")
        
        
        # Check if allocation already exists for this user, project, week, and year
        existing_check = db.execute(text("""
            SELECT id FROM user_allocation 
            WHERE user_id = :user_id AND project_id = :project_id AND week = :week AND year = :year
        """), {
            "user_id": user_id,
            "project_id": project_id,
            "week": week,
            "year": year
        })
        
        existing_allocation = existing_check.fetchone()
        
        if existing_allocation:
            # Update existing allocation
            update_query = """
                UPDATE user_allocation 
                SET billable_hrs = :billable_hrs,
                    non_billable_hrs = :non_billable_hrs,
                    leave_hrs = :leave_hrs,
                    updated_by = :updated_by
                WHERE id = :allocation_id
            """
            
            try:
                db.execute(text(update_query), {
                    "allocation_id": existing_allocation[0],
                    "billable_hrs": billable_hrs,
                    "non_billable_hrs": non_billable_hrs,
                    "leave_hrs": leave_hrs,
                    "updated_by": current_user["login"]
                })
                db.commit()
                
                return {
                    "success": True,
                    "message": f"Allocation updated successfully",
                    "data": {
                        "allocation_id": existing_allocation[0],
                        "billable_hrs": billable_hrs,
                        "non_billable_hrs": non_billable_hrs,
                        "leave_hrs": leave_hrs,
                        "total_hours": total_hours,
                        "updated_by": current_user["login"]
                    }
                }
                
            except Exception as update_error:
                db.rollback()
                raise HTTPException(status_code=500, detail=f"Database update error: {str(update_error)}")
        
        
        # Create new allocation
        
        insert_query = """
            INSERT INTO user_allocation 
            (year, week_start, week, user_id, project_id, billable_hrs, non_billable_hrs, leave_hrs, updated_by)
            VALUES (:year, :week_start, :week, :user_id, :project_id, :billable_hrs, :non_billable_hrs, :leave_hrs, :updated_by)
        """
        
        try:
            result = db.execute(text(insert_query), {
                "year": year,
                "week_start": week_start,
                "week": week,
                "user_id": user_id,
                "project_id": project_id,
                "billable_hrs": billable_hrs,
                "non_billable_hrs": non_billable_hrs,
                "leave_hrs": leave_hrs,
                "updated_by": current_user["login"]
            })
            
            allocation_id = result.lastrowid
            db.commit()
            
        except Exception as db_error:
            db.rollback()
            raise HTTPException(status_code=500, detail=f"Database error: {str(db_error)}")
        
        response_data = {
            "success": True,
            "message": f"Allocation created successfully",
            "data": {
                "allocation_id": allocation_id,
                "billable_hrs": billable_hrs,
                "non_billable_hrs": non_billable_hrs,
                "leave_hrs": leave_hrs,
                "total_hours": total_hours,
                "updated_by": current_user["login"]
            }
        }
        
        logger.info(f"API: create-allocation result - allocation_id: {allocation_id}, total_hours: {total_hours}")
        
        return response_data
        
    except HTTPException as http_error:
        raise
    except Exception as e:
        import traceback
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to create allocation: {str(e)}")

@app.get("/api/allocation/check-overallocation")
def check_overallocation(
    user_id: int = Query(..., description="User ID"),
    week: int = Query(..., description="Week number"),
    year: int = Query(..., description="Year"),
    current_project_id: int = Query(..., description="Current project ID"),
    new_billable: float = Query(default=0, description="New billable hours"),
    new_non_billable: float = Query(default=0, description="New non-billable hours"),
    new_leave: float = Query(default=0, description="New leave hours"),
    current_user: dict = Depends(get_current_user),
    db: SessionLocal = Depends(get_db)
):
    """Check if user is overallocated across all projects for a week"""
    logger.info(f"API: check-overallocation called - user_id: {user_id}, week: {week}, year: {year}, project: {current_project_id}, new_hours: B={new_billable}, NB={new_non_billable}, L={new_leave}")
    try:
        
        # Get all allocations for this user in this week across all projects
        query = """
            SELECT 
                ua.project_id,
                p.name as project_name,
                ua.billable_hrs,
                ua.non_billable_hrs,
                ua.leave_hrs,
                (ua.billable_hrs + ua.non_billable_hrs + ua.leave_hrs) as total_hours
            FROM user_allocation ua
            JOIN projects p ON ua.project_id = p.id
            WHERE ua.user_id = :user_id AND ua.week = :week AND ua.year = :year
            ORDER BY total_hours DESC, p.name
        """
        
        result = db.execute(text(query), {
            "user_id": user_id,
            "week": week,
            "year": year
        })
        
        allocations = [dict(row._mapping) for row in result.fetchall()]
        
        # Calculate current total across all projects (convert Decimal to float)
        current_total = sum(float(alloc['total_hours']) for alloc in allocations)
        
        # Find current project allocation
        current_project_alloc = next((alloc for alloc in allocations if alloc['project_id'] == current_project_id), None)
        current_project_hours = float(current_project_alloc['total_hours']) if current_project_alloc else 0.0
        
        # Calculate new total (replace current project hours with new hours)
        new_project_total = new_billable + new_non_billable + new_leave
        new_total = current_total - current_project_hours + new_project_total
        
        # Check if overallocated
        is_overallocated = new_total > 40
        over_by = max(0, new_total - 40)
        
        
        # Convert allocations to use float values for consistency
        processed_allocations = []
        for alloc in allocations:
            processed_alloc = {
                'project_id': alloc['project_id'],
                'project_name': alloc['project_name'],
                'billable_hrs': float(alloc['billable_hrs']) if alloc['billable_hrs'] else 0.0,
                'non_billable_hrs': float(alloc['non_billable_hrs']) if alloc['non_billable_hrs'] else 0.0,
                'leave_hrs': float(alloc['leave_hrs']) if alloc['leave_hrs'] else 0.0,
                'total_hours': float(alloc['total_hours']) if alloc['total_hours'] else 0.0
            }
            processed_allocations.append(processed_alloc)
        
        logger.info(f"API: check-overallocation result - current_total: {current_total}, new_total: {new_total}, is_overallocated: {is_overallocated}, over_by: {over_by}, allocations_count: {len(processed_allocations)}")
        
        return {
            "success": True,
            "data": {
                "user_id": user_id,
                "week": week,
                "year": year,
                "current_project_id": current_project_id,
                "current_total": current_total,
                "new_total": new_total,
                "is_overallocated": is_overallocated,
                "over_by": over_by,
                "limit": 40,
                "current_project_hours": current_project_hours,
                "new_project_hours": new_project_total,
                "allocations": processed_allocations
            }
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to check overallocation: {str(e)}")

@app.get("/api/allocation/user-week-breakdown")
def get_user_week_breakdown(
    user_id: int = Query(..., description="User ID"),
    week: int = Query(..., description="Week number"),
    year: int = Query(..., description="Year"),
    current_user: dict = Depends(get_current_user),
    db: SessionLocal = Depends(get_db)
):
    """Get detailed breakdown of user's allocations across all projects for a week"""
    logger.info(f"API: user-week-breakdown called - user_id: {user_id}, week: {week}, year: {year}")
    try:
        
        # Get user details
        user_query = """
            SELECT CONCAT(firstname, ' ', lastname) as user_name
            FROM users
            WHERE id = :user_id
        """
        user_result = db.execute(text(user_query), {"user_id": user_id})
        user_data = user_result.fetchone()
        
        if not user_data:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Get all allocations for this user in this week
        query = """
            SELECT 
                ua.project_id,
                p.name as project_name,
                ua.billable_hrs,
                ua.non_billable_hrs,
                ua.leave_hrs,
                (ua.billable_hrs + ua.non_billable_hrs + ua.leave_hrs) as total_hours,
                r.name as role_name
            FROM user_allocation ua
            JOIN projects p ON ua.project_id = p.id
            LEFT JOIN members m ON ua.user_id = m.user_id AND ua.project_id = m.project_id
            LEFT JOIN member_roles mr ON m.id = mr.member_id
            LEFT JOIN roles r ON mr.role_id = r.id
            WHERE ua.user_id = :user_id AND ua.week = :week AND ua.year = :year
            ORDER BY total_hours DESC, p.name
        """
        
        result = db.execute(text(query), {
            "user_id": user_id,
            "week": week,
            "year": year
        })
        
        allocations = [dict(row._mapping) for row in result.fetchall()]
        
        # Calculate totals (convert Decimal to float)
        total_billable = sum(float(alloc['billable_hrs']) if alloc['billable_hrs'] else 0.0 for alloc in allocations)
        total_non_billable = sum(float(alloc['non_billable_hrs']) if alloc['non_billable_hrs'] else 0.0 for alloc in allocations)
        total_leave = sum(float(alloc['leave_hrs']) if alloc['leave_hrs'] else 0.0 for alloc in allocations)
        total_hours = sum(float(alloc['total_hours']) if alloc['total_hours'] else 0.0 for alloc in allocations)
        
        
        # Convert allocations to use float values for consistency
        processed_allocations = []
        for alloc in allocations:
            processed_alloc = {
                'project_id': alloc['project_id'],
                'project_name': alloc['project_name'],
                'billable_hrs': float(alloc['billable_hrs']) if alloc['billable_hrs'] else 0.0,
                'non_billable_hrs': float(alloc['non_billable_hrs']) if alloc['non_billable_hrs'] else 0.0,
                'leave_hrs': float(alloc['leave_hrs']) if alloc['leave_hrs'] else 0.0,
                'total_hours': float(alloc['total_hours']) if alloc['total_hours'] else 0.0,
                'role_name': alloc['role_name'] if alloc['role_name'] else None
            }
            processed_allocations.append(processed_alloc)
        
        logger.info(f"API: user-week-breakdown result - user_name: {user_data.user_name}, total_hours: {total_hours}, is_overallocated: {total_hours > 40}, allocations_count: {len(processed_allocations)}")
        
        return {
            "success": True,
            "data": {
                "user_id": user_id,
                "user_name": user_data.user_name,
                "week": week,
                "year": year,
                "total_billable": total_billable,
                "total_non_billable": total_non_billable,
                "total_leave": total_leave,
                "total_hours": total_hours,
                "is_overallocated": total_hours > 40,
                "over_by": max(0, total_hours - 40),
                "limit": 40,
                "allocations": processed_allocations
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get user week breakdown: {str(e)}")

def get_status_label(status):
    """Convert status number to label"""
    status_map = {
        1: "Active",
        2: "On Hold", 
        3: "Completed",
        5: "Archived",
        9: "Closed"
    }
    return status_map.get(status, "Unknown")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
