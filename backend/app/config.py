import os
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]

TAXONOMY_PATH = Path(os.getenv("TAXONOMY_PATH", REPO_ROOT / "taxonomy" / "taxonomy.yaml"))

_default_db_path = REPO_ROOT / "data" / "papergit.db"
_default_db_path.parent.mkdir(parents=True, exist_ok=True)
DATABASE_URL = os.getenv("DATABASE_URL", f"sqlite:///{_default_db_path.as_posix()}")

ARXIV_API_BASE = os.getenv("ARXIV_API_BASE", "https://export.arxiv.org/api/query")
ARXIV_DELAY_SECONDS = float(os.getenv("ARXIV_DELAY_SECONDS", "3.2"))
OPENALEX_API_BASE = os.getenv("OPENALEX_API_BASE", "https://api.openalex.org/works")
OPENALEX_MAILTO = os.getenv("OPENALEX_MAILTO", "papergit@example.com")
OPENALEX_DELAY_SECONDS = float(os.getenv("OPENALEX_DELAY_SECONDS", "0.2"))
