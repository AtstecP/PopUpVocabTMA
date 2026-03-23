from fastapi import FastAPI, HTTPException
from motor.motor_asyncio import AsyncIOMotorClient
import os
from dotenv import load_dotenv
from pydantic import BaseModel          # <-- ADD THIS
from typing import List, Optional      # <-- ADD THIS

# Load local .env file
load_dotenv()

app = FastAPI()

# MongoDB setup
MONGO_URL = os.environ.get("MONGODB_URI")
client = AsyncIOMotorClient(MONGO_URL)
db = client.tma_vocab_db

# Data Model (Now it will work because BaseModel is imported)
class Word(BaseModel):
    word: str
    language: str
    level: str
    definition: str
    example: str
    category: str

@app.get("/api/health")
def health_check():
    return {"status": "online", "database": "connected" if MONGO_URL else "disconnected"}

@app.get("/api/words")
async def get_words(lang: str = "fr"):
    # Access the 'vocabulary' collection
    cursor = db.vocabulary.find({"language": lang})
    words = await cursor.to_list(length=100)
    
    for word in words:
        word["id"] = str(word["_id"])
        del word["_id"]
    return words