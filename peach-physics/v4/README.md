# Peach Physics — Christmas Elf, v0.0.4

Standalone, portrait-mode web experiment at `/peach-physics/v4/`.

This version builds on the confirmed working v0.0.3. Quick taps on either independently responsive spring region trigger a playful slap effect: short contact compression, strong localized rebound, and a brief fading contact ring. Long presses, drags, and directional flicks retain their distinct v0.0.3 behaviors. Two-finger taps work independently; lifting one finger does not interrupt the other.

Optional synthesized slap sound is **off by default**, enabled through the existing gear menu. When supported by the browser it uses local Web Audio and requires an appropriate user gesture; no external audio files or network calls. V0.0.3 presets and settings are imported once when v0.0.4 has no saved state; v0.0.4 then uses its own storage key. Graphics, artwork, image framing, existing spring system, and prior version routes remain unchanged.

## Validation

JavaScript syntax passed; automated Chromium tests at 390×844, 430×932, 440×956 verified single and simultaneous slaps, tap/drag/flick distinctions, hold/cancel behavior, audio toggle persistence, preserved presets, gear controls, animation settling, original image integrity, and no page exceptions. The sandbox browser uses Canvas fallback; iPhone WebGL rendering and actual audible output remain unverified until physical-device testing.