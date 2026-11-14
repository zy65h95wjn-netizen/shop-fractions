"""After audio.cjs, compare actual graph capture with the shipped waveform.
Requires ffmpeg and numpy. No subjective naturalness claim is made.
"""
from pathlib import Path
import json, subprocess, tempfile, wave
import numpy as np
root = Path(__file__).resolve().parent

def pcm(path):
    with wave.open(str(path)) as audio:
        return np.frombuffer(audio.readframes(audio.getnframes()), dtype='<i2').astype(float) / 32768

with tempfile.TemporaryDirectory() as tmp:
    ref = Path(tmp) / 'reference.wav'
    subprocess.run(['ffmpeg', '-v', 'error', '-i', str(root.parent / 'assets/audio/holly-giggle.wav'),
                    '-af', 'pan=mono|c0=c0,aresample=44100', '-c:a', 'pcm_s16le', str(ref)], check=True)
    source = pcm(ref)
    results = []
    for name in ['webgl-laugh', 'canvas-laugh', 'webgl-tap', 'canvas-tap']:
        recording = pcm(root / (name + '.wav'))
        size = 1 << (len(source) + len(recording) - 1).bit_length()
        correlation = np.fft.irfft(np.fft.rfft(recording, size) * np.conj(np.fft.rfft(source, size)), size)
        lag = int(np.argmax(correlation))
        segment = recording[lag:lag + len(source)]
        length = min(len(segment), len(source))
        assert length == len(source), (name, 'recording misses source ending')
        coefficient = float(np.corrcoef(segment[:length], source[:length])[0, 1])
        # The previous tap cutoff at 1.10s removed this part of the performance.
        tail_start, tail_end = int(1.15 * 44100), int(1.70 * 44100)
        tail_coefficient = float(np.corrcoef(segment[tail_start:tail_end], source[tail_start:tail_end])[0, 1])
        assert tail_coefficient > .995, (name, 'truncated tail', tail_coefficient)
        assert coefficient > .995, (name, coefficient)
        results.append(dict(recording=name + '.wav', sourceCorrelation=coefficient, tailCorrelation=tail_coefficient,
                            onsetOffsetSamples=lag, sampleRate=44100, comparedSamples=length))
    (root / 'graph-identity.json').write_text(json.dumps(results, indent=2) + '\n')
    print(json.dumps(results))
