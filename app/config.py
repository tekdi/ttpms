from pydantic_settings import BaseSettings

import os
from dotenv import load_dotenv
from typing import Optional, List
import os
import json



load_dotenv()
def get_required_env(key: str, description: str) -> str:
    """Get required environment variable with error handling"""
    value = os.getenv(key)
    if not value:
        raise ValueError(f"❌ Missing required environment variable: {key} ({description})")
    return value

def parse_json_env(key: str, default: List[str]) -> List[str]:
    """Parse JSON environment variable safely"""
    value = os.getenv(key)
    if not value:
        return default
    
    # First try comma-separated values (simpler and more reliable)
    if ',' in value and not value.startswith('['):
        return [item.strip() for item in value.split(',')]
    
    # Then try JSON parsing
    try:
        return json.loads(value)
    except json.JSONDecodeError:
        # Final fallback to single value
        return [value.strip()]

class Settings(BaseSettings):
    # Database settings - REQUIRED
    DATABASE_URL: str = get_required_env("DATABASE_URL", "Database connection URL")
    
    # JWT settings - REQUIRED
    SECRET_KEY: str = get_required_env("SECRET_KEY", "JWT secret key for token signing")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 525600  # 1 year
    
    # CORS settings - handle as string and convert
    _ALLOWED_ORIGINS_STR: str = os.getenv("ALLOWED_ORIGINS", "*")
    
    @property
    def ALLOWED_ORIGINS(self) -> List[str]:
        return parse_json_env("ALLOWED_ORIGINS", ["*"])
    
    # Application settings
    ENVIRONMENT: str = os.getenv("ENVIRONMENT", "production")
    DEBUG: bool = os.getenv("DEBUG", "false").lower() == "true"
    LOG_LEVEL: str = os.getenv("LOG_LEVEL", "INFO")
    
    class Config:
        env_file = ".env"
        case_sensitive = True
        extra = "ignore"  # Ignore extra environment variables

# Initialize settings with validation
try:
    settings = Settings()
    # Configuration loaded successfully - logging handled by main application
except Exception as e:
    # Log configuration errors without exposing sensitive details
    raise ValueError("Configuration validation failed. Please check your environment variables.")
