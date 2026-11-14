"""Match actual native-tap audio output to the decoded source, through each ending."""
from pathlib import Path
import wave, json
import numpy as np
root = Path(__file__).resolve().parent

def pcm(file):
    with wave.open(str(file)) as w:
        return np.frombuffer(w.readframes(w.getnframes()), dtype='<i2').astype(float) / 32768

results = []
for renderer in ['webgl', 'canvas']:
    for character in ['ember', 'midnight', 'aurelia']:
        for take in [1, 2]:
            source = pcm(root / f'elf-reference-{character}-{take}.wav')
            recording = pcm(root / f'elf-{renderer}-{character}-{take}.wav')
            n = 1 << (len(source) + len(recording) - 1).bit_length()
            corr = np.fft.irfft(np.fft.rfft(recording, n) * np.conj(np.fft.rfft(source, n)), n)
            lag = int(np.argmax(corr))
            segment = recording[lag:lag + len(source)]
            assert len(segment) == len(source), (renderer, character, take, 'missing end')
            coefficient = float(np.corrcoef(segment, source)[0, 1])
            start = int(len(source) * .6)
            tail = float(np.corrcoef(segment[start:], source[start:])[0, 1])
            assert coefficient > .995 and tail > .995, (renderer, character, take, coefficient, tail)
            results.append(dict(renderer=renderer, character=character, take=take,
                                sourceCorrelation=coefficient, tailCorrelation=tail,
                                comparedSamples=len(source)))
(root / 'elf-identity.json').write_text(json.dumps(results, indent=2) + '\n')
print(json.dumps(results))
