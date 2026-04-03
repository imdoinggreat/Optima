import hashlib
from typing import Optional

from fastapi import Depends, Header, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app import models


def get_password_hash(password: str) -> str:
    return hashlib.sha256(password.encode("utf-8")).hexdigest()


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return get_password_hash(plain_password) == hashed_password


def get_current_user(
    db: Session = Depends(get_db),
    x_user_id: Optional[str] = Header(default=None, alias="X-User-Id"),
) -> models.User:
    """
    Minimal auth dependency for dev.

    - If `X-User-Id` header is provided, loads that user.
    - 若 header 为 1 且用户不存在，则自动创建一个演示用户，方便前端联调。
    """
    if not x_user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing X-User-Id header",
        )

    try:
        user_id = int(x_user_id)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid X-User-Id"
        ) from e

    user = db.query(models.User).filter(models.User.id == user_id).first()

    if not user:
        if user_id == 1:
            user = models.User(
                email="demo_user_1@example.com",
                nickname="Demo User",
                undergraduate_school="Demo University",
                undergraduate_major="",
                gpa=3.5,
                language_score="NA",
            )
            db.add(user)
            db.commit()
            db.refresh(user)
        else:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found"
            )
    return user
