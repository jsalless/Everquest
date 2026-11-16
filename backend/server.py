import json
import os
import random
import sqlite3
import urllib.parse
import uuid
from datetime import datetime, timezone
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from typing import Any, Dict, List, Optional

DB_PATH = Path(__file__).resolve().parent / "everquest.db"
XP_PER_LEVEL = 100

CHEST_TIERS_CONFIG: Dict[str, Dict[str, Any]] = {
    "wood": {"id": "wood", "name": "Wood", "label": "Baú Wood", "coins": 3, "xp": 5},
    "iron": {"id": "iron", "name": "Iron", "label": "Baú Iron", "coins": 5, "xp": 10},
    "gold": {"id": "gold", "name": "Gold", "label": "Baú Gold", "coins": 10, "xp": 20},
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


def init_database() -> None:
    now_iso = datetime.now(timezone.utc).isoformat()
    today_key = get_today_date_key()
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
            """
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

        # Garante que o usuário padrão já esteja criado com suas amizades e daily quests no banco
        ensure_user_profile_and_default_friends(
            conn=conn,
            user_id="guest-jsalless",
            username="jsalless",
            character_name="Johnn",
            email="jsalless@everquest.app",
        )
        ensure_daily_quests_and_evaluate(conn, "guest-jsalless", today_key)


class EverquestAPIHandler(BaseHTTPRequestHandler):
    def log_message(self, format: str, *args: Any) -> None:
        return

    def _send_json(self, status_code: int, payload: Dict[str, Any]) -> None:
        body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status_code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header(
            "Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS"
        )
        self.send_header(
            "Access-Control-Allow-Headers", "Content-Type, Authorization"
        )
        self.end_headers()
        self.wfile.write(body)

    def _read_json_body(self) -> Dict[str, Any]:
        length = int(self.headers.get("Content-Length") or 0)
        if length <= 0:
            return {}
        raw = self.rfile.read(length).decode("utf-8")
        return json.loads(raw) if raw else {}

    def do_OPTIONS(self) -> None:
        self._send_json(200, {"ok": True})

    def do_GET(self) -> None:
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path.rstrip("/") or "/"
        qs = urllib.parse.parse_qs(parsed.query)

        if path == "/health":
            self._send_json(
                200,
                {
                    "status": "ok",
                    "service": "Everquest API",
                    "database": str(DB_PATH),
                },
            )
            return

        if path == "/progression":
            user_id = (qs.get("user_id", ["guest-jsalless"])[0] or "guest-jsalless").strip()
            target_date = (qs.get("date_key", [get_today_date_key()])[0] or get_today_date_key()).strip()
            focus_sessions = int(qs.get("focus_sessions", [0])[0] or 0)
            focus_seconds = int(qs.get("focus_seconds", [0])[0] or 0)
            tasks_completed = int(qs.get("tasks_completed", [0])[0] or 0)
            tasks_created = int(qs.get("tasks_created", [0])[0] or 0)
            now_iso = datetime.now(timezone.utc).isoformat()

            with get_db_connection() as conn:
                prof_row = conn.execute(
                    "SELECT * FROM profiles WHERE id = ?", (user_id,)
                ).fetchone()
                if not prof_row:
                    profile = ensure_user_profile_and_default_friends(
                        conn=conn,
                        user_id=user_id,
                        username=user_id,
                        character_name="Johnn",
                    )
                else:
                    profile = serialize_profile_row(prof_row)

                counters = get_or_create_activity_counters(conn, user_id, target_date)
                next_fs = max(counters["focus_sessions"], focus_sessions)
                next_fsec = max(counters["focus_seconds"], focus_seconds)
                next_tc = max(counters["tasks_completed"], tasks_completed)
                next_tcr = max(counters["tasks_created"], tasks_created)

                if (
                    next_fs != counters["focus_sessions"]
                    or next_fsec != counters["focus_seconds"]
                    or next_tc != counters["tasks_completed"]
                    or next_tcr != counters["tasks_created"]
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
                        (next_fs, next_fsec, next_tc, next_tcr, now_iso, user_id, target_date),
                    )
                    conn.commit()

                daily_quests = ensure_daily_quests_and_evaluate(conn, user_id, target_date)
                final_counters = get_or_create_activity_counters(conn, user_id, target_date)

            self._send_json(
                200,
                {
                    "profile": profile,
                    "levelInfo": calculate_level_info(profile["xp"]),
                    "rewards": {
                        "xp": profile["xp"],
                        "coins": profile["coins"],
                        "level": profile["level"],
                    },
                    "dailyQuests": daily_quests,
                    "activityCounters": final_counters,
                },
            )
            return

        if path == "/friends":
            user_id = (qs.get("user_id", ["guest-jsalless"])[0] or "guest-jsalless").strip()
            search_term = (qs.get("q", [""])[0] or "").strip().lower().lstrip("@")

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

            self._send_json(
                200,
                {
                    "total": len(all_friends),
                    "count": len(filtered),
                    "friends": filtered,
                },
            )
            return

        if path == "/users/search":
            user_id = (qs.get("user_id", ["guest-jsalless"])[0] or "guest-jsalless").strip()
            search_term = (qs.get("q", [""])[0] or "").strip().lower().lstrip("@")

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

            self._send_json(200, {"users": users})
            return

        self._send_json(404, {"detail": "Rota não encontrada"})

    def do_POST(self) -> None:
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path.rstrip("/") or "/"
        payload = self._read_json_body()
        now_iso = datetime.now(timezone.utc).isoformat()

        if path == "/profiles/sync":
            user_id = (payload.get("user_id") or "guest-jsalless").strip()
            username = payload.get("username") or "jsalless"
            character_name = payload.get("character_name") or "Johnn"
            with get_db_connection() as conn:
                profile = ensure_user_profile_and_default_friends(
                    conn=conn,
                    user_id=user_id,
                    username=username,
                    character_name=character_name,
                    email=payload.get("email"),
                    level=payload.get("level"),
                    xp=payload.get("xp"),
                    coins=payload.get("coins"),
                    avatar_config=payload.get("avatar_config"),
                )
            self._send_json(
                200,
                {
                    "profile": profile,
                    "levelInfo": calculate_level_info(profile["xp"]),
                },
            )
            return

        if path == "/daily-quests/progress":
            user_id = (payload.get("user_id") or "guest-jsalless").strip()
            target_date = (payload.get("date_key") or get_today_date_key()).strip()

            with get_db_connection() as conn:
                prof_row = conn.execute(
                    "SELECT * FROM profiles WHERE id = ?", (user_id,)
                ).fetchone()
                if not prof_row:
                    ensure_user_profile_and_default_friends(
                        conn=conn,
                        user_id=user_id,
                        username=user_id,
                        character_name="Johnn",
                    )

                before_quests = ensure_daily_quests_and_evaluate(conn, user_id, target_date)
                was_completed_by_tier = {q["tier"]: q["completed"] for q in before_quests}
                counters = get_or_create_activity_counters(conn, user_id, target_date)

                next_fs = counters["focus_sessions"] + int(payload.get("focus_sessions_delta") or 0)
                next_fsec = counters["focus_seconds"] + int(payload.get("focus_seconds_delta") or 0)
                next_tc = counters["tasks_completed"] + int(payload.get("tasks_completed_delta") or 0)
                next_tcr = counters["tasks_created"] + int(payload.get("tasks_created_delta") or 0)

                if payload.get("focus_sessions_total") is not None:
                    next_fs = max(next_fs, int(payload["focus_sessions_total"]))
                if payload.get("focus_seconds_total") is not None:
                    next_fsec = max(next_fsec, int(payload["focus_seconds_total"]))
                if payload.get("tasks_completed_total") is not None:
                    next_tc = max(0, int(payload["tasks_completed_total"]))
                if payload.get("tasks_created_total") is not None:
                    next_tcr = max(next_tcr, int(payload["tasks_created_total"]))

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
                        max(0, next_fs),
                        max(0, next_fsec),
                        max(0, next_tc),
                        max(0, next_tcr),
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

            self._send_json(
                200,
                {
                    "dailyQuests": after_quests,
                    "newlyCompleted": newly_completed,
                    "activityCounters": updated_counters,
                },
            )
            return

        if path == "/daily-quests/claim":
            user_id = (payload.get("user_id") or "guest-jsalless").strip()
            tier_key = (payload.get("tier") or "").strip().lower()
            target_date = (payload.get("date_key") or get_today_date_key()).strip()

            if tier_key not in CHEST_TIERS_CONFIG:
                self._send_json(400, {"detail": "Tier de baú inválido."})
                return

            with get_db_connection() as conn:
                ensure_daily_quests_and_evaluate(conn, user_id, target_date)
                quest_row = conn.execute(
                    """
                    SELECT * FROM daily_quests
                    WHERE user_id = ? AND quest_date = ? AND tier = ?
                    """,
                    (user_id, target_date, tier_key),
                ).fetchone()

                if not quest_row:
                    self._send_json(404, {"detail": "Missão diária não encontrada."})
                    return

                if bool(quest_row["claimed"]):
                    self._send_json(409, {"detail": "Recompensa já resgatada hoje."})
                    return

                if not bool(quest_row["completed"]) or int(quest_row["progress"] or 0) < int(
                    quest_row["target"] or 1
                ):
                    self._send_json(
                        400,
                        {
                            "detail": "Esta missão ainda não foi concluída. Cumpra os requisitos para resgatar a recompensa!"
                        },
                    )
                    return

                tier_meta = CHEST_TIERS_CONFIG[tier_key]
                reward_coins = int(quest_row["coins"] or tier_meta["coins"])
                reward_xp = int(quest_row["xp"] or tier_meta["xp"])

                conn.execute(
                    """
                    UPDATE daily_quests
                    SET claimed = 1, claimed_at = ?, updated_at = ?
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
                    SET xp = ?, coins = ?, level = ?, updated_at = ?
                    WHERE id = ?
                    """,
                    (next_xp, next_coins, next_level_info["level"], now_iso, user_id),
                )
                conn.commit()

                updated_prof_row = conn.execute(
                    "SELECT * FROM profiles WHERE id = ?", (user_id,)
                ).fetchone()
                updated_profile = serialize_profile_row(updated_prof_row)
                updated_quests = ensure_daily_quests_and_evaluate(conn, user_id, target_date)

            reward_granted = {
                "tier": tier_key,
                "label": tier_meta["label"],
                "coins": reward_coins,
                "xp": reward_xp,
                "title": quest_row["title"],
            }
            self._send_json(
                200,
                {
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
                },
            )
            return

        if path == "/friends":
            user_id = (payload.get("user_id") or "guest-jsalless").strip()
            friend_id_in = payload.get("friend_id")
            friend_uname_in = payload.get("friend_username")

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
                if friend_id_in:
                    target_row = conn.execute(
                        "SELECT * FROM profiles WHERE id = ?", (str(friend_id_in).strip(),)
                    ).fetchone()
                elif friend_uname_in:
                    clean_uname = normalize_username(str(friend_uname_in))
                    target_row = conn.execute(
                        """
                        SELECT * FROM profiles
                        WHERE LOWER(username) = LOWER(?)
                           OR LOWER(character_name) = LOWER(?)
                        """,
                        (clean_uname, str(friend_uname_in).strip().lstrip("@")),
                    ).fetchone()

                    if not target_row and clean_uname:
                        new_friend_id = f"user-{clean_uname}"
                        display_char = (
                            str(friend_uname_in).strip().lstrip("@").capitalize()
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
                    self._send_json(404, {"detail": "Usuário não encontrado."})
                    return

                friend_id = target_row["id"]
                if friend_id == user_id:
                    self._send_json(
                        400,
                        {"detail": "Você não pode adicionar a si mesmo como amigo."},
                    )
                    return

                existing_friendship = conn.execute(
                    """
                    SELECT * FROM friendships
                    WHERE (user_id = ? AND friend_id = ?)
                       OR (user_id = ? AND friend_id = ?)
                    """,
                    (user_id, friend_id, friend_id, user_id),
                ).fetchone()

                if existing_friendship:
                    self._send_json(
                        409,
                        {
                            "detail": f"{target_row['character_name']} (@{target_row['username']}) já está na sua lista de amigos."
                        },
                    )
                    return

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

            self._send_json(
                200,
                {
                    "message": f"Agora você e {friend_data['characterName']} são amigos!",
                    "friend": friend_data,
                    "total": total_friends,
                },
            )
            return

        self._send_json(404, {"detail": "Rota não encontrada"})

    def do_DELETE(self) -> None:
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path.rstrip("/")
        qs = urllib.parse.parse_qs(parsed.query)

        if path.startswith("/friends/"):
            friend_id = urllib.parse.unquote(path.split("/friends/", 1)[1])
            user_id = (qs.get("user_id", ["guest-jsalless"])[0] or "guest-jsalless").strip()

            with get_db_connection() as conn:
                conn.execute(
                    """
                    DELETE FROM friendships
                    WHERE (user_id = ? AND friend_id = ?)
                       OR (user_id = ? AND friend_id = ?)
                    """,
                    (user_id, friend_id, friend_id, user_id),
                )
                conn.commit()
                total_row = conn.execute(
                    """
                    SELECT COUNT(*) AS total
                    FROM friendships
                    WHERE (user_id = ? OR friend_id = ?) AND status = 'accepted'
                    """,
                    (user_id, user_id),
                ).fetchone()
                total_friends = int(total_row["total"] if total_row else 0)

            self._send_json(
                200,
                {
                    "message": "Amizade removida com sucesso.",
                    "removedFriendId": friend_id,
                    "total": total_friends,
                },
            )
            return

        self._send_json(404, {"detail": "Rota não encontrada"})


if __name__ == "__main__":
    init_database()
    port = int(os.getenv("PORT", "8000"))
    server = ThreadingHTTPServer(("0.0.0.0", port), EverquestAPIHandler)
    print(f"Everquest API + SQLite DB pronta em http://localhost:{port} ({DB_PATH})")
    server.serve_forever()

