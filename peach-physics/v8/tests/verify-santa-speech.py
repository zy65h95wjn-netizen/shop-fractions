"""Optional independent speech check: pip install faster-whisper; needs ffmpeg.

Usage: python verify-santa-speech.py [local_model_cache]
No transcript, initial prompt or vocabulary hint is supplied to the recognizer.
"""
import dataclasses
import hashlib
import json
import pathlib
import re
import subprocess
import sys

import numpy as np
from faster_whisper import WhisperModel

cache = sys.argv[1] if len(sys.argv) > 1 else None
model = WhisperModel("small.en", device="cpu", compute_type="int8", download_root=cache)
root = pathlib.Path(__file__).resolve().parent / "santa-voice-evidence"
report = {"model": "Systran/faster-whisper-small.en", "prompt": None,
          "channel": "left (no stereo summing gain)", "recordings": []}
for file in sorted(root.glob("*-belly-tap.webm")):
    pcm = subprocess.check_output([
        "ffmpeg", "-v", "error", "-i", str(file),
        "-af", "pan=mono|c0=c0", "-ar", "16000", "-f", "f32le", "pipe:1",
    ])
    samples = np.frombuffer(pcm, dtype=np.float32)
    segments, _ = model.transcribe(samples, beam_size=5, word_timestamps=True)
    segments = [dataclasses.asdict(segment) for segment in segments]
    text = " ".join(segment["text"].strip() for segment in segments)
    assert re.findall(r"[a-z]+", text.lower()) == ["ho", "ho", "ho"], (file.name, text)
    peak = float(np.max(np.abs(samples)))
    rms = float(np.sqrt(np.mean(samples * samples)))
    assert 0.05 < peak < 1 and rms > 0.015, (file.name, peak, rms)
    report["recordings"].append({
        "file": file.name, "sha256": hashlib.sha256(file.read_bytes()).hexdigest(),
        "duration": len(samples) / 16000, "peak": peak, "rms": rms,
        "text": text, "segments": segments,
    })
assert len(report["recordings"]) == 2
(root / "transcripts.json").write_text(json.dumps(report, indent=2) + "\n")
print(json.dumps(report))
