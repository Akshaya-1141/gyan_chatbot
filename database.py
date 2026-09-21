import sqlite3
import json
import uuid
from datetime import datetime, timezone
import os

DB_PATH = os.path.join(os.path.dirname(__file__), "gyan_data.db")


def get_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    conn = get_connection()
    cursor = conn.cursor()
    
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS conversations (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        effort_level TEXT DEFAULT 'medium',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    """)
    
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS messages (
        id TEXT PRIMARY KEY,
        conversation_id TEXT NOT NULL,
        role TEXT NOT NULL,
        content TEXT NOT NULL,
        thinking TEXT DEFAULT '',
        effort_level TEXT DEFAULT 'medium',
        attachments TEXT DEFAULT '[]',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (conversation_id) REFERENCES conversations (id) ON DELETE CASCADE
    )
    """)
    
    # Index for fast conversation history retrieval
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_messages_conv ON messages (conversation_id, created_at)")
    
    conn.commit()
    conn.close()


def create_conversation(title="New Conversation", effort_level="medium"):
    conv_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute(
        "INSERT INTO conversations (id, title, effort_level, created_at, updated_at) VALUES (?, ?, ?, ?, ?)",
        (conv_id, title, effort_level, now, now)
    )
    conn.commit()
    conn.close()
    return {
        "id": conv_id,
        "title": title,
        "effort_level": effort_level,
        "created_at": now,
        "updated_at": now,
        "message_count": 0
    }


def get_conversations(search_query=None):
    conn = get_connection()
    cursor = conn.cursor()
    if search_query:
        query_str = f"%{search_query.strip()}%"
        cursor.execute("""
            SELECT c.*, 
                   COUNT(m.id) as message_count,
                   (SELECT content FROM messages WHERE conversation_id = c.id ORDER BY created_at DESC LIMIT 1) as last_message
            FROM conversations c
            LEFT JOIN messages m ON c.id = m.conversation_id
            WHERE c.title LIKE ? OR m.content LIKE ?
            GROUP BY c.id
            ORDER BY c.updated_at DESC
        """, (query_str, query_str))
    else:
        cursor.execute("""
            SELECT c.*, 
                   COUNT(m.id) as message_count,
                   (SELECT content FROM messages WHERE conversation_id = c.id ORDER BY created_at DESC LIMIT 1) as last_message
            FROM conversations c
            LEFT JOIN messages m ON c.id = m.conversation_id
            GROUP BY c.id
            ORDER BY c.updated_at DESC
        """)
    rows = cursor.fetchall()
    results = []
    for r in rows:
        results.append({
            "id": r["id"],
            "title": r["title"],
            "effort_level": r["effort_level"],
            "created_at": r["created_at"],
            "updated_at": r["updated_at"],
            "message_count": r["message_count"],
            "last_message": r["last_message"] or ""
        })
    conn.close()
    return results


def get_conversation(conv_id):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM conversations WHERE id = ?", (conv_id,))
    row = cursor.fetchone()
    conn.close()
    if not row:
        return None
    return dict(row)


def update_conversation_title(conv_id, new_title):
    now = datetime.now(timezone.utc).isoformat()
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute(
        "UPDATE conversations SET title = ?, updated_at = ? WHERE id = ?",
        (new_title.strip(), now, conv_id)
    )
    conn.commit()
    success = cursor.rowcount > 0
    conn.close()
    return success


def update_conversation_effort(conv_id, effort_level):
    now = datetime.now(timezone.utc).isoformat()
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute(
        "UPDATE conversations SET effort_level = ?, updated_at = ? WHERE id = ?",
        (effort_level, now, conv_id)
    )
    conn.commit()
    conn.close()


def delete_conversation(conv_id):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM messages WHERE conversation_id = ?", (conv_id,))
    cursor.execute("DELETE FROM conversations WHERE id = ?", (conv_id,))
    conn.commit()
    conn.close()
    return True


def clear_all_conversations():
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM messages")
    cursor.execute("DELETE FROM conversations")
    conn.commit()
    conn.close()
    return True


def add_message(conv_id, role, content, thinking="", effort_level="medium", attachments=None):
    msg_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    attachments_json = json.dumps(attachments or [])
    
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO messages (id, conversation_id, role, content, thinking, effort_level, attachments, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    """, (msg_id, conv_id, role, content, thinking, effort_level, attachments_json, now))
    
    # Update conversation's updated_at
    cursor.execute("UPDATE conversations SET updated_at = ? WHERE id = ?", (now, conv_id))
    
    conn.commit()
    conn.close()
    
    return {
        "id": msg_id,
        "conversation_id": conv_id,
        "role": role,
        "content": content,
        "thinking": thinking,
        "effort_level": effort_level,
        "attachments": attachments or [],
        "created_at": now
    }


def get_messages(conv_id):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM messages WHERE conversation_id = ? ORDER BY created_at ASC", (conv_id,))
    rows = cursor.fetchall()
    messages = []
    for r in rows:
        att = []
        if r["attachments"]:
            try:
                att = json.loads(r["attachments"])
            except Exception:
                att = []
        messages.append({
            "id": r["id"],
            "conversation_id": r["conversation_id"],
            "role": r["role"],
            "content": r["content"],
            "thinking": r["thinking"] or "",
            "effort_level": r["effort_level"] or "medium",
            "attachments": att,
            "created_at": r["created_at"]
        })
    conn.close()
    return messages


def get_message(msg_id):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM messages WHERE id = ?", (msg_id,))
    row = cursor.fetchone()
    conn.close()
    if not row:
        return None
    data = dict(row)
    try:
        data["attachments"] = json.loads(data["attachments"]) if data["attachments"] else []
    except Exception:
        data["attachments"] = []
    return data


def trim_messages_after(conv_id, target_msg_id, include_target=False):
    """
    Used when editing a prompt: deletes all messages created after (or starting from) the given message.
    """
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT created_at FROM messages WHERE id = ? AND conversation_id = ?", (target_msg_id, conv_id))
    row = cursor.fetchone()
    if not row:
        conn.close()
        return False
    target_time = row["created_at"]
    
    if include_target:
        cursor.execute("DELETE FROM messages WHERE conversation_id = ? AND created_at >= ?", (conv_id, target_time))
    else:
        cursor.execute("DELETE FROM messages WHERE conversation_id = ? AND created_at > ?", (conv_id, target_time))
        
    conn.commit()
    conn.close()
    return True


# Initialize on import
init_db()
