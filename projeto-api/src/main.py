from contextlib import asynccontextmanager

from fastapi import FastAPI

from src.api.errors import register_error_handlers
from src.api.routes import auth, avisos, gestao, me, solicitacoes, turmas
from src.core.config import get_settings
from src.providers.auth.factory import provider_from_settings


@asynccontextmanager
async def lifespan(_: FastAPI):
    # Configuração inválida (segredo fraco, provedor indisponível) impede a API de subir.
    provider_from_settings(get_settings())
    yield


app = FastAPI(title="CONECTA API", version="0.1.0", lifespan=lifespan)
register_error_handlers(app)

app.include_router(auth.router)
app.include_router(me.router)
app.include_router(turmas.router)
app.include_router(solicitacoes.router)
app.include_router(avisos.router)
app.include_router(gestao.router)
