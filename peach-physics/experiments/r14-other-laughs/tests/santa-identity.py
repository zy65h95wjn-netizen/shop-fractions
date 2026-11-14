"""Compare the actual browser output with its decoded approved Santa source."""
from pathlib import Path
import wave, json
import numpy as np
root = Path(__file__).resolve().parent
results = []
for renderer in ['webgl', 'canvas']:
    source = np.frombuffer((root / f'santa-{renderer}-reference.pcm').read_bytes(), dtype='<i2').astype(float)
    with wave.open(str(root / f'santa-{renderer}-test.wav')) as w:
        recording = np.frombuffer(w.readframes(w.getnframes()), dtype='<i2').astype(float)
    n = 1 << (len(source) + len(recording) - 1).bit_length()
    correlation = np.fft.irfft(np.fft.rfft(recording, n) * np.conj(np.fft.rfft(source, n)), n)
    lag = int(np.argmax(correlation))
    segment = recording[lag:lag + len(source)]
    assert len(segment) == len(source), (renderer, 'missing ending')
    coefficient = float(np.corrcoef(segment, source)[0, 1])
    start = int(len(source) * .6)
    tail = float(np.corrcoef(segment[start:], source[start:])[0, 1])
    assert coefficient > .995 and tail > .995, (renderer, coefficient, tail)
    results.append(dict(renderer=renderer, sourceCorrelation=coefficient,
                        tailCorrelation=tail, comparedSamples=len(source)))
(root / 'santa-identity.json').write_text(json.dumps(results, indent=2) + '\n')
print(json.dumps(results))
