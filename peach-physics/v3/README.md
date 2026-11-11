# Peach Physics — Christmas Elf, v0.0.3

A full-screen, touch-first, static-hosted single-file web app. It uses the same approved redheaded elf artwork and two-handed, coupled spring setup as v0.0.2. No accounts, analytics, or external dependencies.

## Changes from 0.0.2

- Tiny gear icon opens/closes the controls drawer; no controls text on the portrait.
- Independent two-finger touch input retained, with direction-sensitive flick-release impulses and bounded velocity.
- Two slow viscoelastic followers add restrained delayed secondary motion, asymmetrically tuned per side.
- More carefully feathered image deformation around the shorts seam and lower boundary.
- Natural, Playful, Chaos presets plus Custom slider overrides; preferences saved in localStorage.
- The previous validated full-screen portrait framing is unchanged, including clear head space.
- Canvas fallback when WebGL is unavailable.

## Testing

Use a normal HTTPS origin and test both rendering modes where possible. Two fingers should remain independently captured; raising one must not interrupt the other. Settings persist across reloads when storage is available. Browser/desktop tests do not prove iPhone WebGL behavior. The older v0.0.2 and v0.0.1 remain unchanged.
