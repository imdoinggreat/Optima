import json
import os
import re
import time
from typing import Generator

from dotenv import load_dotenv, find_dotenv
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, Session

from app.models import Base

# #region agent log
_LOG_PATH = "/Users/ziruzhang/Desktop/wthimf/.cursor/debug-e40d20.log"

def _dbg(msg: str, data: dict, hyp: str) -> None:
    try:
        entry = json.dumps({"sessionId": "e40d20", "timestamp": int(time.time() * 1000), "location": "database.py", "message": msg, "data": data, "hypothesisId": hyp})
        with open(_LOG_PATH, "a") as _f:
            _f.write(entry + "\n")
    except Exception:
        pass
# #endregion

# #region agent log
_dotenv_path = find_dotenv(usecwd=True)
_dotenv_loaded = load_dotenv(_dotenv_path, override=False)
_dbg("dotenv load result", {"found_path": _dotenv_path, "loaded": _dotenv_loaded, "cwd": os.getcwd()}, "H-D")
# #endregion


def _normalize_database_url(url: str) -> str:
    # Supabase Postgres requires SSL. If user didn't specify sslmode, default to require.
    if url.startswith("postgresql://") or url.startswith("postgres://"):
        if "sslmode=" not in url:
            sep = "&" if "?" in url else "?"
            return f"{url}{sep}sslmode=require"
    return url


def _get_database_url():
    raw_db_url = os.getenv("DATABASE_URL")
    raw_pg_dsn = os.getenv("POSTGRES_DSN")
    url = raw_db_url or raw_pg_dsn

    # #region agent log
    username = re.search(r'://([^:@]+)', url).group(1) if url and re.search(r'://([^:@]+)', url) else None
    host = re.search(r'@([^:/]+)', url).group(1) if url and re.search(r'@([^:/]+)', url) else None
    masked = re.sub(r'://([^:]+):([^@]+)@', lambda m: '://' + m.group(1) + ':***@', url) if url else None
    _dbg("env vars read", {
        "DATABASE_URL_set": raw_db_url is not None,
        "POSTGRES_DSN_set": raw_pg_dsn is not None,
        "using_url_masked": masked,
        "username": username,
        "host": host,
    }, "H-A H-D H-E")
    # #endregion

    if url:
        return _normalize_database_url(url)

    # #region agent log
    _dbg("falling back to SQLite (no DATABASE_URL set)", {"runId": "post-fix"}, "H-B")
    # #endregion
    print("[database] DATABASE_URL not set — using local SQLite: optima.dev.sqlite3")
    return "sqlite+pysqlite:///./optima.dev.sqlite3"


DATABASE_URL = _get_database_url()

_is_postgres = DATABASE_URL.startswith("postgres")

engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True,       # 每次使用前检测连接有效性，无效自动重建，解决断连报错
    pool_recycle=300,          # 每 5 分钟回收连接，适配 Supabase 的空闲超时策略
    pool_size=10 if _is_postgres else 1,
    max_overflow=5 if _is_postgres else 0,
    pool_timeout=30,           # 获取连接的最长等待时间，避免无限阻塞
    connect_args={"connect_timeout": 10} if _is_postgres else {},
)

SessionLocal = sessionmaker(bind=engine, autocommit=False, autoflush=False)


def _add_column_if_missing(conn, table: str, column: str, col_type: str) -> None:
    """SQLite/Postgres 通用：若列不存在则用 ALTER TABLE 添加。"""
    try:
        if _is_postgres:
            result = conn.execute(
                text(
                    "SELECT column_name FROM information_schema.columns "
                    "WHERE table_name=:t AND column_name=:c"
                ),
                {"t": table, "c": column},
            )
            column_exists = result.fetchone() is not None
        else:
            rows = conn.execute(text(f"PRAGMA table_info({table})")).fetchall()
            column_exists = any(row[1] == column for row in rows)

        if not column_exists:
            conn.execute(text(f"ALTER TABLE {table} ADD COLUMN {column} {col_type}"))
    except Exception as exc:
        print(f"[database] WARNING: could not add column {table}.{column} — {exc}")


def init_db() -> None:
    """创建所有表，连接失败时仅打印警告，不阻断启动。"""
    try:
        Base.metadata.create_all(bind=engine)
        # 对已存在的 users 表补充新字段（兼容旧库）
        with engine.begin() as conn:
            _add_column_if_missing(conn, "users", "undergraduate_school_tier", "VARCHAR(20)")
            _add_column_if_missing(conn, "users", "skill_self_assessment", "JSON")
        # #region agent log
        _dbg("init_db success", {"runId": "post-fix"}, "H-B H-C")
        # #endregion
    except Exception as exc:
        # #region agent log
        _dbg("init_db failed", {"runId": "post-fix", "error_type": type(exc).__name__, "error": str(exc)[:300]}, "H-B H-C")
        # #endregion
        print(f"[database] WARNING: could not run create_all — {exc}")


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    except Exception as exc:
        # #region agent log
        _dbg("get_db session error", {"error_type": type(exc).__name__, "error": str(exc)[:300]}, "H-B H-C")
        # #endregion
        raise
    finally:
        db.close()
