from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    """Application configuration loaded from environment variables."""
    
    # Application
    APP_NAME: str = "CampusGenie AI"
    APP_VERSION: str = "0.1.0"
    DEBUG: bool = True
    
    # Server
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    
    # Database
    DATABASE_URL: str = "sqlite:///./campusgenie.db"
    
    # Authentication
    SECRET_KEY: str = "your-secret-key-change-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    
    # LLM Configuration
    LLM_PROVIDER: str = "openai"  # Options: openai, gemini
    OPENAI_API_KEY: Optional[str] = None
    GEMINI_API_KEY: Optional[str] = None
    OPENAI_MODEL: str = "gpt-4o-mini"
    GEMINI_MODEL: str = "gemini-pro"
    
    # Vector Database
    VECTOR_DB_TYPE: str = "chroma"  # Options: chroma, faiss
    CHROMA_PERSIST_DIR: str = "./data/chroma_db"
    
    # RAG Configuration
    CHUNK_SIZE: int = 1000
    CHUNK_OVERLAP: int = 200
    EMBEDDING_MODEL: str = "text-embedding-3-small"
    
    # Logging
    LOG_LEVEL: str = "INFO"
    
    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()
