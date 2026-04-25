import json
import os
from flask import Flask, request, jsonify, send_file
from dotenv import load_dotenv
from spotify import enrich_tracklist
from mixer import save_upload, mix_tracks

load_dotenv()

app = Flask(__name__)
app.config["MAX_CONTENT_LENGTH"] = 200 * 1024 * 1024  # 200 MB


@app.after_request
def add_cors_headers(response):
    response.headers["Access-Control-Allow-Origin"] = "*"
    response.headers["Access-Control-Allow-Headers"] = "Content-Type"
    response.headers["Access-Control-Allow-Methods"] = "GET, POST, OPTIONS"
    return response


@app.route("/generate", methods=["POST", "OPTIONS"])
def generate():
    if request.method == "OPTIONS":
        return jsonify({}), 200

    data = request.get_json(silent=True)
    if not data or "songs" not in data:
        return jsonify({"error": "Provide a JSON body with a 'songs' list"}), 400

    songs = data["songs"]
    if not isinstance(songs, list) or len(songs) == 0:
        return jsonify({"error": "'songs' must be a non-empty list"}), 400

    genre = data.get("genre") or None
    tracklist = enrich_tracklist(songs, genre)

    return jsonify({
        "status": "success",
        "message": f"DJ set generated for {len(songs)} track(s).",
        "tracklist": tracklist,
    })


@app.route("/upload", methods=["POST", "OPTIONS"])
def upload():
    """Receive one or more audio files; return list of {id, name, path}."""
    if request.method == "OPTIONS":
        return jsonify({}), 200

    files = request.files.getlist("files")
    if not files:
        return jsonify({"error": "No files uploaded"}), 400

    results = []
    for f in files:
        if not f or not f.filename:
            continue
        path = save_upload(f, f.filename)
        results.append({
            "id": os.path.basename(path),
            "name": f.filename,
            "path": path,
        })

    if not results:
        return jsonify({"error": "No valid files received"}), 400

    return jsonify({"status": "ok", "files": results})


@app.route("/mix", methods=["POST", "OPTIONS"])
def mix():
    """
    Body: { tracks: [{id, name}, ...], transitions: [{label, color}, ...] }
    Returns: { url: "/stream/<filename>" }
    """
    if request.method == "OPTIONS":
        return jsonify({}), 200

    data = request.get_json(silent=True)
    if not data or "tracks" not in data:
        return jsonify({"error": "Provide 'tracks' list"}), 400

    tracks = data["tracks"]
    transitions = data.get("transitions", [])

    from mixer import UPLOADS_DIR, MIXES_DIR
    paths = []
    for t in tracks:
        track_id = t.get("id", "")
        candidate = os.path.join(UPLOADS_DIR, track_id)
        if not os.path.isfile(candidate):
            return jsonify({"error": f"Track not found: {track_id}"}), 404
        paths.append(candidate)

    try:
        out_path = mix_tracks(paths, transitions)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

    filename = os.path.basename(out_path)
    return jsonify({"status": "ok", "url": f"/stream/{filename}"})


@app.route("/stream/<filename>", methods=["GET"])
def stream(filename):
    from mixer import MIXES_DIR
    path = os.path.join(MIXES_DIR, filename)
    if not os.path.isfile(path):
        return jsonify({"error": "File not found"}), 404
    return send_file(path, mimetype="audio/mpeg", conditional=True)


if __name__ == "__main__":
    app.run(debug=True, port=5001)
