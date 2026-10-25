from fastapi import FastAPI

from src.api.errors import register_error_handlers
from src.api.routes import auth, avisos, me, solicitacoes, turmas

app = FastAPI(title="CONECTA API", version="0.1.0")
register_error_handlers(app)

app.include_router(auth.router)
app.include_router(me.router)
app.include_router(turmas.router)
app.include_router(solicitacoes.router)
app.include_router(avisos.router)
