from pathlib import Path
import wave, json
import numpy as np
root=Path(__file__).resolve().parent

def pcm(file):
    with wave.open(str(file)) as w:
        return np.frombuffer(w.readframes(w.getnframes()),dtype='<i2').astype(float)/32768

results=[]
for candidate in ['cv','splice','mox']:
    for take in [1,2]:
        source=pcm(root/f'reference-{candidate}-{take}.wav');recording=pcm(root/f'candidate-{candidate}-{take}.wav')
        n=1<<(len(source)+len(recording)-1).bit_length()
        corr=np.fft.irfft(np.fft.rfft(recording,n)*np.conj(np.fft.rfft(source,n)),n)
        lag=int(np.argmax(corr));segment=recording[lag:lag+len(source)]
        assert len(segment)==len(source),(candidate,take,'missing end')
        coefficient=float(np.corrcoef(segment,source)[0,1]);start=int(len(source)*.6)
        tail=float(np.corrcoef(segment[start:],source[start:])[0,1]);assert coefficient>.995 and tail>.995,(candidate,take,coefficient,tail)
        results.append(dict(candidate=candidate,take=take,sourceCorrelation=coefficient,tailCorrelation=tail,comparedSamples=len(source)))
(root/'candidate-identity.json').write_text(json.dumps(results,indent=2)+'\n');print(json.dumps(results))
