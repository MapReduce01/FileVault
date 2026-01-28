from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
from pymongo import MongoClient
from gridfs import GridFS
from itsdangerous import URLSafeTimedSerializer, BadSignature, SignatureExpired
from bson import ObjectId
import io
import re
import os
import datetime

from config import MONGO_URI, DB_NAME, SECRET_KEY

app = Flask(__name__)
CORS(app)

client = MongoClient(MONGO_URI)
db = client[DB_NAME]
fs = GridFS(db)
files_col = db.files_meta
tokens_col = db.download_tokens

serializer = URLSafeTimedSerializer(SECRET_KEY)

def get_unique_filename(original_filename):
    name, ext = os.path.splitext(original_filename)

    regex = f"^{re.escape(name)}(\\(\\d+\\))?{re.escape(ext)}$"
    existing_files = files_col.find(
        {"filename": {"$regex": regex}},
        {"filename": 1}
    )

    numbers = []
    for f in existing_files:
        match = re.search(r"\((\d+)\)", f["filename"])
        if match:
            numbers.append(int(match.group(1)))
        else:
            numbers.append(0)

    if not numbers:
        return original_filename

    next_number = max(numbers) + 1
    return f"{name}({next_number}){ext}"

@app.route("/upload", methods=["POST"])
def upload_file():
    file = request.files.get("file")
    if not file:
        return jsonify({"error": "No file uploaded"}), 400

    unique_filename = get_unique_filename(file.filename)

    file_id = fs.put(file, filename=unique_filename)

    files_col.insert_one({
        "file_id": file_id,
        "filename": unique_filename,
        "status": "uploaded",
        "created_at": datetime.datetime.utcnow()
    })

    return jsonify({"message": "File uploaded successfully"})

@app.route("/files", methods=["GET"])
def list_files():
    page = int(request.args.get("page", 1))
    limit = int(request.args.get("limit", 5))
    skip = (page - 1) * limit

    total = files_col.count_documents({})
    files = files_col.find().skip(skip).limit(limit)

    result = []
    for f in files:
        result.append({
            "id": str(f["_id"]),
            "filename": f["filename"],
            "status": f["status"]
        })

    return jsonify({
        "files": result,
        "total": total,
        "page": page
    })

@app.route("/download-link/<file_meta_id>", methods=["POST"])
def generate_download_link(file_meta_id):
    file_meta = files_col.find_one({"_id": ObjectId(file_meta_id)})
    if not file_meta:
        return jsonify({"error": "File not found"}), 404

    token = serializer.dumps(str(file_meta["file_id"]))

    tokens_col.insert_one({
        "token": token,
        "file_id": file_meta["file_id"],
        "created_at": datetime.datetime.utcnow()
    })

    return jsonify({
        "download_url": f"http://localhost:5000/download/{token}"
    })

@app.route("/download/<token>", methods=["GET"])
def download_file(token):
    try:
        file_id = serializer.loads(token, max_age=10) #10 seconds for test for now
    except SignatureExpired:
        return jsonify({"error": "Link expired"}), 403
    except BadSignature:
        return jsonify({"error": "Invalid token"}), 403

    grid_file = fs.get(ObjectId(file_id))

    return send_file(
        io.BytesIO(grid_file.read()),
        download_name=grid_file.filename,
        as_attachment=True
    )

if __name__ == "__main__":
    app.run(debug=True)