from contextlib import asynccontextmanager
from datetime import datetime, timezone
import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

from app.database import engine, init_db
from app.routers import users, programs, matching, assessments, profile
from app.schemas import HealthResponse


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield


app = FastAPI(lifespan=lifespan)

# 新增：配置 CORS 中间件
_cors_origins = [
    "http://localhost:3000",
    "http://localhost:3001",
]
_extra = os.getenv("CORS_ORIGINS", "")
if _extra:
    _cors_origins.extend(o.strip() for o in _extra.split(",") if o.strip())

app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# API routers
app.include_router(users.router)
app.include_router(programs.router)
app.include_router(matching.router)
app.include_router(assessments.router)
app.include_router(profile.router)

# Frontend expects /api/health
@app.get("/api/health", response_model=HealthResponse)
async def api_health_check():
    database_status = "disconnected"
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        database_status = "connected"
    except Exception:
        database_status = "disconnected"

    return HealthResponse(
        status="healthy" if database_status == "connected" else "degraded",
        timestamp=datetime.now(timezone.utc).isoformat(),
        service="optima-backend",
        version="1.0.0",
        database_status=database_status,
    )

# 定义 /health 接口（GET 请求）
@app.get("/health")
async def health_check():
    return {"status": "engine running", "version": "1.0"}