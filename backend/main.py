from contextlib import asynccontextmanager
from datetime import datetime, timezone

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
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",  # 允许你的 Next.js 前端地址
    ],
    allow_credentials=True,
    allow_methods=["*"],  # 允许所有 HTTP 方法（GET, POST 等）
    allow_headers=["*"],  # 允许所有请求头
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