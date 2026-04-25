import os
import base64
import time
import requests

# ---------------------------------------------------------------------------
# Camelot wheel: (spotify_key 0-11, mode 0=minor 1=major) -> (number 1-12, letter)
# Compatible tracks share the same number, or differ by 1 on the same letter.
# ---------------------------------------------------------------------------
CAMELOT = {
    (0, 1): (8, 'B'),  (1, 1): (3, 'B'),  (2, 1): (10, 'B'), (3, 1): (5, 'B'),
    (4, 1): (12, 'B'), (5, 1): (7, 'B'),  (6, 1): (2, 'B'),  (7, 1): (9, 'B'),
    (8, 1): (4, 'B'),  (9, 1): (11, 'B'), (10, 1): (6, 'B'), (11, 1): (1, 'B'),
    (0, 0): (5, 'A'),  (1, 0): (12, 'A'), (2, 0): (7, 'A'),  (3, 0): (2, 'A'),
    (4, 0): (9, 'A'),  (5, 0): (4, 'A'),  (6, 0): (11, 'A'), (7, 0): (6, 'A'),
    (8, 0): (1, 'A'),  (9, 0): (8, 'A'),  (10, 0): (3, 'A'), (11, 0): (10, 'A'),
}

_token_cache = {"token": None, "expires_at": 0}


def _get_client_token():
    if _token_cache["token"] and time.time() < _token_cache["expires_at"] - 30:
        return _token_cache["token"]

    client_id = os.getenv("SPOTIFY_CLIENT_ID")
    client_secret = os.getenv("SPOTIFY_CLIENT_SECRET")
    if not client_id or not client_secret:
        return None

    credentials = base64.b64encode(f"{client_id}:{client_secret}".encode()).decode()
    resp = requests.post(
        "https://accounts.spotify.com/api/token",
        headers={"Authorization": f"Basic {credentials}"},
        data={"grant_type": "client_credentials"},
        timeout=8,
    )
    if resp.status_code != 200:
        return None

    data = resp.json()
    _token_cache["token"] = data["access_token"]
    _token_cache["expires_at"] = time.time() + data["expires_in"]
    return _token_cache["token"]


def _search_track(token, query):
    resp = requests.get(
        "https://api.spotify.com/v1/search",
        headers={"Authorization": f"Bearer {token}"},
        params={"q": query, "type": "track", "limit": 1},
        timeout=8,
    )
    if resp.status_code != 200:
        return None
    items = resp.json().get("tracks", {}).get("items", [])
    return items[0] if items else None


def _get_audio_features(token, track_id):
    resp = requests.get(
        f"https://api.spotify.com/v1/audio-features/{track_id}",
        headers={"Authorization": f"Bearer {token}"},
        timeout=8,
    )
    return resp.json() if resp.status_code == 200 else None


def _harmonically_compatible(f1, f2):
    c1 = CAMELOT.get((f1["key"], f1["mode"]))
    c2 = CAMELOT.get((f2["key"], f2["mode"]))
    if not c1 or not c2:
        return False
    num_diff = abs(c1[0] - c2[0])
    num_diff = min(num_diff, 12 - num_diff)
    return num_diff == 0 or (num_diff == 1 and c1[1] == c2[1])


# Maps each genre id to ordered preferred transitions (used when features unavailable,
# and as a tiebreaker when features produce ambiguous results).
GENRE_TRANSITIONS = {
    "deep-house":         [("Smooth Blend", "#00e5ff"), ("Filter Sweep", "#00e5ff"), ("Harmonic Mix", "#39ff14")],
    "tech-house":         [("Loop Punch", "#ff00de"), ("Beat Match Drop", "#ff00de"), ("Bass Drop", "#ff9500")],
    "progressive-house":  [("Build & Release", "#39ff14"), ("Harmonic Mix", "#39ff14"), ("Smooth Blend", "#00e5ff")],
    "afro-house":         [("Smooth Blend", "#00e5ff"), ("Loop Punch", "#ff00de"), ("Filter Sweep", "#00e5ff")],
    "melodic-techno":     [("Harmonic Mix", "#39ff14"), ("Build & Release", "#39ff14"), ("Filter Sweep", "#00e5ff")],
    "techno":             [("Beat Match Drop", "#ff00de"), ("Bass Drop", "#ff9500"), ("Backspin Cut", "#ff3864")],
    "minimal-techno":     [("Loop Punch", "#ff00de"), ("Filter Sweep", "#00e5ff"), ("Smooth Blend", "#00e5ff")],
    "trance":             [("Build & Release", "#39ff14"), ("Harmonic Mix", "#39ff14"), ("Key Lock Blend", "#39ff14")],
    "psytrance":          [("Loop Punch", "#ff00de"), ("Beat Match Drop", "#ff00de"), ("Build & Release", "#39ff14")],
    "drum-and-bass":      [("Beat Match Drop", "#ff00de"), ("Bass Drop", "#ff9500"), ("Loop Punch", "#ff00de")],
    "liquid-dnb":         [("Smooth Blend", "#00e5ff"), ("Filter Sweep", "#00e5ff"), ("Echo Roll Out", "#00e5ff")],
    "dubstep":            [("Bass Drop", "#ff9500"), ("Beat Match Drop", "#ff00de"), ("Backspin Cut", "#ff3864")],
    "future-bass":        [("Build & Release", "#39ff14"), ("Harmonic Mix", "#39ff14"), ("Smooth Blend", "#00e5ff")],
    "big-room":           [("Bass Drop", "#ff9500"), ("Build & Release", "#39ff14"), ("Beat Match Drop", "#ff00de")],
    "hardstyle":          [("Beat Match Drop", "#ff00de"), ("Bass Drop", "#ff9500"), ("Build & Release", "#39ff14")],
    "uk-garage":          [("Loop Punch", "#ff00de"), ("Smooth Blend", "#00e5ff"), ("Backspin Cut", "#ff3864")],
    "nu-disco":           [("Smooth Blend", "#00e5ff"), ("Echo Roll Out", "#00e5ff"), ("Filter Sweep", "#00e5ff")],
    "ambient":            [("Smooth Blend", "#00e5ff"), ("Echo Roll Out", "#00e5ff"), ("Filter Sweep", "#00e5ff")],
}

