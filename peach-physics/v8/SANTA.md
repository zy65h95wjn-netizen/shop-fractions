# Santa's belly — experimental branch

Santa Claus is character **5/5** in `feat/santa-belly-physics`, based on approved live r10 commit `46738952269e3efe7044dfe24df2256d5c240155`. This is a visual experiment, not a production release. Main and live r10 remain unchanged.

Open `index.html?character=santa` to start with Santa. The existing selector cycles through all five characters. Natural, Playful, Chaos, Bounce strength, Softness, Settling and gestures remain available. Santa's Linked movement controls secondary coupling within one coherent belly; it does not divide the belly into independent halves.

## Source preservation

The user explicitly approved using the supplied JPEG unchanged after it arrived as JPEG rather than PNG. `assets/santa-claus.jpg` is the exact 345,107-byte, 1024×1280 attachment. No conversion, retouching, regeneration or recompression was performed.

SHA-256: `0c081474e67e0f5a94a12fdce68f712884933485a21082d45b9c36188cfea5ed`

All four previous portrait hashes also pass. Holly's r10 framing and Strong Fabric B remain unchanged, as do Winter Ember, Midnight Yule and Aurelia Frost.

## Independent calibration

The existing fixed 1/120-second six-spring solver, pointer captures and masked backward texture flow are reused. Santa's frequency is `1.65 − .007 × softness` Hz, with damping ratio `.12 + .0025 × settling`. A 78% shared carrier and 22% local field produce a single heavy belly with smaller secondary ripples. Slow followers provide delayed motion; measured finger velocity controls directional flicks.

A traced skin-only envelope fades over 78 source pixels inside the silhouette, with a smooth carrier limit approaching 48 source pixels. Beard, hands, fur, coat, belt and background remain outside the deformation. Both renderers use six short backward-flow steps through this fixed mask. Canvas interpolates the smooth velocity field on an 8-source-pixel grid, retaining native source-pixel texture sampling. The source art is never stretched to fit the viewport.

| Preset | Bounce | Softness | Settling | Tap peak time | Carrier peak travel |
| --- | ---: | ---: | ---: | ---: | ---: |
| Natural | 60 | 62 | 62 | 0.200 s | 23.51 source px |
| Playful | 80 | 76 | 44 | 0.225 s | 31.52 source px |
| Chaos | 98 | 90 | 28 | 0.250 s | 38.48 source px |

These are simulated center-carrier measurements for a controlled left tap, not physical force or device frame-rate measurements. All presets rebound and return to an exact resting frame after 15 simulated seconds in the browser checks.

## Optional laugh and sound

Enable **Belly laugh** in Santa's controls for three synchronized upward belly pulses and `HO HO HO!`. Enabling it previews the laugh; **Bounce belly** replays it while enabled. Reset and character switching cancel the sequence. **Sound** is separately opt-in and defaults off.

The chuckle is original Web Audio synthesis: three pitched, filtered oscillator pulses, scheduled with the visual simulation. It needs no recording, speech service, downloaded voice or network. It is a playful synthetic chuckle, not a realistic spoken Santa performance. The browser test verifies three oscillator starts on a running audio context. Physical iPhone output volume, silent-mode behavior and Safari activation still need device review.

## Validation

Serve the repository root on localhost port 8000. Tests use the existing Playwright harness and Chromium. `CHROMIUM` and `PEACH_TEST_URL` override defaults. Artifacts default to `/tmp/peach-v8-tests`; `PEACH_TEST_OUTPUT` can change the test-output directory.

```sh
node peach-physics/v8/tests/artwork.cjs
node peach-physics/v8/tests/santa-regression.cjs
node peach-physics/v8/tests/santa-physics.cjs
node peach-physics/v8/tests/santa.cjs
node peach-physics/v8/tests/santa-runtime.cjs
python3 peach-physics/v8/tests/santa-evidence.py
```

- **945 r10 regression checks:** all four previous characters, both renderers, all three presets, slap/drag/flick, both sides, linked movement 0/50/100. Exact rendered frames, unrounded spring trajectories and framing match r10. Five viewports include landscape.
- **10,828 numerical checks:** independent presets, peak/rebound/settling, repeated maximum impulses at minimum damping, bounded state and sampled flow Jacobians. Minimum sampled extreme-pose determinant **0.3849**; maximum travel **47.28 source px**. Finite samples are not a proof for every possible interaction.
- **167 Santa browser checks:** both renderers, all presets and phases; exact stationary samples from beard, both hands, coat, belt, background elf and scenery; original aspect ratio and visible face/belly at 375×667, 390×844, 430×932, 440×956 and 844×390; profile isolation; laugh/reset behavior. Native CDP multi-contact input verifies simultaneous captures, two releases/flicks, same-side contacts and cancellation. This uses browser-native touch, not JavaScript-dispatched pretend touches, but does not replace physical-device testing.
- **29 live-runtime checks:** real animation loop, served JPEG hash, fifth slot, three audio pulses on a running context, offline reload, offline switching among all five characters, saved options, and preservation of the r10 cache.
- All five source-art hashes, JavaScript syntax and `git diff --check` pass. No browser errors were recorded.

Machine-readable results are in [tests/santa-results](tests/santa-results/) and [capture results](tests/captures/santa/results.json).

## Visual evidence

[Open the evidence gallery](tests/captures/santa/index.html).

- Phase sheets: [WebGL](tests/captures/santa/webgl-phases.jpg) · [Canvas](tests/captures/santa/canvas-phases.jpg)
- Framing: [five viewports](tests/captures/santa/framing.jpg) · [phone screenshot](tests/captures/santa/webgl-phone.jpg)
- Actual rendered motion: [WebGL Natural](tests/captures/santa/webgl-natural.mp4), [Playful](tests/captures/santa/webgl-playful.mp4), [Chaos](tests/captures/santa/webgl-chaos.mp4); [Canvas Natural](tests/captures/santa/canvas-natural.mp4), [Playful](tests/captures/santa/canvas-playful.mp4), [Chaos](tests/captures/santa/canvas-chaos.mp4).

Each silent clip contains 75 consecutive renderer captures at 1/30-second simulation intervals (2.5 seconds). They show actual engine output, not generated animation; they are not real-time device-performance recordings. The sheets separately show rest, impact, peak, rebound, settling and exact settled output.

## Offline and preview

The app precaches the new JPEG along with existing local runtime assets. Its cache is `peach-physics-santa-experiment-r1`; activation removes only older Santa-experiment caches, never live r10's cache. No runtime services are required after initial loading.

The review link uses the pushed commit's immutable public source through GitHack, leaving GitHub Pages and production untouched. GitHack may show **Open the page** on the first visit. External portrait loads use anonymous CORS requests so CDN redirects remain valid WebGL textures; the bytes and same-origin behavior are unchanged. Preview-host availability is external to the app. The normal app's offline behavior is tested independently on secure localhost; the exact public preview is checked after push.

## Known limits and approval gate

This remains a two-dimensional photo deformation: the silhouette and supported edges are pinned, and no hidden geometry is invented. Canvas can be slower on older phones. In this software-rendered cloud environment, observed WebGL frame rate varied substantially (roughly 4–12 fps under test load); the optimized Canvas path measured roughly 20–22 fps, compared with about 12 before optimization. These are not iPhone measurements and do not establish hardware WebGL speed.

Physical iPhone Safari feel, sustained frame rate, real two-finger gestures, sound and Add-to-Home-Screen offline reopening require the user's review. **Do not merge or deploy to production until visual approval.**
