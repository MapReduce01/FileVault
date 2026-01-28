import os

MONGO_URI = os.getenv("MONGO_URI", "mongodb+srv://Jesse:Jesse@cluster0.i3ieb76.mongodb.net/")
DB_NAME = "vaultFile"
SECRET_KEY = os.getenv("SECRET_KEY", "super-secret-key")