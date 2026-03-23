import json
from pymongo import MongoClient

# 1. Connect to your Atlas String
# (Get this from the "Connect" button on MongoDB Atlas)
MONGO_URI = "your_mongodb_atlas_connection_string_here"
client = MongoClient(MONGO_URI)
db = client.tma_vocab_db

# 2. Load your JSON
with open('french_vocab.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

# 3. Format for the new DB structure
formatted_words = []
for fr_word, details in data.items():
    formatted_words.append({
        "word": fr_word,            # CHANGED from "fr"
        "definition": details.get("definition"), # CHANGED from "en"
        "category": details.get("category", "General"), 
        "language": "fr",
        "level": "A1"
    })

# 4. Insert into Mongo
if formatted_words:
    db.vocabulary.insert_many(formatted_words)
    print(f"Successfully uploaded {len(formatted_words)} words!")