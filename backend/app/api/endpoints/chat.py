from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models import models
from app.api.deps import require_admin
from app.schemas import ChatSessionCreate, ChatSession, ChatMessage, ChatMessageCreate
import shutil
import os
import uuid
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

    for m in messages:
        if m.created_at and m.created_at.tzinfo is None:
            m.created_at = m.created_at.replace(tzinfo=timezone.utc)

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
    
    if new_msg.created_at and new_msg.created_at.tzinfo is None:
        new_msg.created_at = new_msg.created_at.replace(tzinfo=timezone.utc)
    return new_msg
@router.get("/admin/sessions", response_model=List[ChatSession])
async def admin_get_chat_sessions(user: models.User = Depends(require_admin), db: Session = Depends(get_db)):
    """Admin get all active chat sessions sorted by recent activity, excluding empty sessions"""
    from sqlalchemy import exists
    sessions = (
        db.query(models.ChatSession)
        .filter(
            models.ChatSession.status == models.ChatSessionStatus.ACTIVE,
            exists().where(models.ChatMessage.session_id == models.ChatSession.id)
        )
        .order_by(models.ChatSession.last_message_at.desc())
        .all()
    )
    for s in sessions:
        if s.created_at and s.created_at.tzinfo is None:
            s.created_at = s.created_at.replace(tzinfo=timezone.utc)
        if s.last_message_at and s.last_message_at.tzinfo is None:
            s.last_message_at = s.last_message_at.replace(tzinfo=timezone.utc)
    return sessions

@router.get("/admin/sessions/{session_id}/messages", response_model=List[ChatMessage])
async def admin_get_session_messages(session_id: str, user: models.User = Depends(require_admin), db: Session = Depends(get_db)):
    """Admin get messages for a session"""
    session = db.query(models.ChatSession).filter(models.ChatSession.session_id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    messages = db.query(models.ChatMessage).filter(models.ChatMessage.session_id == session.id).order_by(models.ChatMessage.created_at.asc()).all()
    
    for m in messages:
        if m.created_at and m.created_at.tzinfo is None:
            m.created_at = m.created_at.replace(tzinfo=timezone.utc)
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
    
    if new_msg.created_at and new_msg.created_at.tzinfo is None:
        new_msg.created_at = new_msg.created_at.replace(tzinfo=timezone.utc)
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

UPLOAD_DIR = "static/uploads/chat"
os.makedirs(UPLOAD_DIR, exist_ok=True)

ALLOWED_EXTENSIONS = {"jpg", "jpeg", "png", "gif", "webp"}
ALLOWED_MIME_TYPES = {"image/jpeg", "image/png", "image/gif", "image/webp"}
MAX_FILE_SIZE = 5 * 1024 * 1024  # 5 MB

def validate_image_file(file: UploadFile):
    """Validate uploaded file is a safe image"""
    # 1. Check extension
    ext = file.filename.split(".")[-1].lower() if "." in file.filename else ""
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=400, detail=f"Дозволені лише зображення ({', '.join(ALLOWED_EXTENSIONS)})")

    # 2. Check MIME type
    if file.content_type not in ALLOWED_MIME_TYPES:
        raise HTTPException(status_code=400, detail="Невірний тип файлу. Дозволені лише зображення.")

    # 3. Check file size (read content)
    content = file.file.read()
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail="Файл занадто великий (максимум 5 МБ)")

    # 4. Check magic bytes (first bytes of real image files)
    magic = content[:8]
    is_jpeg = magic[:2] == b'\xff\xd8'
    is_png = magic[:4] == b'\x89PNG'
    is_gif = magic[:3] in (b'GIF', )
    is_webp = magic[:4] == b'RIFF' and content[8:12] == b'WEBP' if len(content) > 12 else False

    if not (is_jpeg or is_png or is_gif or is_webp):
        raise HTTPException(status_code=400, detail="Файл не є справжнім зображенням")

    # Reset file position for saving
    file.file.seek(0)
    return ext

@router.post("/messages/image", response_model=ChatMessage)
async def upload_chat_image_user(
    session_id: str = Form(...),
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    """User uploads an image in chat"""
    session = db.query(models.ChatSession).filter(models.ChatSession.session_id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    ext = validate_image_file(file)
    filename = f"{uuid.uuid4()}.{ext}"
    file_path = os.path.join(UPLOAD_DIR, filename)

    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    image_url = f"/{file_path}"

    new_msg = models.ChatMessage(
        session_id=session.id,
        sender="user",
        content="",
        image_url=image_url
    )
    db.add(new_msg)

    session.last_message_at = datetime.now(timezone.utc)
    if session.status == models.ChatSessionStatus.CLOSED:
        session.status = models.ChatSessionStatus.ACTIVE

    db.commit()
    db.refresh(new_msg)

    if new_msg.created_at and new_msg.created_at.tzinfo is None:
        new_msg.created_at = new_msg.created_at.replace(tzinfo=timezone.utc)
    return new_msg

@router.post("/admin/sessions/{session_id}/messages/image", response_model=ChatMessage)
async def admin_upload_chat_image(
    session_id: str,
    file: UploadFile = File(...),
    user: models.User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Admin uploads an image in chat"""
    session = db.query(models.ChatSession).filter(models.ChatSession.session_id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    ext = validate_image_file(file)
    filename = f"{uuid.uuid4()}.{ext}"
    file_path = os.path.join(UPLOAD_DIR, filename)

    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    image_url = f"/{file_path}"

    new_msg = models.ChatMessage(
        session_id=session.id,
        sender="admin",
        content="",
        image_url=image_url
    )
    db.add(new_msg)

    session.last_message_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(new_msg)

    if new_msg.created_at and new_msg.created_at.tzinfo is None:
        new_msg.created_at = new_msg.created_at.replace(tzinfo=timezone.utc)
    return new_msg

