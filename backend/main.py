import json
import os
import random
import sqlite3
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional

import httpx
from dotenv import load_dotenv
from fastapi import FastAPI, Header, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr, Field

load_dotenv(Path(__file__).resolve().parent / ".env")
load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL", "").rstrip("/")
SUPABASE_PUBLISHABLE_KEY = os.getenv("SUPABASE_PUBLISHABLE_KEY", "")
SUPABASE_SECRET_KEY = os.getenv("SUPABASE_SECRET_KEY", "")
SUPABASE_JWKS_URL = os.getenv(
    "SUPABASE_JWKS_URL", f"{SUPABASE_URL}/auth/v1/.well-known/jwks.json"
)

DB_PATH = Path(__file__).resolve().parent / "everquest.db"

XP_PER_LEVEL = 100

CHEST_TIERS_CONFIG: Dict[str, Dict[str, Any]] = {
    "wood": {
        "id": "wood",
        "name": "Wood",
        "label": "Baú Wood",
        "coins": 3,
        "xp": 5,
    },
    "iron": {
        "id": "iron",
        "name": "Iron",
        "label": "Baú Iron",
        "coins": 5,
        "xp": 10,
    },
    "gold": {
        "id": "gold",
        "name": "Gold",
        "label": "Baú Gold",
        "coins": 10,
        "xp": 20,
    },
}

DAILY_QUEST_POOLS: Dict[str, List[Dict[str, Any]]] = {
    "wood": [
        {
            "id": "wood_focus_1",
            "title": "Realize uma sessão de foco",
            "target": 1,
            "metric": "focus_sessions",
        },
        {
            "id": "wood_focus_15m",
            "title": "Acumule 15 minutos em sessão de foco",
            "target": 1,
            "metric": "focus_15m",
        },
        {
            "id": "wood_task_create",
            "title": "Planeje uma tarefa para o seu dia",
            "target": 1,
            "metric": "tasks_created_today",
        },
    ],
    "iron": [
        {
            "id": "iron_task_1",
            "title": "Realize uma tarefa",
            "target": 1,
            "metric": "tasks_completed",
        },
        {
            "id": "iron_focus_2",
            "title": "Realize duas sessões de foco",
            "target": 2,
            "metric": "focus_sessions",
        },
        {
            "id": "iron_task_priority",
            "title": "Conclua uma tarefa pendente hoje",
            "target": 1,
            "metric": "tasks_completed",
        },
    ],
    "gold": [
        {
            "id": "gold_task_3",
            "title": "Realize três tarefas",
            "target": 3,
            "metric": "tasks_completed",
        },
        {
            "id": "gold_focus_3",
            "title": "Realize três sessões de foco no dia",
            "target": 3,
            "metric": "focus_sessions",
        },
        {
            "id": "gold_combo",
            "title": "Realize duas tarefas e uma sessão de foco",
            "target": 3,
            "metric": "combo_tasks_focus",
        },
    ],
}

DEFAULT_AVATAR_CONFIG: Dict[str, Any] = {
    "race": "human",
    "skinColor": "#F4C2A8",
    "hair": "hair1",
    "hairColor": "#1B0700",
    "shirtColor": "#7153FD",
    "pantsColor": "#272E59",
}

SEED_ADVENTURERS: List[Dict[str, Any]] = [
    {
        "id": "friend-1",
        "email": "ayla@everquest.app",
        "username": "aylamoon",
        "character_name": "Ayla",
        "level": 7,
        "xp": 640,
        "coins": 45,
        "avatar_config": {
            "race": "human",
            "skinColor": "#F4C2A8",
            "hair": "hair2",
            "hairColor": "#8D3B1E",
            "shirtColor": "#7153FD",
            "pantsColor": "#272E59",
        },
        "auto_friend": True,
    },
    {
        "id": "friend-2",
        "email": "kael@everquest.app",
        "username": "kaelstorm",
        "character_name": "Kael",
        "level": 5,
        "xp": 420,
        "coins": 30,
        "avatar_config": {
            "race": "human",
            "skinColor": "#D5896B",
            "hair": "hair6",
            "hairColor": "#0F0F14",
            "shirtColor": "#222123",
            "pantsColor": "#18181F",
        },
        "auto_friend": True,
    },
    {
        "id": "friend-3",
        "email": "grok@everquest.app",
        "username": "grokzen",
        "character_name": "Grok",
        "level": 9,
        "xp": 840,
        "coins": 80,
        "avatar_config": {
            "race": "goblin",
            "hair": "hair4",
            "hairColor": "#E2E8F0",
            "shirtColor": "#2E7D32",
            "pantsColor": "#4E311F",
        },
        "auto_friend": True,
    },
    {
        "id": "friend-4",
        "email": "lyra@everquest.app",
        "username": "lyrastar",
        "character_name": "Lyra",
        "level": 4,
        "xp": 335,
        "coins": 25,
        "avatar_config": {
            "race": "human",
            "skinColor": "#E5A687",
            "hair": "hair5",
            "hairColor": "#E6B84D",
            "shirtColor": "#FBA0FE",
            "pantsColor": "#392682",
        },
        "auto_friend": True,
    },
    {
        "id": "friend-5",
        "email": "dante@everquest.app",
        "username": "dantev",
        "character_name": "Dante",
        "level": 6,
        "xp": 550,
        "coins": 40,
        "avatar_config": {
            "race": "human",
            "skinColor": "#8D4A32",
            "hair": "hair3",
            "hairColor": "#1B0700",
            "shirtColor": "#B71C1C",
            "pantsColor": "#18181F",
        },
        "auto_friend": True,
    },
    {
        "id": "friend-6",
        "email": "ziggs@everquest.app",
        "username": "ziggsfoco",
        "character_name": "Ziggs",
        "level": 3,
        "xp": 245,
        "coins": 15,
        "avatar_config": {
            "race": "goblin",
            "hair": "hair1",
            "hairColor": "#7153FD",
            "shirtColor": "#1B3B8B",
            "pantsColor": "#272E59",
        },
        "auto_friend": True,
    },
    {
        "id": "friend-7",
        "email": "orion@everquest.app",
        "username": "orionblade",
        "character_name": "Orion",
        "level": 8,
        "xp": 710,
        "coins": 55,
        "avatar_config": {
            "race": "human",
            "skinColor": "#E5A687",
            "hair": "hair6",
            "hairColor": "#E2E8F0",
            "shirtColor": "#1B3B8B",
            "pantsColor": "#18181F",
        },
        "auto_friend": False,
    },
    {
        "id": "friend-8",
        "email": "mira@everquest.app",
        "username": "mirasun",
        "character_name": "Mira",
        "level": 5,
        "xp": 430,
        "coins": 35,
        "avatar_config": {
            "race": "goblin",
            "hair": "hair2",
            "hairColor": "#E6B84D",
            "shirtColor": "#7153FD",
            "pantsColor": "#392682",
        },
        "auto_friend": False,
    },
]

