# Creature artwork handoff

Generated from [CREATURES.md](../CREATURES.md) using the built-in image-generation tool, November 2026. Review at [creature-art.html](../../creature-art.html): native size beside the actual 22-pixel skier, selectable poses, optional 3× nearest-neighbour zoom.

The original delivery was art only; Claude has since integrated it into the Creature Lab and normal-play spawning. This delivery does not change behaviour or tuning. New round-two sprite sheets remain an art handoff for approval/integration; the requested death cards are installed. See [round-two handoff](ROUND2.md) and [animated native previews](../../creature-art-round2.html). Existing Dragon, Stone Ram and Kitsune identities are preserved unchanged.

Each directory contains:

- `source.png`: original generated image, retained for future edits.
- `native.png`: game-palette, nearest-neighbour native sprite sheet, transparent gutters.
- `frames.json`: explicit source rectangles, native atlas rectangles, body bounds, names and anchors. Read these rectangles; never infer grid coordinates from source dimensions.
- `prompt.txt`: exact generation prompt; `spec.json` and `generation.json` record requested layout and generation provenance.

`frames[].x/y/w/h` selects a full padded frame in `native.png`. `bodyBounds` is relative to that frame. `anchor` is the bottom-centre registration point, in frame coordinates. Keep this anchor fixed while changing poses. Only body bounds should inform collision; never the padded rectangle. The existing three reused sheets retain their earlier metadata format (`cell`, `frames`, `bodyBounds`); their anchor is `[cell/2, cell-8]`.

These are authored key poses, **not a promise of smooth animation just by playing them in sequence**. Flying/galloping cycles have consecutive phases; wind-up/throw/recover and crouch/stand sequences need timing appropriate to the behaviour. Retain identity and size when interpolating or drawing intermediate motion. Do not mirror frames as a substitute for limb motion.

| Asset | Maximum native body | Included poses |
| --- | --- | --- |
| witch | 40×55 | Level, banks, potion wind-up, throw, recover |
| unicorn | 45×56 | Six gallop phases |
| medusa | 40×58 | Sit, look left/right, glare left/right, relax |
| hut | 80×90 | Stand, steps, lower, crouch, rise |
| giant | 100×120 | Rest, inhale, puff, blow, sustain, recover |
| kelpie | 45×58 | Six gallop phases, emerge, swim |
| troll | 45×55 | Idle, aim, two charge phases, recover, defeated |
| thunderbird | 60×65 | Six wing phases, two banks |
| gargoyle | 35×46 | Sleep, wake, two flight phases, land, defeated |
| wisps | 22×26 for group | Four poses, three flames per group |
| ghost | 28×38 | Two floats, reach, fade; **preserve translucent alpha** |
| griffin | 60×68 | Two circles, prepare, grab, two carry poses |
| cyclops | 80×100 | Reach, lift, low/high wind-up, throw, follow-through |
| phoenix | 50×62 | Six wing phases, ash, rebirth |
| genie | 40×62; lamp 18 wide | Lamp, emerge, crossed arms, grants, return |
| dragon | 83 wide | Existing approved four-pose source |
| mountain | 105 wide | Existing approved four-pose source |
| kitsune | 33 wide | Existing approved four-pose source |

Additional props: `witch-props` has three potion bottles and corresponding splashes; `medusa-props` has three petrified skiers, mirror shield, gargoyle plinth and stone ward; `cyclops-props` has boulders and fragments. Props use per-item native widths recorded in metadata.

Add ground shadows, wind, gaze cones, landing warnings, magic trails and lighting in the renderer. These effects are deliberately not baked into creature bodies. The ghost retains generated alpha; other native sheets use binary transparency for crisp pixel edges.

Optional reproducible bake: run `tools/bake-creature-art.cjs` with Playwright and Sharp available on `NODE_PATH`. It reads `generation-jobs.json`; originals and exact prompts remain untouched. Stage-map icons have explicit source row boundaries because the generated rows were not evenly spaced.
