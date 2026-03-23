from fastapi import FastAPI, HTTPException
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel
from typing import List, Optional
import os
from dotenv import load_dotenv

load_dotenv()

app = FastAPI()

MONGO_URL = os.environ.get("MONGODB_URI")
client = AsyncIOMotorClient(MONGO_URL)
db = client.tma_vocab_db

# --- DATA MODELS ---
class Word(BaseModel):
    word: str
    language: str
    level: str
    definition: str
    example: str
    category: str

# NEW: User Settings Model
class UserSettings(BaseModel):
    tg_id: int
    language: str = "fr"
    autoPlaySound: bool = True

# --- ENDPOINTS ---
@app.get("/api/health")
def health_check():
    return {"status": "online", "database": "connected" if MONGO_URL else "disconnected"}

@app.get("/api/words")
async def get_words(lang: str = "fr"):
    cursor = db.vocabulary.find({"language": lang})
    words = await cursor.to_list(length=100)
    for word in words:
        word["id"] = str(word["_id"])
        del word["_id"]
    return words

# NEW: Get User Settings
@app.get("/api/user/{tg_id}")
async def get_user(tg_id: int):
    user = await db.users.find_one({"tg_id": tg_id})
    if user:
        user["_id"] = str(user["_id"])
        return user
    # If it's a new user, return default settings
    return {"tg_id": tg_id, "language": "fr", "autoPlaySound": True}

# NEW: Update User Settings
@app.post("/api/user")
async def update_user(settings: UserSettings):
    # upsert=True means "update if exists, create if it doesn't"
    await db.users.update_one(
        {"tg_id": settings.tg_id},
        {"$set": settings.dict()},
        upsert=True
    )
    return {"status": "success"}