SEED_BADGES: List[Dict[str, Any]] = [
    {
        "id": "badge1",
        "title": "Primeira tarefa",
        "description": "Conclua sua primeira tarefa",
        "image": "badge1",
        "goal_type": "tasks_completed",
        "goal_target": 1,
    },
    {
        "id": "badge2",
        "title": "Construindo comunidade",
        "description": "Atinja o número de 10 amigos",
        "image": "badge2",
        "goal_type": "friends_count",
        "goal_target": 10,
    },
    {
        "id": "badge3",
        "title": "Suma transcendência",
        "description": "Foque por 30 horas",
        "image": "badge3",
        "goal_type": "focus_hours",
        "goal_target": 30,
    },
]


def get_today_date_key() -> str:
    return datetime.now().strftime("%Y-%m-%d")


def calculate_level_info(total_xp: int) -> Dict[str, int]:
    safe_xp = max(0, int(total_xp or 0))
    level = (safe_xp // XP_PER_LEVEL) + 1
    current_level_xp = safe_xp % XP_PER_LEVEL
    progress_percent = min(100, round((current_level_xp / XP_PER_LEVEL) * 100))
    return {
        "level": level,
        "totalXp": safe_xp,
        "currentLevelXp": current_level_xp,
        "xpForNextLevel": XP_PER_LEVEL,
        "progressPercent": progress_percent,
    }


def get_db_connection() -> sqlite3.Connection:
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON;")
    return conn


def init_database() -> None:
    now_iso = datetime.now(timezone.utc).isoformat()
    with get_db_connection() as conn:
        conn.executescript(
            """
            CREATE TABLE IF NOT EXISTS profiles (
                id TEXT PRIMARY KEY,
                email TEXT,
                username TEXT NOT NULL UNIQUE,
                character_name TEXT NOT NULL DEFAULT 'Aventureiro',
                level INTEGER NOT NULL DEFAULT 1,
                xp INTEGER NOT NULL DEFAULT 0,
                coins INTEGER NOT NULL DEFAULT 0,
                avatar_config TEXT NOT NULL,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS friendships (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                friend_id TEXT NOT NULL,
                status TEXT NOT NULL DEFAULT 'accepted',
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                UNIQUE (user_id, friend_id),
                FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE,
                FOREIGN KEY (friend_id) REFERENCES profiles(id) ON DELETE CASCADE
            );

            CREATE INDEX IF NOT EXISTS idx_friendships_user_id ON friendships (user_id);
            CREATE INDEX IF NOT EXISTS idx_friendships_friend_id ON friendships (friend_id);

            CREATE TABLE IF NOT EXISTS daily_activity_counters (
                user_id TEXT NOT NULL,
                activity_date TEXT NOT NULL,
                focus_sessions INTEGER NOT NULL DEFAULT 0,
                focus_seconds INTEGER NOT NULL DEFAULT 0,
                tasks_completed INTEGER NOT NULL DEFAULT 0,
                tasks_created INTEGER NOT NULL DEFAULT 0,
                updated_at TEXT NOT NULL,
                PRIMARY KEY (user_id, activity_date),
                FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS daily_quests (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                quest_date TEXT NOT NULL,
                tier TEXT NOT NULL,
                quest_id TEXT NOT NULL,
                title TEXT NOT NULL,
                metric TEXT NOT NULL,
                target INTEGER NOT NULL DEFAULT 1,
                progress INTEGER NOT NULL DEFAULT 0,
                completed INTEGER NOT NULL DEFAULT 0,
                claimed INTEGER NOT NULL DEFAULT 0,
                claimed_at TEXT,
                coins INTEGER NOT NULL,
                xp INTEGER NOT NULL,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                UNIQUE (user_id, quest_date, tier),
                FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE
            );

            CREATE INDEX IF NOT EXISTS idx_daily_quests_user_date
                ON daily_quests (user_id, quest_date);

            CREATE TABLE IF NOT EXISTS badges (
                id TEXT PRIMARY KEY,
                title TEXT NOT NULL,
                description TEXT NOT NULL,
                image TEXT NOT NULL DEFAULT 'badge1',
                goal_type TEXT NOT NULL,
                goal_target INTEGER NOT NULL DEFAULT 1,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS user_badges (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                badge_id TEXT NOT NULL,
                progress INTEGER NOT NULL DEFAULT 0,
                unlocked INTEGER NOT NULL DEFAULT 0,
                unlocked_at TEXT,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                UNIQUE (user_id, badge_id),
                FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE,
                FOREIGN KEY (badge_id) REFERENCES badges(id) ON DELETE CASCADE
            );
            """
        )

        for b in SEED_BADGES:
            conn.execute(
                """
                INSERT INTO badges (
                    id, title, description, image, goal_type, goal_target, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(id) DO UPDATE SET
                    title = excluded.title,
                    description = excluded.description,
                    image = excluded.image,
                    goal_type = excluded.goal_type,
                    goal_target = excluded.goal_target
                """,
                (
                    b["id"],
                    b["title"],
                    b["description"],
                    b["image"],
                    b["goal_type"],
                    b["goal_target"],
                    now_iso,
                    now_iso,
                ),
            )

        for adv in SEED_ADVENTURERS:
            conn.execute(
                """
                INSERT INTO profiles (
                    id, email, username, character_name, level, xp, coins, avatar_config, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(id) DO UPDATE SET
                    character_name = excluded.character_name,
                    level = excluded.level,
                    avatar_config = excluded.avatar_config
                """,
                (
                    adv["id"],
                    adv["email"],
                    adv["username"],
                    adv["character_name"],
                    adv["level"],
                    adv["xp"],
                    adv["coins"],
                    json.dumps(adv["avatar_config"]),
                    now_iso,
                    now_iso,
                ),
            )
        conn.commit()


init_database()


app = FastAPI(
    title="Everquest API",
    description="Backend FastAPI integrado ao Supabase e banco relacional para o app Everquest",
    version="1.2.0",
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


class ProfileSyncRequest(BaseModel):
    user_id: str
    email: Optional[str] = None
    username: str
    character_name: str = "Johnn"
    level: Optional[int] = None
    xp: Optional[int] = None
    coins: Optional[int] = None
    avatar_config: Dict[str, Any] = Field(
        default_factory=lambda: dict(DEFAULT_AVATAR_CONFIG)
    )


class AddFriendRequest(BaseModel):
    user_id: str
    friend_id: Optional[str] = None
    friend_username: Optional[str] = None


class ActivityProgressRequest(BaseModel):
    user_id: str
    date_key: Optional[str] = None
    event_type: str = "sync_counters"
    focus_sessions_delta: int = 0
    focus_seconds_delta: int = 0
    tasks_completed_delta: int = 0
    tasks_created_delta: int = 0
    focus_sessions_total: Optional[int] = None
    focus_seconds_total: Optional[int] = None
    tasks_completed_total: Optional[int] = None
    tasks_created_total: Optional[int] = None


class ClaimDailyQuestRequest(BaseModel):
    user_id: str
    tier: str
    date_key: Optional[str] = None


def normalize_username(raw: str) -> str:
    cleaned = (raw or "").strip().lstrip("@").lower()
    return "".join(ch for ch in cleaned if not ch.isspace()) or "aventureiro"


def serialize_profile_row(row: sqlite3.Row) -> Dict[str, Any]:
    try:
        avatar_cfg = json.loads(row["avatar_config"] or "{}")
    except Exception:
        avatar_cfg = dict(DEFAULT_AVATAR_CONFIG)

    uname = row["username"].lstrip("@")
    xp_val = int(row["xp"] or 0)
    lvl_info = calculate_level_info(xp_val)
    return {
        "id": row["id"],
        "email": row["email"],
        "username": f"@{uname}",
        "rawUsername": uname,
        "characterName": row["character_name"],
        "level": lvl_info["level"],
        "xp": xp_val,
        "coins": int(row["coins"] or 0),
        "avatarConfig": avatar_cfg,
    }


def serialize_daily_quest_row(row: sqlite3.Row) -> Dict[str, Any]:
    tier_key = row["tier"]
    tier_meta = CHEST_TIERS_CONFIG.get(tier_key, CHEST_TIERS_CONFIG["wood"])
    return {
        "id": row["id"],
        "userId": row["user_id"],
        "dateKey": row["quest_date"],
        "tier": tier_key,
        "questId": row["quest_id"],
        "title": row["title"],
        "metric": row["metric"],
        "target": int(row["target"] or 1),
        "progress": int(row["progress"] or 0),
        "completed": bool(row["completed"]),
        "claimed": bool(row["claimed"]),
        "claimedAt": row["claimed_at"],
        "coins": int(row["coins"] if row["coins"] is not None else tier_meta["coins"]),
        "xp": int(row["xp"] if row["xp"] is not None else tier_meta["xp"]),
    }


def compute_quest_progress_from_counters(
    metric: str, target: int, counters: Dict[str, int]
) -> int:
    safe_target = max(1, int(target or 1))
    focus_sessions = max(0, int(counters.get("focus_sessions") or 0))
    focus_seconds = max(0, int(counters.get("focus_seconds") or 0))
    tasks_completed = max(0, int(counters.get("tasks_completed") or 0))
    tasks_created = max(0, int(counters.get("tasks_created") or 0))

    if metric == "focus_sessions":
        raw_val = focus_sessions
    elif metric == "focus_15m":
        raw_val = 1 if focus_seconds >= 15 * 60 else 0
    elif metric == "tasks_created_today":
        raw_val = tasks_created
    elif metric == "tasks_completed":
        raw_val = tasks_completed
    elif metric == "combo_tasks_focus":
        raw_val = min(2, tasks_completed) + min(1, focus_sessions)
    else:
        raw_val = 0

    return min(safe_target, max(0, raw_val))


def ensure_user_profile_and_default_friends(
    conn: sqlite3.Connection,
    user_id: str,
    username: str,
    character_name: str = "Johnn",
    email: Optional[str] = None,
    level: Optional[int] = None,
    xp: Optional[int] = None,
    coins: Optional[int] = None,
    avatar_config: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    now_iso = datetime.now(timezone.utc).isoformat()
    norm_username = normalize_username(username)

    existing_by_id = conn.execute(
        "SELECT * FROM profiles WHERE id = ?", (user_id,)
    ).fetchone()

    collision = conn.execute(
        "SELECT id FROM profiles WHERE LOWER(username) = LOWER(?) AND id <> ?",
        (norm_username, user_id),
    ).fetchone()
    if collision:
        norm_username = f"{norm_username}_{user_id[:4]}"

    is_first_sync = existing_by_id is None

    if is_first_sync:
        final_xp = max(0, int(xp or 0))
        final_coins = max(0, int(coins or 0))
        final_level = calculate_level_info(final_xp)["level"]
        avatar_json = json.dumps(avatar_config or DEFAULT_AVATAR_CONFIG)

        conn.execute(
            """
            INSERT INTO profiles (
                id, email, username, character_name, level, xp, coins, avatar_config, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                user_id,
                email,
                norm_username,
                (character_name or "Johnn").strip() or "Johnn",
                final_level,
                final_xp,
                final_coins,
                avatar_json,
                now_iso,
                now_iso,
            ),
        )

        for adv in SEED_ADVENTURERS:
            if not adv.get("auto_friend") or adv["id"] == user_id:
                continue
            conn.execute(
                """
                INSERT OR IGNORE INTO friendships (
                    id, user_id, friend_id, status, created_at, updated_at
                ) VALUES (?, ?, ?, 'accepted', ?, ?)
                """,
                (str(uuid.uuid4()), user_id, adv["id"], now_iso, now_iso),
            )
    else:
        db_xp = int(existing_by_id["xp"] or 0)
        db_coins = int(existing_by_id["coins"] or 0)
        # Mantém o maior valor entre o banco e o cliente caso tenha havido progresso offline
        final_xp = max(db_xp, int(xp)) if xp is not None else db_xp
        final_coins = max(db_coins, int(coins)) if coins is not None else db_coins
        final_level = calculate_level_info(final_xp)["level"]
        avatar_json = (
            json.dumps(avatar_config)
            if avatar_config
            else existing_by_id["avatar_config"]
        )

        conn.execute(
            """
            UPDATE profiles
            SET email = COALESCE(?, email),
                username = ?,
                character_name = ?,
                level = ?,
                xp = ?,
                coins = ?,
                avatar_config = ?,
                updated_at = ?
            WHERE id = ?
            """,
            (
                email,
                norm_username,
                (character_name or existing_by_id["character_name"] or "Johnn").strip(),
                final_level,
                final_xp,
                final_coins,
                avatar_json,
                now_iso,
                user_id,
            ),
        )

    conn.commit()
    updated_row = conn.execute(
        "SELECT * FROM profiles WHERE id = ?", (user_id,)
    ).fetchone()
    return serialize_profile_row(updated_row)


def get_or_create_activity_counters(
    conn: sqlite3.Connection, user_id: str, date_key: str
) -> Dict[str, int]:
    now_iso = datetime.now(timezone.utc).isoformat()
    row = conn.execute(
        """
        SELECT * FROM daily_activity_counters
        WHERE user_id = ? AND activity_date = ?
        """,
        (user_id, date_key),
    ).fetchone()

    if not row:
        conn.execute(
            """
            INSERT INTO daily_activity_counters (
                user_id, activity_date, focus_sessions, focus_seconds, tasks_completed, tasks_created, updated_at
            ) VALUES (?, ?, 0, 0, 0, 0, ?)
            """,
            (user_id, date_key, now_iso),
        )
        conn.commit()
        return {
            "focus_sessions": 0,
            "focus_seconds": 0,
            "tasks_completed": 0,
            "tasks_created": 0,
        }

    return {
        "focus_sessions": int(row["focus_sessions"] or 0),
        "focus_seconds": int(row["focus_seconds"] or 0),
        "tasks_completed": int(row["tasks_completed"] or 0),
        "tasks_created": int(row["tasks_created"] or 0),
    }


def ensure_daily_quests_and_evaluate(
    conn: sqlite3.Connection, user_id: str, date_key: str
) -> List[Dict[str, Any]]:
    """
    Garante que o usuário possui as 3 Daily Quests do dia (`wood`, `iron`, `gold`)
    sorteadas aleatoriamente no banco de dados e recalcula automaticamente
    o progresso e conclusão (`completed`) de acordo com os requisitos cumpridos.
    """
    now_iso = datetime.now(timezone.utc).isoformat()
    counters = get_or_create_activity_counters(conn, user_id, date_key)

    existing_rows = conn.execute(
        """
        SELECT * FROM daily_quests
        WHERE user_id = ? AND quest_date = ?
        """,
        (user_id, date_key),
    ).fetchall()
    existing_by_tier = {r["tier"]: r for r in existing_rows}

    # Verifica se o usuário já teve missões em dias anteriores (para evitar repetir a mesma missão seguida)
    prev_rows = conn.execute(
        """
        SELECT tier, quest_id FROM daily_quests
        WHERE user_id = ? AND quest_date < ?
        ORDER BY quest_date DESC
        LIMIT 3
        """,
        (user_id, date_key),
    ).fetchall()
    prev_quest_by_tier = {r["tier"]: r["quest_id"] for r in prev_rows}
    has_ever_had_quests = len(prev_rows) > 0 or len(existing_rows) > 0

    for tier_key in ("wood", "iron", "gold"):
        if tier_key in existing_by_tier:
            continue

        tier_cfg = CHEST_TIERS_CONFIG[tier_key]
        pool = DAILY_QUEST_POOLS[tier_key]
        if not has_ever_had_quests:
            chosen = pool[0]
        else:
            prev_id = prev_quest_by_tier.get(tier_key)
            candidates = [q for q in pool if q["id"] != prev_id] or pool
            chosen = random.choice(candidates)

        progress_val = compute_quest_progress_from_counters(
            chosen["metric"], chosen["target"], counters
        )
        is_completed = 1 if progress_val >= chosen["target"] else 0

        conn.execute(
            """
            INSERT INTO daily_quests (
                id, user_id, quest_date, tier, quest_id, title, metric, target,
                progress, completed, claimed, claimed_at, coins, xp, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, NULL, ?, ?, ?, ?)
            """,
            (
                str(uuid.uuid4()),
                user_id,
                date_key,
                tier_key,
                chosen["id"],
                chosen["title"],
                chosen["metric"],
                chosen["target"],
                progress_val,
                is_completed,
                tier_cfg["coins"],
                tier_cfg["xp"],
                now_iso,
                now_iso,
            ),
        )

    # Atualiza automaticamente o progresso e status completed de cada missão do dia
    rows = conn.execute(
        """
        SELECT * FROM daily_quests
        WHERE user_id = ? AND quest_date = ?
        """,
        (user_id, date_key),
    ).fetchall()

    for row in rows:
        target_val = max(1, int(row["target"] or 1))
        if row["claimed"]:
            new_progress = target_val
            new_completed = 1
        else:
            new_progress = compute_quest_progress_from_counters(
                row["metric"], target_val, counters
            )
            # Se já foi concluída automaticamente hoje, permanece concluída
            new_completed = 1 if (row["completed"] or new_progress >= target_val) else 0
            if new_completed and new_progress < target_val:
                new_progress = target_val

        if new_progress != int(row["progress"] or 0) or new_completed != int(
            row["completed"] or 0
        ):
            conn.execute(
                """
                UPDATE daily_quests
                SET progress = ?, completed = ?, updated_at = ?
                WHERE id = ?
                """,
                (new_progress, new_completed, now_iso, row["id"]),
            )

    conn.commit()

    tier_order = {"wood": 1, "iron": 2, "gold": 3}
    final_rows = conn.execute(
        """
        SELECT * FROM daily_quests
        WHERE user_id = ? AND quest_date = ?
        """,
        (user_id, date_key),
    ).fetchall()
    sorted_rows = sorted(final_rows, key=lambda r: tier_order.get(r["tier"], 99))
    return [serialize_daily_quest_row(r) for r in sorted_rows]


async def sync_to_supabase_if_configured(
    endpoint: str, method: str, payload: Optional[Any] = None
) -> None:
    if not SUPABASE_URL or not SUPABASE_SECRET_KEY:
        return
    headers = {
        "apikey": SUPABASE_SECRET_KEY,
        "Authorization": f"Bearer {SUPABASE_SECRET_KEY}",
        "Content-Type": "application/json",
        "Prefer": "resolution=merge-duplicates,return=minimal",
    }
    url = f"{SUPABASE_URL}/rest/v1/{endpoint.lstrip('/')}"
    try:
        async with httpx.AsyncClient(timeout=8.0) as client:
            if method.upper() == "POST":
                await client.post(url, headers=headers, json=payload)
            elif method.upper() == "PATCH":
                await client.patch(url, headers=headers, json=payload)
            elif method.upper() == "DELETE":
                await client.delete(url, headers=headers)
    except Exception:
        pass


async def sync_daily_quests_list_to_supabase(quests: List[Dict[str, Any]]) -> None:
    if not SUPABASE_URL or not SUPABASE_SECRET_KEY or not quests:
        return
    rows_payload = [
        {
            "id": q["id"],
            "user_id": q["userId"],
            "quest_date": q["dateKey"],
            "tier": q["tier"],
            "quest_id": q["questId"],
            "title": q["title"],
            "metric": q["metric"],
            "target": q["target"],
            "progress": q["progress"],
            "completed": q["completed"],
            "claimed": q["claimed"],
            "claimed_at": q.get("claimedAt"),
            "coins": q["coins"],
            "xp": q["xp"],
        }
        for q in quests
    ]
    await sync_to_supabase_if_configured(
        "daily_quests?on_conflict=user_id,quest_date,tier",
        "POST",
        rows_payload,
    )


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
        "database": str(DB_PATH.name),
    }


@app.post("/profiles/sync")
async def sync_profile(payload: ProfileSyncRequest):
    """
    Cria ou atualiza o perfil do usuário no banco de dados e retorna o estado consolidado
    de XP, nível, moedas e perfil.
    """
    with get_db_connection() as conn:
        profile = ensure_user_profile_and_default_friends(
            conn=conn,
            user_id=payload.user_id,
            username=payload.username,
            character_name=payload.character_name,
            email=payload.email,
            level=payload.level,
            xp=payload.xp,
            coins=payload.coins,
            avatar_config=payload.avatar_config,
        )

    await sync_to_supabase_if_configured(
        "profiles",
        "POST",
        {
            "id": profile["id"],
            "email": profile["email"],
            "username": profile["rawUsername"],
            "character_name": profile["characterName"],
            "level": profile["level"],
            "xp": profile["xp"],
            "coins": profile["coins"],
            "avatar_config": profile["avatarConfig"],
        },
    )

    return {
        "profile": profile,
        "levelInfo": calculate_level_info(profile["xp"]),
    }


@app.get("/progression")
async def get_user_progression_and_daily_quests(
    user_id: str = Query(..., description="ID do usuário logado"),
    date_key: Optional[str] = Query(default=None, description="Data YYYY-MM-DD"),
    focus_sessions: Optional[int] = Query(default=None),
    focus_seconds: Optional[int] = Query(default=None),
    tasks_completed: Optional[int] = Query(default=None),
    tasks_created: Optional[int] = Query(default=None),
):
    """
    Retorna o XP, Nível, Moedas e as 3 Daily Quests do dia (`wood`, `iron`, `gold`)
    puxados do banco de dados, avaliando automaticamente os requisitos concluídos.
    """
    target_date = (date_key or "").strip() or get_today_date_key()
    now_iso = datetime.now(timezone.utc).isoformat()

    with get_db_connection() as conn:
        profile_row = conn.execute(
            "SELECT * FROM profiles WHERE id = ?", (user_id,)
        ).fetchone()
        if not profile_row:
            profile = ensure_user_profile_and_default_friends(
                conn=conn,
                user_id=user_id,
                username=user_id,
                character_name="Johnn",
            )
        else:
            profile = serialize_profile_row(profile_row)

        counters = get_or_create_activity_counters(conn, user_id, target_date)

        # Se o app enviou o snapshot das atividades realizadas no dia, sincroniza o maior valor
        updated_focus_sessions = max(
            counters["focus_sessions"], int(focus_sessions or 0)
        )
        updated_focus_seconds = max(
            counters["focus_seconds"], int(focus_seconds or 0)
        )
        updated_tasks_completed = max(
            counters["tasks_completed"], int(tasks_completed or 0)
        )
        updated_tasks_created = max(
            counters["tasks_created"], int(tasks_created or 0)
        )

        if (
            updated_focus_sessions != counters["focus_sessions"]
            or updated_focus_seconds != counters["focus_seconds"]
            or updated_tasks_completed != counters["tasks_completed"]
            or updated_tasks_created != counters["tasks_created"]
        ):
            conn.execute(
                """
                UPDATE daily_activity_counters
                SET focus_sessions = ?,
                    focus_seconds = ?,
                    tasks_completed = ?,
                    tasks_created = ?,
                    updated_at = ?
                WHERE user_id = ? AND activity_date = ?
                """,
                (
                    updated_focus_sessions,
                    updated_focus_seconds,
                    updated_tasks_completed,
                    updated_tasks_created,
                    now_iso,
                    user_id,
                    target_date,
                ),
            )
            conn.commit()

        daily_quests = ensure_daily_quests_and_evaluate(conn, user_id, target_date)
        final_counters = get_or_create_activity_counters(conn, user_id, target_date)

    await sync_daily_quests_list_to_supabase(daily_quests)

    return {
        "profile": profile,
        "levelInfo": calculate_level_info(profile["xp"]),
        "rewards": {
            "xp": profile["xp"],
            "coins": profile["coins"],
            "level": profile["level"],
        },
        "dailyQuests": daily_quests,
        "activityCounters": final_counters,
    }


@app.post("/daily-quests/progress")
async def record_daily_quest_activity_progress(payload: ActivityProgressRequest):
    """
    Atualiza automaticamente o progresso das Daily Quests no banco quando o usuário
    conclui uma sessão de foco, cria uma tarefa ou conclui uma tarefa.
    As missões são marcadas como `completed = true` automaticamente ao atingir `target`.
    """
    user_id = (payload.user_id or "").strip()
    if not user_id:
        raise HTTPException(status_code=400, detail="user_id é obrigatório.")

    target_date = (payload.date_key or "").strip() or get_today_date_key()
    now_iso = datetime.now(timezone.utc).isoformat()

    with get_db_connection() as conn:
        profile_row = conn.execute(
            "SELECT * FROM profiles WHERE id = ?", (user_id,)
        ).fetchone()
        if not profile_row:
            ensure_user_profile_and_default_friends(
                conn=conn,
                user_id=user_id,
                username=user_id,
                character_name="Johnn",
            )

        before_quests = ensure_daily_quests_and_evaluate(conn, user_id, target_date)
        was_completed_by_tier = {q["tier"]: q["completed"] for q in before_quests}

        counters = get_or_create_activity_counters(conn, user_id, target_date)

        next_focus_sessions = counters["focus_sessions"] + int(
            payload.focus_sessions_delta or 0
        )
        next_focus_seconds = counters["focus_seconds"] + int(
            payload.focus_seconds_delta or 0
        )
        next_tasks_completed = counters["tasks_completed"] + int(
            payload.tasks_completed_delta or 0
        )
        next_tasks_created = counters["tasks_created"] + int(
            payload.tasks_created_delta or 0
        )

        if payload.focus_sessions_total is not None:
            next_focus_sessions = max(
                next_focus_sessions, int(payload.focus_sessions_total)
            )
        if payload.focus_seconds_total is not None:
            next_focus_seconds = max(
                next_focus_seconds, int(payload.focus_seconds_total)
            )
        if payload.tasks_completed_total is not None:
            # Permite sincronizar caso o usuário desmarque uma tarefa não resgatada
            next_tasks_completed = max(0, int(payload.tasks_completed_total))
        if payload.tasks_created_total is not None:
            next_tasks_created = max(
                next_tasks_created, int(payload.tasks_created_total)
            )

        conn.execute(
            """
            UPDATE daily_activity_counters
            SET focus_sessions = ?,
                focus_seconds = ?,
                tasks_completed = ?,
                tasks_created = ?,
                updated_at = ?
            WHERE user_id = ? AND activity_date = ?
            """,
            (
                max(0, next_focus_sessions),
                max(0, next_focus_seconds),
                max(0, next_tasks_completed),
                max(0, next_tasks_created),
                now_iso,
                user_id,
                target_date,
            ),
        )
        conn.commit()

        after_quests = ensure_daily_quests_and_evaluate(conn, user_id, target_date)
        newly_completed = [
            q
            for q in after_quests
            if q["completed"] and not was_completed_by_tier.get(q["tier"], False)
        ]
        updated_counters = get_or_create_activity_counters(conn, user_id, target_date)

    await sync_to_supabase_if_configured(
        "daily_activity_counters?on_conflict=user_id,activity_date",
        "POST",
        {
            "user_id": user_id,
            "activity_date": target_date,
            **updated_counters,
        },
    )
    await sync_daily_quests_list_to_supabase(after_quests)

    return {
        "dailyQuests": after_quests,
        "newlyCompleted": newly_completed,
        "activityCounters": updated_counters,
    }


@app.post("/daily-quests/claim")
async def claim_daily_quest_reward(payload: ClaimDailyQuestRequest):
    """
    Resgata a recompensa (moedas + XP) de uma Daily Quest no banco de dados.
    A missão NÃO pode ser concluída manualmente por este endpoint: ela precisa
    já estar com `completed = 1` (requisitos cumpridos automaticamente) e `claimed = 0`.
    """
    user_id = (payload.user_id or "").strip()
    tier_key = (payload.tier or "").strip().lower()
    target_date = (payload.date_key or "").strip() or get_today_date_key()
    now_iso = datetime.now(timezone.utc).isoformat()

    if not user_id or tier_key not in CHEST_TIERS_CONFIG:
        raise HTTPException(
            status_code=400, detail="Parâmetros user_id e tier válidos são obrigatórios."
        )

    with get_db_connection() as conn:
        profile_row = conn.execute(
            "SELECT * FROM profiles WHERE id = ?", (user_id,)
        ).fetchone()
        if not profile_row:
            ensure_user_profile_and_default_friends(
                conn=conn,
                user_id=user_id,
                username=user_id,
                character_name="Johnn",
            )

        ensure_daily_quests_and_evaluate(conn, user_id, target_date)

        quest_row = conn.execute(
            """
            SELECT * FROM daily_quests
            WHERE user_id = ? AND quest_date = ? AND tier = ?
            """,
            (user_id, target_date, tier_key),
        ).fetchone()

        if not quest_row:
            raise HTTPException(
                status_code=404, detail="Missão diária não encontrada para hoje."
            )

        if bool(quest_row["claimed"]):
            raise HTTPException(
                status_code=409,
                detail="Você já resgatou a recompensa desta missão hoje.",
            )

        if not bool(quest_row["completed"]) or int(quest_row["progress"] or 0) < int(
            quest_row["target"] or 1
        ):
            raise HTTPException(
                status_code=400,
                detail="Esta missão ainda não foi concluída. Cumpra os requisitos para resgatar a recompensa!",
            )

        tier_meta = CHEST_TIERS_CONFIG[tier_key]
        reward_coins = int(quest_row["coins"] or tier_meta["coins"])
        reward_xp = int(quest_row["xp"] or tier_meta["xp"])

        conn.execute(
            """
            UPDATE daily_quests
            SET claimed = 1,
                claimed_at = ?,
                updated_at = ?
            WHERE id = ?
            """,
            (now_iso, now_iso, quest_row["id"]),
        )

        prof_now = conn.execute(
            "SELECT xp, coins FROM profiles WHERE id = ?", (user_id,)
        ).fetchone()
        next_xp = int(prof_now["xp"] or 0) + reward_xp
        next_coins = int(prof_now["coins"] or 0) + reward_coins
        next_level_info = calculate_level_info(next_xp)

        conn.execute(
            """
            UPDATE profiles
            SET xp = ?,
                coins = ?,
                level = ?,
                updated_at = ?
            WHERE id = ?
            """,
            (next_xp, next_coins, next_level_info["level"], now_iso, user_id),
        )
        conn.commit()

        updated_profile_row = conn.execute(
            "SELECT * FROM profiles WHERE id = ?", (user_id,)
        ).fetchone()
        updated_profile = serialize_profile_row(updated_profile_row)
        updated_quests = ensure_daily_quests_and_evaluate(conn, user_id, target_date)

    reward_granted = {
        "tier": tier_key,
        "label": tier_meta["label"],
        "coins": reward_coins,
        "xp": reward_xp,
        "title": quest_row["title"],
    }

    await sync_to_supabase_if_configured(
        "profiles",
        "POST",
        {
            "id": updated_profile["id"],
            "email": updated_profile["email"],
            "username": updated_profile["rawUsername"],
            "character_name": updated_profile["characterName"],
            "level": updated_profile["level"],
            "xp": updated_profile["xp"],
            "coins": updated_profile["coins"],
            "avatar_config": updated_profile["avatarConfig"],
        },
    )
    await sync_daily_quests_list_to_supabase(updated_quests)

    return {
        "message": f"{tier_meta['label']} resgatado! +{reward_coins} moedas e +{reward_xp} XP!",
        "rewardGranted": reward_granted,
        "profile": updated_profile,
        "levelInfo": next_level_info,
        "rewards": {
            "xp": updated_profile["xp"],
            "coins": updated_profile["coins"],
            "level": updated_profile["level"],
        },
        "dailyQuests": updated_quests,
    }


@app.get("/friends")
async def list_user_friends(
    user_id: str = Query(..., description="ID do usuário logado"),
    q: Optional[str] = Query(default="", description="Filtro por nome ou @username"),
):
    search_term = (q or "").strip().lower().lstrip("@")

    with get_db_connection() as conn:
        user_exists = conn.execute(
            "SELECT id FROM profiles WHERE id = ?", (user_id,)
        ).fetchone()
        if not user_exists:
            ensure_user_profile_and_default_friends(
                conn=conn,
                user_id=user_id,
                username=user_id,
                character_name="Johnn",
            )

        rows = conn.execute(
            """
            SELECT
                p.*,
                f.id AS friendship_id,
                f.status AS friendship_status,
                f.created_at AS friendship_created_at
            FROM friendships f
            JOIN profiles p
                ON p.id = CASE
                    WHEN f.user_id = ? THEN f.friend_id
                    ELSE f.user_id
                END
            WHERE (f.user_id = ? OR f.friend_id = ?)
              AND f.status = 'accepted'
            ORDER BY LOWER(p.character_name) ASC
            """,
            (user_id, user_id, user_id),
        ).fetchall()

        all_friends = []
        for row in rows:
            friend_obj = serialize_profile_row(row)
            friend_obj["friendshipId"] = row["friendship_id"]
            friend_obj["status"] = row["friendship_status"]
            friend_obj["since"] = row["friendship_created_at"]
            all_friends.append(friend_obj)

    if search_term:
        filtered = [
            f
            for f in all_friends
            if search_term in f["characterName"].lower()
            or search_term in f["username"].lower()
            or search_term in f["rawUsername"].lower()
        ]
    else:
        filtered = all_friends

    return {
        "total": len(all_friends),
        "count": len(filtered),
        "friends": filtered,
    }


@app.get("/users/search")
async def search_users_for_friendship(
    user_id: str = Query(..., description="ID do usuário atual"),
    q: Optional[str] = Query(
        default="", description="Termo de busca por nome ou @username"
    ),
):
    search_term = (q or "").strip().lower().lstrip("@")

    with get_db_connection() as conn:
        friend_rows = conn.execute(
            """
            SELECT
                CASE WHEN user_id = ? THEN friend_id ELSE user_id END AS other_id
            FROM friendships
            WHERE (user_id = ? OR friend_id = ?)
              AND status = 'accepted'
            """,
            (user_id, user_id, user_id),
        ).fetchall()
        already_friend_ids = {r["other_id"] for r in friend_rows}

        if search_term:
            like_pattern = f"%{search_term}%"
            rows = conn.execute(
                """
                SELECT * FROM profiles
                WHERE id <> ?
                  AND (LOWER(username) LIKE ? OR LOWER(character_name) LIKE ?)
                ORDER BY LOWER(character_name) ASC
                LIMIT 25
                """,
                (user_id, like_pattern, like_pattern),
            ).fetchall()
        else:
            rows = conn.execute(
                """
                SELECT * FROM profiles
                WHERE id <> ?
                ORDER BY LOWER(character_name) ASC
                LIMIT 25
                """,
                (user_id,),
            ).fetchall()

        users = []
        for row in rows:
            item = serialize_profile_row(row)
            item["isFriend"] = item["id"] in already_friend_ids
            users.append(item)

    return {"users": users}


@app.post("/friends")
async def create_friendship(payload: AddFriendRequest):
    now_iso = datetime.now(timezone.utc).isoformat()
    user_id = (payload.user_id or "").strip()
    if not user_id:
        raise HTTPException(status_code=400, detail="user_id é obrigatório.")

    with get_db_connection() as conn:
        user_row = conn.execute(
            "SELECT * FROM profiles WHERE id = ?", (user_id,)
        ).fetchone()
        if not user_row:
            ensure_user_profile_and_default_friends(
                conn=conn,
                user_id=user_id,
                username=user_id,
                character_name="Johnn",
            )

        target_row = None
        if payload.friend_id:
            target_row = conn.execute(
                "SELECT * FROM profiles WHERE id = ?", (payload.friend_id.strip(),)
            ).fetchone()
        elif payload.friend_username:
            clean_uname = normalize_username(payload.friend_username)
            target_row = conn.execute(
                """
                SELECT * FROM profiles
                WHERE LOWER(username) = LOWER(?)
                   OR LOWER(character_name) = LOWER(?)
                """,
                (clean_uname, payload.friend_username.strip().lstrip("@")),
            ).fetchone()

            if not target_row and clean_uname:
                new_friend_id = f"user-{clean_uname}"
                display_char = (
                    payload.friend_username.strip().lstrip("@").capitalize()
                    or clean_uname.capitalize()
                )
                conn.execute(
                    """
                    INSERT INTO profiles (
                        id, email, username, character_name, level, xp, coins, avatar_config, created_at, updated_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        new_friend_id,
                        f"{clean_uname}@everquest.app",
                        clean_uname,
                        display_char,
                        1,
                        15,
                        10,
                        json.dumps(DEFAULT_AVATAR_CONFIG),
                        now_iso,
                        now_iso,
                    ),
                )
                conn.commit()
                target_row = conn.execute(
                    "SELECT * FROM profiles WHERE id = ?", (new_friend_id,)
                ).fetchone()

        if not target_row:
            raise HTTPException(
                status_code=404,
                detail="Usuário não encontrado para adicionar como amigo.",
            )

        friend_id = target_row["id"]
        if friend_id == user_id:
            raise HTTPException(
                status_code=400,
                detail="Você não pode adicionar a si mesmo como amigo.",
            )

        existing_friendship = conn.execute(
            """
            SELECT * FROM friendships
            WHERE (user_id = ? AND friend_id = ?)
               OR (user_id = ? AND friend_id = ?)
            """,
            (user_id, friend_id, friend_id, user_id),
        ).fetchone()

        if existing_friendship:
            if existing_friendship["status"] != "accepted":
                conn.execute(
                    "UPDATE friendships SET status = 'accepted', updated_at = ? WHERE id = ?",
                    (now_iso, existing_friendship["id"]),
                )
                conn.commit()
            else:
                raise HTTPException(
                    status_code=409,
                    detail=f"{target_row['character_name']} (@{target_row['username']}) já está na sua lista de amigos.",
                )
            friendship_id = existing_friendship["id"]
        else:
            friendship_id = str(uuid.uuid4())
            conn.execute(
                """
                INSERT INTO friendships (id, user_id, friend_id, status, created_at, updated_at)
                VALUES (?, ?, ?, 'accepted', ?, ?)
                """,
                (friendship_id, user_id, friend_id, now_iso, now_iso),
            )
            conn.commit()

        friend_data = serialize_profile_row(target_row)
        friend_data["friendshipId"] = friendship_id
        friend_data["status"] = "accepted"

        total_row = conn.execute(
            """
            SELECT COUNT(*) AS total
            FROM friendships
            WHERE (user_id = ? OR friend_id = ?) AND status = 'accepted'
            """,
            (user_id, user_id),
        ).fetchone()
        total_friends = int(total_row["total"] if total_row else 0)

    await sync_to_supabase_if_configured(
        "friendships",
        "POST",
        {
            "id": friendship_id,
            "user_id": user_id,
            "friend_id": friend_id,
            "status": "accepted",
        },
    )

    return {
        "message": f"Agora você e {friend_data['characterName']} são amigos!",
        "friend": friend_data,
        "total": total_friends,
    }


@app.delete("/friends/{friend_id}")
async def remove_friendship(
    friend_id: str,
    user_id: str = Query(..., description="ID do usuário logado"),
):
    with get_db_connection() as conn:
        cur = conn.execute(
            """
            DELETE FROM friendships
            WHERE (user_id = ? AND friend_id = ?)
               OR (user_id = ? AND friend_id = ?)
            """,
            (user_id, friend_id, friend_id, user_id),
        )
        conn.commit()

        if cur.rowcount == 0:
            raise HTTPException(
                status_code=404, detail="Relacionamento de amizade não encontrado."
            )

        total_row = conn.execute(
            """
            SELECT COUNT(*) AS total
            FROM friendships
            WHERE (user_id = ? OR friend_id = ?) AND status = 'accepted'
            """,
            (user_id, user_id),
        ).fetchone()
        total_friends = int(total_row["total"] if total_row else 0)

    await sync_to_supabase_if_configured(
        f"friendships?or=(and(user_id.eq.{user_id},friend_id.eq.{friend_id}),and(user_id.eq.{friend_id},friend_id.eq.{user_id}))",
        "DELETE",
    )

    return {
        "message": "Amizade removida com sucesso.",
        "removedFriendId": friend_id,
        "total": total_friends,
    }


@app.post("/auth/register")
async def register_user(payload: RegisterRequest):
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

    user_obj = login_data.get("user") or data
    user_id = str(
        user_obj.get("id") or f"user-{normalize_username(payload.username)}"
    )
    with get_db_connection() as conn:
        ensure_user_profile_and_default_friends(
            conn=conn,
            user_id=user_id,
            username=payload.username,
            character_name=payload.username,
            email=payload.email,
        )

    return {
        "message": "Conta criada e autenticada com sucesso!",
        "access_token": login_data.get("access_token"),
        "refresh_token": login_data.get("refresh_token"),
        "user": user_obj,
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

    user_obj = data.get("user") or {}
    user_id = str(user_obj.get("id") or payload.email.split("@")[0])
    uname = (
        (user_obj.get("user_metadata") or {}).get("username")
        or payload.email.split("@")[0]
    )
    with get_db_connection() as conn:
        ensure_user_profile_and_default_friends(
            conn=conn,
            user_id=user_id,
            username=uname,
            character_name=uname,
            email=payload.email,
        )

    return {
        "access_token": data.get("access_token"),
        "refresh_token": data.get("refresh_token"),
        "user": user_obj,
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
