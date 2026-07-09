
import aiosqlite
from config import DB_PATH, MAX_HISTORY_MESSAGES

async def init_db():
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute("""
            CREATE TABLE IF NOT EXISTS users (
                user_id INTEGER PRIMARY KEY,
                current_mode TEXT DEFAULT 'human',
                custom_prompt TEXT
            )
        """)
        await db.execute("""
            CREATE TABLE IF NOT EXISTS chat_history (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER,
                role TEXT NOT NULL,
                content TEXT NOT NULL,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users (user_id)
            )
        """)
        await db.commit()

async def get_user_settings(user_id):
    async with aiosqlite.connect(DB_PATH) as db:
        cursor = await db.execute("SELECT current_mode, custom_prompt FROM users WHERE user_id = ?", (user_id,))
        settings = await cursor.fetchone()
        if settings:
            return {"current_mode": settings[0], "custom_prompt": settings[1]}
        return None

async def set_user_mode(user_id, mode):
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute("INSERT OR REPLACE INTO users (user_id, current_mode) VALUES (?, ?)", (user_id, mode))
        await db.commit()

async def set_custom_prompt(user_id, prompt):
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute("INSERT OR REPLACE INTO users (user_id, custom_prompt) VALUES (?, ?)", (user_id, prompt))
        await db.commit()

async def add_message_to_history(user_id, role, content):
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute("INSERT INTO chat_history (user_id, role, content) VALUES (?, ?, ?)", (user_id, role, content))
        # Remove oldest messages if history exceeds MAX_HISTORY_MESSAGES
        cursor = await db.execute("SELECT COUNT(*) FROM chat_history WHERE user_id = ?", (user_id,))
        count = (await cursor.fetchone())[0]
        if count > MAX_HISTORY_MESSAGES:
            await db.execute("DELETE FROM chat_history WHERE id IN (SELECT id FROM chat_history WHERE user_id = ? ORDER BY timestamp ASC LIMIT ?)", (user_id, count - MAX_HISTORY_MESSAGES))
        await db.commit()

async def get_chat_history(user_id):
    async with aiosqlite.connect(DB_PATH) as db:
        cursor = await db.execute("SELECT role, content FROM chat_history WHERE user_id = ? ORDER BY timestamp ASC", (user_id,))
        return await cursor.fetchall()

async def clear_chat_history(user_id):
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute("DELETE FROM chat_history WHERE user_id = ?", (user_id,))
        await db.commit()
