from fastapi import APIRouter
from app.api.endpoints import public, branches, rates, chat, seo

api_router = APIRouter()

# Public Endpoints
api_router.include_router(public.router, tags=["Public"])

# Public Branches
api_router.include_router(branches.router, prefix="/branches", tags=["Branches"])

# Public Rates
api_router.include_router(rates.router, prefix="/rates", tags=["Rates"])

# Chat Endpoints
api_router.include_router(chat.router, prefix="/chat", tags=["Chat"])

# SEO Endpoints
api_router.include_router(seo.router, prefix="/seo", tags=["SEO"])
