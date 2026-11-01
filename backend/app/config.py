"""Application settings, loaded from environment variables or backend/.env."""
from pathlib import Path
 
from pydantic_settings import BaseSettings, SettingsConfigDict
 
BASE_DIR = Path(__file__).resolve().parent.parent
 
 
class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=BASE_DIR / ".env", extra="ignore")
 
    database_url: str = "postgresql+psycopg2://postgres:postgres@localhost:5432/elnino"
    secret_key: str = "change-me"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 120
    cors_origins: str = "http://localhost:5173"
    admin_email: str = ""
 
    # Folder that holds master_dataset.csv (or .xlsx) - see backend/data/README.txt
    data_dir: Path = BASE_DIR / "data"
    # Folder where trained models and computed result files are written
    artifacts_dir: Path = BASE_DIR / "artifacts"
    # Static results transcribed from the research paper
    published_results_file: Path = BASE_DIR / "app" / "data" / "research_results.json"
 
 
settings = Settings()

