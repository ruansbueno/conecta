import os

# Variáveis lidas por Settings: definidas antes de qualquer import de `src`.
TEST_DATABASE_URL = os.environ.get(
    "TEST_DATABASE_URL", "postgresql+asyncpg://conecta:conecta@localhost:5433/conecta_test"
)
os.environ["DATABASE_URL"] = TEST_DATABASE_URL
os.environ["AUTH_PROVIDER"] = "mock"
os.environ["JWT_SECRET"] = "segredo-de-teste-com-tamanho-suficiente-para-hs256"

import pytest  # noqa: E402
from alembic import command  # noqa: E402
from alembic.config import Config  # noqa: E402
from httpx import ASGITransport, AsyncClient  # noqa: E402
from sqlalchemy import text  # noqa: E402
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine  # noqa: E402
from sqlalchemy.pool import NullPool  # noqa: E402

from src.db.base import Base  # noqa: E402
from src.db.session import get_session  # noqa: E402


def pytest_collection_modifyitems(config, items):
    # A integração real só roda quando há acesso ao Moodle (spec.md §9.1).
    if os.environ.get("MOODLE_URL"):
        return
    skip = pytest.mark.skip(reason="moodle_real: MOODLE_URL não configurado")
    for item in items:
        if "moodle_real" in item.keywords:
            item.add_marker(skip)


@pytest.fixture(scope="session")
def migrated_db():
    # Esquema criado pelas migrações reais, não por create_all: valida o Alembic.
    cfg = Config(os.path.join(os.path.dirname(__file__), "..", "alembic.ini"))
    command.downgrade(cfg, "base")
    command.upgrade(cfg, "head")
    return TEST_DATABASE_URL


@pytest.fixture(scope="session")
def engine(migrated_db):
    return create_async_engine(migrated_db, poolclass=NullPool)


@pytest.fixture
async def session_factory(engine):
    async with engine.begin() as conn:
        tabelas = ", ".join(t.name for t in Base.metadata.sorted_tables)
        if tabelas:
            await conn.execute(text(f"TRUNCATE {tabelas} RESTART IDENTITY CASCADE"))
    return async_sessionmaker(engine, expire_on_commit=False)


@pytest.fixture
async def db(session_factory):
    async with session_factory() as session:
        yield session


@pytest.fixture
def app(session_factory):
    from src.main import app as fastapi_app

    async def _session():
        async with session_factory() as session:
            yield session

    fastapi_app.dependency_overrides[get_session] = _session
    yield fastapi_app
    fastapi_app.dependency_overrides.clear()


@pytest.fixture
async def client(app):
    # https: os cookies da sessão são Secure e não seriam reenviados em http.
    async with AsyncClient(transport=ASGITransport(app=app), base_url="https://test") as c:
        yield c
