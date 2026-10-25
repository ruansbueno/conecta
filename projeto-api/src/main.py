from fastapi import FastAPI

from src.api.errors import register_error_handlers

app = FastAPI(title="CONECTA API", version="0.1.0")
register_error_handlers(app)

# Routers
