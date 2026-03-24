import os
import httpx
import urllib.parse
from fastapi import FastAPI, HTTPException
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel
from typing import List, Optional
from dotenv import load_dotenv

load_dotenv()

app = FastAPI()

PIXABAY_API_KEY = os.environ.get("PIXABAY_API_KEY")
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
async def get_words(lang: str = "fr", category: str = None):
    query = {"language": lang}
    if category:
        query["category"] = category
        
    cursor = db.vocabulary.find(query)
    # We can keep a high limit here because it's filtered by category now
    words = await cursor.to_list(length=500) 
    
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

@app.get("/api/image")
async def get_image(word: str, search_term: str):
    # 1. Check if we already saved the image URL in our database
    word_doc = await db.vocabulary.find_one({"word": word})
    
    if word_doc and word_doc.get("image_url"):
        return {"image_url": word_doc["image_url"]}
        
    # 2. If no API key is found, safely return null
    if not PIXABAY_API_KEY:
        return {"image_url": None}

    # 3. Call Pixabay. We use the English definition because Pixabay searches better in English!
    async with httpx.AsyncClient() as client:
        url = f"https://pixabay.com/api/?key={PIXABAY_API_KEY}&q={urllib.parse.quote(search_term)}&image_type=photo&orientation=horizontal&per_page=3"
        response = await client.get(url)
        data = response.json()
        
        if data.get("hits") and len(data["hits"]) > 0:
            # Grab the first image result
            img_url = data["hits"][0]["webformatURL"]
            
            # Save it to MongoDB so we NEVER have to ask Pixabay for this word again
            await db.vocabulary.update_one(
                {"word": word},
                {"$set": {"image_url": img_url}}
            )
            return {"image_url": img_url}
            
    return {"image_url": None}

@app.get("/api/categories")
async def get_categories(lang: str = "fr"):
    pipeline = [
        {"$match": {"language": lang}},
        {"$group": {"_id": "$category", "count": {"$sum": 1}}}
    ]
    cursor = db.vocabulary.aggregate(pipeline)
    categories = await cursor.to_list(length=100)
    
    # Format for frontend: [{"title": "Food", "count": 25}, ...]
    return [{"title": cat["_id"], "count": cat["count"]} for cat in categories]

