# Santa voice recording

- Work: **SantaClaus_HoHoHo.wav**
- Creator: **Bollenator**
- Source: https://freesound.org/people/Bollenator/sounds/325180/
- License: **Creative Commons Zero 1.0 Universal (CC0)** — https://creativecommons.org/publicdomain/zero/1.0/
- Source page checked November 13, 2026. It explicitly permits copying, modification, distribution and performance, including commercial use.
- Downloaded audio: https://cdn.freesound.org/previews/325/325180_1754432-hq.mp3
- Download SHA-256: `b8f205e28113477806392300e640b0c3f999d5cf014e1172c823df74b55eef2b`

The bundled `santa-ho-ho-ho.mp3` contains the second three-word “Ho ho ho” phrase, trimmed from 8.55 to 10.05 seconds. It retains the actor's natural speed and pitch. An 8 ms entrance fade and 20 ms exit fade avoid edge clicks. Mono, 48 kHz, MP3 at 96 kbps; 18,764 bytes.

Bundled SHA-256: `c0874443e5e562fe5431c5cfb10880a18a2a1b888a73c1630a12e1be299d0e7b`.

Reproduction (the input is the downloaded MP3 above):

```sh
ffmpeg -ss 8.55 -i source.mp3 -t 1.5 \
  -af 'afade=t=in:d=0.008,afade=t=out:st=1.48:d=0.02' \
  -map_metadata -1 -ac 1 -ar 48000 -codec:a libmp3lame -b:a 96k santa-ho-ho-ho.mp3
```
