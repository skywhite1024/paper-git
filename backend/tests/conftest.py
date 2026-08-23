import os
import pathlib
import tempfile

_TMP = tempfile.mkdtemp(prefix="papergit-test-")
os.environ["DATABASE_URL"] = f"sqlite:///{(pathlib.Path(_TMP) / 'test.db').as_posix()}"

import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

from app.database import Base, SessionLocal, engine  # noqa: E402
from app.main import app  # noqa: E402
from app.taxonomy_loader import load_taxonomy  # noqa: E402


@pytest.fixture(scope="session", autouse=True)
def setup_db():
    Base.metadata.create_all(engine)
    load_taxonomy()
    yield
    Base.metadata.drop_all(engine)


@pytest.fixture
def db():
    session = SessionLocal()
    yield session
    session.rollback()
    session.close()


@pytest.fixture(scope="session")
def client():
    with TestClient(app) as c:
        yield c
