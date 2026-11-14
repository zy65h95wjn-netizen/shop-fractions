"""Compare actual Test and tap output, including each complete ending.
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
    results = []
    for variant, asset, names, tail in [
        (1, 'holly-giggle.wav', ['webgl-laugh', 'canvas-laugh', 'webgl-tap', 'canvas-tap'], (1.15, 1.70)),
        (2, 'holly-giggle-2.wav', ['webgl-tap-2', 'canvas-tap-2', 'webgl-test-2', 'canvas-test-2'], (1.10, 1.70)),
    ]:
        ref = Path(tmp) / f'reference-{variant}.wav'
        subprocess.run(['ffmpeg', '-v', 'error', '-i', str(root.parent / 'assets/audio' / asset),
                        '-af', 'pan=mono|c0=c0,aresample=44100', '-c:a', 'pcm_s16le', str(ref)], check=True)
        source = pcm(ref)
        for name in names:
            recording = pcm(root / (name + '.wav'))
            size = 1 << (len(source) + len(recording) - 1).bit_length()
            correlation = np.fft.irfft(np.fft.rfft(recording, size) * np.conj(np.fft.rfft(source, size)), size)
            lag = int(np.argmax(correlation))
            segment = recording[lag:lag + len(source)]
            assert len(segment) == len(source), (name, 'recording misses source ending')
            coefficient = float(np.corrcoef(segment, source)[0, 1])
            tail_start, tail_end = (int(t * 44100) for t in tail)
            tail_coefficient = float(np.corrcoef(segment[tail_start:tail_end], source[tail_start:tail_end])[0, 1])
            assert coefficient > .995, (name, coefficient)
            assert tail_coefficient > .995, (name, 'truncated tail', tail_coefficient)
            results.append(dict(recording=name + '.wav', variant=variant, sourceCorrelation=coefficient,
                                tailCorrelation=tail_coefficient, onsetOffsetSamples=lag,
                                sampleRate=44100, comparedSamples=len(source)))
    (root / 'graph-identity.json').write_text(json.dumps(results, indent=2) + '\n')
    print(json.dumps(results))