ALL_TRANSITIONS = [
    ("Smooth Blend", "#00e5ff"), ("Beat Match Drop", "#ff00de"), ("Filter Sweep", "#00e5ff"),
    ("Bass Drop", "#ff9500"),    ("Echo Roll Out", "#00e5ff"),   ("Backspin Cut", "#ff3864"),
    ("Loop Punch", "#ff00de"),   ("Build & Release", "#39ff14"), ("Harmonic Mix", "#39ff14"),
    ("Key Lock Blend", "#39ff14"),
]

TRANSITION_COLORS = {label: color for label, color in ALL_TRANSITIONS}


def _make_transition(label):
    return {"label": label, "color": TRANSITION_COLORS.get(label, "#00e5ff")}


def _choose_transition(f1, f2, genre=None, index=0):
    """Pick a transition label + neon color based on audio features and genre."""
    genre_list = GENRE_TRANSITIONS.get(genre) if genre else None

    # No audio features — fall back entirely to genre style or generic cycle
    if not f1 or not f2:
        if genre_list:
            label, color = genre_list[index % len(genre_list)]
            return {"label": label, "color": color}
        label, color = ALL_TRANSITIONS[index % len(ALL_TRANSITIONS)]
        return {"label": label, "color": color}

    tempo_diff = abs(f1["tempo"] - f2["tempo"])
    energy_delta = f2["energy"] - f1["energy"]
    both_high_energy = f1["energy"] > 0.75 and f2["energy"] > 0.75
    harmonic = _harmonically_compatible(f1, f2)

    # Genre-aware thresholds: smooth genres loosen tempo tolerance, hard genres tighten it
    smooth_genres = {"deep-house", "liquid-dnb", "nu-disco", "ambient", "afro-house"}
    hard_genres   = {"techno", "drum-and-bass", "dubstep", "hardstyle", "psytrance"}
    tempo_tight  = 3 if genre in smooth_genres else (8 if genre in hard_genres else 5)
    tempo_hard   = 12 if genre in smooth_genres else (15 if genre in hard_genres else 18)

    if harmonic and tempo_diff < tempo_tight * 2:
        return _make_transition("Harmonic Mix")
    if tempo_diff < tempo_tight and abs(energy_delta) < 0.12:
        return _make_transition("Smooth Blend")
    if both_high_energy and tempo_diff < 12:
        return _make_transition("Bass Drop")
    if tempo_diff > tempo_hard:
        return _make_transition("Beat Match Drop")
    if energy_delta < -0.28:
        return _make_transition("Filter Sweep")
    if energy_delta > 0.28:
        return _make_transition("Build & Release")
    if f1["danceability"] > 0.78 and f2["danceability"] > 0.78:
        return _make_transition("Loop Punch")
    if harmonic:
        return _make_transition("Key Lock Blend")
    if f1["valence"] - f2["valence"] > 0.4:
        return _make_transition("Echo Roll Out")

    # Final fallback: use genre preference if available
    if genre_list:
        label, color = genre_list[index % len(genre_list)]
        return {"label": label, "color": color}
    return _make_transition("Backspin Cut")


def enrich_tracklist(song_names, genre=None):
    """
    Given a list of song name strings, look each up on Spotify, fetch audio
    features, and return enriched track dicts with transition_to_next set.
    Falls back gracefully if Spotify creds are missing or a track isn't found.
    """
    token = _get_client_token()
    tracks = []

    for name in song_names:
        entry = {"name": name, "features": None, "spotify_id": None,
                 "tempo": None, "energy": None, "key": None, "mode": None,
                 "transition_to_next": None}
        if token:
            track = _search_track(token, name)
            if track:
                entry["spotify_id"] = track["id"]
                feats = _get_audio_features(token, track["id"])
                if feats:
                    entry["features"] = feats
                    entry["tempo"] = round(feats["tempo"], 1)
                    entry["energy"] = round(feats["energy"], 2)
                    entry["key"] = feats["key"]
                    entry["mode"] = feats["mode"]
        tracks.append(entry)

    for i in range(len(tracks) - 1):
        f1 = tracks[i]["features"]
        f2 = tracks[i + 1]["features"]
        tracks[i]["transition_to_next"] = _choose_transition(f1, f2, genre=genre, index=i)

    # Clean up internal-only field before returning
    for t in tracks:
        t.pop("features", None)

    return tracks
