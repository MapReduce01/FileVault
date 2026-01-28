import os
import dotenv

dotenv.load_dotenv()

MONGO_URI = os.getenv("MONGO_URI")
DB_NAME = "vaultFile"
SECRET_KEY = os.getenv("SECRET_KEY", "super-secret-key")