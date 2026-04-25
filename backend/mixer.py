import os
import subprocess
import tempfile
import uuid
import shutil

FFMPEG = shutil.which("ffmpeg") or "/opt/homebrew/bin/ffmpeg"
UPLOADS_DIR = os.path.join(os.path.dirname(__file__), "uploads")
MIXES_DIR   = os.path.join(os.path.dirname(__file__), "mixes")

os.makedirs(UPLOADS_DIR, exist_ok=True)
os.makedirs(MIXES_DIR,   exist_ok=True)

# Crossfade config per transition label:
# (duration_sec, curve_in, curve_out)
TRANSITION_CFG = {
    "Smooth Blend":     (8,   "tri",  "tri"),
    "Beat Match Drop":  (0.5, "exp",  "exp"),
    "Filter Sweep":     (6,   "qsin", "qsin"),
    "Bass Drop":        (3,   "exp",  "tri"),
    "Echo Roll Out":    (10,  "tri",  "log"),
    "Backspin Cut":     (1,   "exp",  "exp"),
    "Loop Punch":       (4,   "tri",  "tri"),
    "Build & Release":  (8,   "qsin", "tri"),
    "Harmonic Mix":     (10,  "tri",  "tri"),
    "Key Lock Blend":   (8,   "tri",  "tri"),
}
DEFAULT_CFG = (6, "tri", "tri")


def save_upload(file_storage, original_name):
    """Save an uploaded FileStorage to disk; return its path."""
    ext = os.path.splitext(original_name)[1] or ".audio"
    filename = f"{uuid.uuid4().hex}{ext}"
    path = os.path.join(UPLOADS_DIR, filename)
    file_storage.save(path)
    return path


def mix_tracks(track_paths, transitions):
    """
    Mix a list of audio files with given transitions using ffmpeg acrossfade.

    track_paths  – list of absolute paths to audio files (in order)
    transitions  – list of transition dicts {label, color} between consecutive tracks
                   (len == len(track_paths) - 1)

    Returns path to the output mixed file.
    """
    n = len(track_paths)
    if n == 0:
        raise ValueError("No tracks to mix")

    out_path = os.path.join(MIXES_DIR, f"mix_{uuid.uuid4().hex}.mp3")

    if n == 1:
        # Single track — re-encode to normalise format
        cmd = [
            FFMPEG, "-y",
            "-i", track_paths[0],
            "-ar", "44100", "-ac", "2", "-b:a", "192k",
            out_path,
        ]
        _run(cmd)
        return out_path

    # Build a chained acrossfade filter for N tracks
    inputs = []
    for p in track_paths:
        inputs += ["-i", p]

    filter_parts = []
    # Label each input stream
    for i in range(n):
        filter_parts.append(f"[{i}:a]aformat=sample_rates=44100:channel_layouts=stereo[a{i}]")

    # Chain crossfades: [a0][a1]acrossfade… → [cf1], [cf1][a2]acrossfade… → [cf2] …
    for i in range(n - 1):
        t = transitions[i] if i < len(transitions) else {}
        label = t.get("label", "") if t else ""
        dur, cin, cout = TRANSITION_CFG.get(label, DEFAULT_CFG)

        left  = f"[cf{i}]" if i > 0 else f"[a{i}]"
        right = f"[a{i+1}]"
        out   = f"[cf{i+1}]" if i < n - 2 else "[out]"

        filter_parts.append(
            f"{left}{right}acrossfade=d={dur}:c1={cin}:c2={cout}{out}"
        )

    filter_str = ";".join(filter_parts)

    cmd = [
        FFMPEG, "-y",
        *inputs,
        "-filter_complex", filter_str,
        "-map", "[out]",
        "-ar", "44100", "-ac", "2", "-b:a", "192k",
        out_path,
    ]
    _run(cmd)
    return out_path


def _run(cmd):
    result = subprocess.run(
        cmd,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
    )
    if result.returncode != 0:
        raise RuntimeError(result.stderr.decode(errors="replace")[-1000:])
