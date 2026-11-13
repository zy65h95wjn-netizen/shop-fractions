# Read-only R12 review

Reviewed commit `76cc6f11cff4cf77bd3d6e1eb34880246b23e9e7` before implementation. Work then began on `experiment/r13-motion`, based directly on that commit. Production files are unchanged.

R12 has one fixed 120 Hz spring solver feeding WebGL and Canvas. Six nodes, two followers, impacts and waves drive the existing masks. Grab-and-hold constrains captured nodes; rendering-only boundary guards protect Ember's crease, Midnight's lower fold and Aurelia's upper-left/edge regions. Character switching resets transient state and restores that character's physics profile.

The insertion point is the existing animation loop immediately before each solver step. Optional input may add bounded node velocity but must not retune the solver, integrate on a second timer, replace the renderer, or generate contact pressure. The original impulse helpers have character-specific direction biases; bounceBoth can trigger Santa's laugh. Therefore sensor/automatic input does not call slap, bounceBoth, sound, laugh or contact-wave routines.

Device-motion permission must be requested directly from a user click. Persisting a user's preference must not be treated as persisting browser permission. Sensor listeners can be removed entirely when disabled or hidden. Auto timing can use the existing simulation clock with no interval or additional animation loop. A quiet period after touch protects the existing release/flick.

Existing regression entry points: the R12 browser harness, the R12 grab-and-hold promotion/offline suite, the read-only debug snapshot and injected test hooks. Tests need to compare candidate and baseline states and rendered frames with both features off; sensor/UI tests should be synthetic and clearly distinguished from physical-iPhone validation.
