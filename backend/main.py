import os
from typing import Optional
import httpx
from pathlib import Path
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Header
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr

load_dotenv(Path(__file__).resolve().parent / ".env")
load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL", "").rstrip("/")
SUPABASE_PUBLISHABLE_KEY = os.getenv("SUPABASE_PUBLISHABLE_KEY", "")
SUPABASE_SECRET_KEY = os.getenv("SUPABASE_SECRET_KEY", "")
SUPABASE_JWKS_URL = os.getenv(
    "SUPABASE_JWKS_URL", f"{SUPABASE_URL}/auth/v1/.well-known/jwks.json"
)

app = FastAPI(
    title="Everquest API",
    description="Backend FastAPI integrado ao Supabase para o app Everquest",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class RegisterRequest(BaseModel):
    username: str
    email: EmailStr
    password: str


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


def translate_supabase_error(msg: str) -> str:
    lower = msg.lower()
    if (
        "already been registered" in lower
        or "already registered" in lower
        or "user already exists" in lower
    ):
        return "Este e-mail já está cadastrado."
    if "invalid login credentials" in lower:
        return "E-mail ou senha incorretos."
    if "rate limit" in lower:
        return "Limite de tentativas excedido. Tente novamente em instantes."
    if "password should be at least" in lower:
        return "A senha deve ter pelo menos 6 caracteres."
    return msg


@app.get("/health")
async def health_check():
    return {
        "status": "ok",
        "service": "Everquest FastAPI",
        "supabase_url": SUPABASE_URL,
    }


@app.post("/auth/register")
async def register_user(payload: RegisterRequest):
    """
    Cria o usuário usando a Admin API do Supabase (com SUPABASE_SECRET_KEY)
    e já autentica automaticamente retornando access_token e dados do usuário.
    """
    admin_headers = {
        "apikey": SUPABASE_SECRET_KEY,
        "Authorization": f"Bearer {SUPABASE_SECRET_KEY}",
        "Content-Type": "application/json",
    }
    admin_body = {
        "email": payload.email,
        "password": payload.password,
        "email_confirm": True,
        "user_metadata": {
            "username": payload.username,
            "display_name": payload.username,
        },
    }

    async with httpx.AsyncClient(timeout=15.0) as client:
        response = await client.post(
            f"{SUPABASE_URL}/auth/v1/admin/users",
            headers=admin_headers,
            json=admin_body,
        )

        data = response.json()
        if response.status_code >= 400:
            raw_msg = (
                data.get("msg")
                or data.get("error_description")
                or data.get("message")
                or "Erro ao cadastrar usuário"
            )
            raise HTTPException(
                status_code=response.status_code,
                detail=translate_supabase_error(raw_msg),
            )

        # Já realiza o login imediato para retornar a sessão autenticada
        login_headers = {
            "apikey": SUPABASE_PUBLISHABLE_KEY,
            "Content-Type": "application/json",
        }
        login_res = await client.post(
            f"{SUPABASE_URL}/auth/v1/token?grant_type=password",
            headers=login_headers,
            json={"email": payload.email, "password": payload.password},
        )
        login_data = login_res.json() if login_res.status_code < 400 else {}

    return {
        "message": "Conta criada e autenticada com sucesso!",
        "access_token": login_data.get("access_token"),
        "refresh_token": login_data.get("refresh_token"),
        "user": login_data.get("user") or data,
    }


@app.post("/auth/login")
async def login_user(payload: LoginRequest):
    headers = {
        "apikey": SUPABASE_PUBLISHABLE_KEY,
        "Content-Type": "application/json",
    }
    body = {
        "email": payload.email,
        "password": payload.password,
    }

    async with httpx.AsyncClient(timeout=15.0) as client:
        response = await client.post(
            f"{SUPABASE_URL}/auth/v1/token?grant_type=password",
            headers=headers,
            json=body,
        )

    data = response.json()
    if response.status_code >= 400:
        raw_msg = (
            data.get("msg")
            or data.get("error_description")
            or data.get("message")
            or "E-mail ou senha inválidos"
        )
        raise HTTPException(
            status_code=response.status_code,
            detail=translate_supabase_error(raw_msg),
        )

    return {
        "access_token": data.get("access_token"),
        "refresh_token": data.get("refresh_token"),
        "user": data.get("user"),
    }


@app.get("/auth/me")
async def get_current_user(authorization: Optional[str] = Header(default=None)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Token de autenticação ausente")

    headers = {
        "apikey": SUPABASE_PUBLISHABLE_KEY,
        "Authorization": authorization,
    }

    async with httpx.AsyncClient(timeout=15.0) as client:
        response = await client.get(
            f"{SUPABASE_URL}/auth/v1/user",
            headers=headers,
        )

    if response.status_code >= 400:
        raise HTTPException(status_code=401, detail="Token inválido ou expirado")

    return response.json()
