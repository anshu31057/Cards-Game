"""CardStrike - Production FastAPI application"""
import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routes import rooms, health
from app.websocket.manager import router as ws_router
from app.database.db import init_db

FRONTEND_URL = os.getenv("FRONTEND_URL", "https://game.vercittycreations.xyz")
ALLOWED_ORIGINS = [
    FRONTEND_URL,
    "https://game.vercittycreations.xyz",
    "https://www.vercittycreations.xyz",
    # Allow localhost for dev
    "http://localhost:5173",
    "http://localhost:3000",
    "http://127.0.0.1:5173",
]

def create_app() -> FastAPI:
    app = FastAPI(
        title="CardStrike API",
        version="1.0.0",
        docs_url="/docs" if os.getenv("ENV") != "production" else None,
        redoc_url=None,
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=ALLOWED_ORIGINS,
        allow_credentials=True,
        allow_methods=["GET", "POST", "DELETE", "OPTIONS"],
        allow_headers=["*"],
    )

    @app.on_event("startup")
    async def startup():
        await init_db()

    app.include_router(health.router, prefix="/api", tags=["health"])
    app.include_router(rooms.router, prefix="/api/rooms", tags=["rooms"])
    app.include_router(ws_router, tags=["websocket"])

    return app
