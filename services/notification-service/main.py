from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime
import uuid
import logging

# 로깅 설정
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="Notification Service",
    description="Notification microservice",
    version="1.0.0"
)

# 예시 알림 데이터
notifications = [
    {
        "id": "1",
        "user_id": 1,
        "title": "Welcome!",
        "message": "Welcome to TaeheonAI platform",
        "type": "info",
        "read": False,
        "created_at": "2024-01-01T00:00:00"
    },
    {
        "id": "2",
        "user_id": 2,
        "title": "New Message",
        "message": "You have a new message",
        "type": "message",
        "read": True,
        "created_at": "2024-01-02T00:00:00"
    }
]

# Pydantic 모델
class Notification(BaseModel):
    id: str
    user_id: int
    title: str
    message: str
    type: str
    read: bool
    created_at: str

class CreateNotification(BaseModel):
    user_id: int
    title: str
    message: str
    type: str = "info"

class UpdateNotification(BaseModel):
    read: bool

@app.get("/health")
async def health_check():
    """서비스 헬스 체크"""
    return {
        "status": "healthy",
        "service": "notification-service",
        "timestamp": datetime.now().isoformat()
    }

@app.get("/notifications", response_model=List[Notification])
async def get_notifications(user_id: Optional[int] = None):
    """알림 목록 조회"""
    logger.info(f"📬 Fetching notifications for user {user_id}")
    
    if user_id is not None:
        user_notifications = [n for n in notifications if n["user_id"] == user_id]
        return user_notifications
    return notifications

@app.get("/notifications/{notification_id}", response_model=Notification)
async def get_notification(notification_id: str):
    """특정 알림 조회"""
    logger.info(f"📢 Fetching notification {notification_id}")
    
    for notification in notifications:
        if notification["id"] == notification_id:
            return notification
    raise HTTPException(status_code=404, detail="Notification not found")

@app.post("/notifications", response_model=Notification)
async def create_notification(notification: CreateNotification):
    """새로운 알림 생성"""
    logger.info(f"➕ Creating notification for user {notification.user_id}")
    
    new_notification = {
        "id": str(uuid.uuid4()),
        "user_id": notification.user_id,
        "title": notification.title,
        "message": notification.message,
        "type": notification.type,
        "read": False,
        "created_at": datetime.now().isoformat()
    }
    
    notifications.append(new_notification)
    return new_notification

@app.put("/notifications/{notification_id}", response_model=Notification)
async def update_notification(notification_id: str, update_data: UpdateNotification):
    """알림 업데이트 (읽음 상태 등)"""
    logger.info(f"✏️ Updating notification {notification_id}")
    
    for i, notification in enumerate(notifications):
        if notification["id"] == notification_id:
            notifications[i]["read"] = update_data.read
            return notifications[i]
    raise HTTPException(status_code=404, detail="Notification not found")

@app.delete("/notifications/{notification_id}")
async def delete_notification(notification_id: str):
    """알림 삭제"""
    logger.info(f"🗑️ Deleting notification {notification_id}")
    
    for i, notification in enumerate(notifications):
        if notification["id"] == notification_id:
            deleted_notification = notifications.pop(i)
            return {"message": f"Notification '{deleted_notification['title']}' deleted successfully"}
    raise HTTPException(status_code=404, detail="Notification not found")

@app.get("/notifications/user/{user_id}/unread")
async def get_unread_notifications(user_id: int):
    """사용자의 읽지 않은 알림 조회"""
    logger.info(f"📬 Fetching unread notifications for user {user_id}")
    
    unread_notifications = [
        n for n in notifications 
        if n["user_id"] == user_id and not n["read"]
    ]
    
    return {
        "user_id": user_id,
        "unread_count": len(unread_notifications),
        "notifications": unread_notifications
    }

@app.post("/notifications/user/{user_id}/mark-all-read")
async def mark_all_notifications_read(user_id: int):
    """사용자의 모든 알림을 읽음으로 표시"""
    logger.info(f"✅ Marking all notifications as read for user {user_id}")
    
    updated_count = 0
    for notification in notifications:
        if notification["user_id"] == user_id and not notification["read"]:
            notification["read"] = True
            updated_count += 1
    
    return {
        "user_id": user_id,
        "updated_count": updated_count,
        "message": f"Marked {updated_count} notifications as read"
    }

@app.get("/")
async def root():
    """서비스 루트 엔드포인트"""
    return {
        "message": "Notification Service",
        "version": "1.0.0",
        "endpoints": {
            "health": "/health",
            "notifications": "/notifications",
            "notification": "/notifications/{notification_id}",
            "unread": "/notifications/user/{user_id}/unread",
            "mark_all_read": "/notifications/user/{user_id}/mark-all-read"
        }
    }

if __name__ == "__main__":
    import uvicorn
    import os
    
    # Railway에서 제공하는 PORT 환경변수 사용
    port = int(os.getenv("PORT", 8003))
    uvicorn.run(app, host="0.0.0.0", port=port) 