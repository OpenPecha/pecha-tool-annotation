from pydantic import BaseModel
from datetime import datetime
from typing import Optional


class UserRejectedTextBase(BaseModel):
    user_id: int
    text_id: int


class UserRejectedTextCreate(UserRejectedTextBase):
    pass


class UserRejectedTextResponse(UserRejectedTextBase):
    id: int
    rejected_at: datetime

    class Config:
        from_attributes = True


class RejectedTextWithDetails(BaseModel):
    id: int
    text_id: int
    text_title: str
    text_language: Optional[str] = None
    rejected_at: datetime

    class Config:
        from_attributes = True 