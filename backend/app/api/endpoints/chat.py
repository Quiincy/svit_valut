from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models import models
from app.api.deps import require_admin
from app.schemas import ChatSessionCreate, ChatSession, ChatMessage, ChatMessageCreate
from datetime import datetime, timezone
from typing import List

router = APIRouter()

@router.post("/session", response_model=ChatSession)
async def init_chat_session(session_create: ChatSessionCreate, db: Session = Depends(get_db)):
    """Initialize or fetch a chat session for a user"""
    session = db.query(models.ChatSession).filter(models.ChatSession.session_id == session_create.session_id).first()
    if not session:
        session = models.ChatSession(session_id=session_create.session_id)
        db.add(session)
        db.commit()
        db.refresh(session)
    return session

@router.get("/messages", response_model=List[ChatMessage])
async def get_chat_messages(session_id: str, db: Session = Depends(get_db)):
    """User fetching their messages"""
    session = db.query(models.ChatSession).filter(models.ChatSession.session_id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    messages = db.query(models.ChatMessage).filter(models.ChatMessage.session_id == session.id).order_by(models.ChatMessage.created_at.asc()).all()
    
    # Mark admin messages as read by user
    unread_admin_msgs = [m for m in messages if m.sender == 'admin' and not m.is_read]
    if unread_admin_msgs:
        for m in unread_admin_msgs:
            m.is_read = True
        db.commit()

    return messages

@router.post("/messages", response_model=ChatMessage)
async def send_chat_message(session_id: str, msg: ChatMessageCreate, db: Session = Depends(get_db)):
    """User sending a message"""
    session = db.query(models.ChatSession).filter(models.ChatSession.session_id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    new_msg = models.ChatMessage(
        session_id=session.id,
        sender="user",
        content=msg.content
    )
    db.add(new_msg)
    
    session.last_message_at = datetime.now(timezone.utc)
    # Reopen session if it was previously closed by admin
    if session.status == models.ChatSessionStatus.CLOSED:
        session.status = models.ChatSessionStatus.ACTIVE
        
    db.commit()
    db.refresh(new_msg)
    
@router.get("/admin/sessions", response_model=List[ChatSession])
async def admin_get_chat_sessions(user: models.User = Depends(require_admin), db: Session = Depends(get_db)):
    """Admin get all active chat sessions sorted by recent activity"""
    sessions = db.query(models.ChatSession).filter(models.ChatSession.status == models.ChatSessionStatus.ACTIVE).order_by(models.ChatSession.last_message_at.desc()).all()
    return sessions

@router.get("/admin/sessions/{session_id}/messages", response_model=List[ChatMessage])
async def admin_get_session_messages(session_id: str, user: models.User = Depends(require_admin), db: Session = Depends(get_db)):
    """Admin get messages for a session"""
    session = db.query(models.ChatSession).filter(models.ChatSession.session_id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    messages = db.query(models.ChatMessage).filter(models.ChatMessage.session_id == session.id).order_by(models.ChatMessage.created_at.asc()).all()
    return messages

@router.post("/admin/sessions/{session_id}/messages", response_model=ChatMessage)
async def admin_send_chat_message(session_id: str, msg: ChatMessageCreate, user: models.User = Depends(require_admin), db: Session = Depends(get_db)):
    """Admin sending a message"""
    session = db.query(models.ChatSession).filter(models.ChatSession.session_id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    new_msg = models.ChatMessage(
        session_id=session.id,
        sender="admin",
        content=msg.content
    )
    db.add(new_msg)
    
    session.last_message_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(new_msg)
    
    return new_msg

@router.post("/admin/sessions/{session_id}/read")
async def admin_mark_messages_read(session_id: str, user: models.User = Depends(require_admin), db: Session = Depends(get_db)):
    """Admin marks user messages as read"""
    session = db.query(models.ChatSession).filter(models.ChatSession.session_id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    unread_user_msgs = db.query(models.ChatMessage).filter(
        models.ChatMessage.session_id == session.id,
        models.ChatMessage.sender == 'user',
        models.ChatMessage.is_read == False
    ).all()
    
    for m in unread_user_msgs:
        m.is_read = True
        
    db.commit()
    return {"success": True}
    
@router.put("/admin/sessions/{session_id}/close")
async def admin_close_chat_session(session_id: str, user: models.User = Depends(require_admin), db: Session = Depends(get_db)):
    """Admin closes a chat session"""
    session = db.query(models.ChatSession).filter(models.ChatSession.session_id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
        
    session.status = models.ChatSessionStatus.CLOSED
    db.commit()
    return {"success": True}
