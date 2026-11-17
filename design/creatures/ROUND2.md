# Round-two artwork handoff

All items in [CREATURE-ART-REQUESTS.md](../CREATURE-ART-REQUESTS.md) are delivered. [Native-size animated review](../../creature-art-round2.html), including day/night death cards. Generated using the built-in image-generation tool; exact prompts and originals are preserved in each asset directory. Full job specification: [generation-jobs-round2.json](generation-jobs-round2.json).

## Runtime status

The eight death cards are copied into `assets/scenes/` and registered in `manifest.json`; the existing game code chooses them automatically for Ghost, Gargoyle, Troll and Baba Yaga deaths in day/night. They are 320×200 indexed PNGs with at most64 colours. Night images were created as lighting edits of the matching daylight composition.

The thirteen sprite/effects sheets below are **art assets for approval and integration**, as the creature-art guide requests. No creature behaviour, spawn tuning, controls or runtime sprite choices are changed here. The preview page animates the delivered key poses independently of the current Creature Lab renderer. Preserve Claude's latest mechanics when integrating them.

## Sheets

Each `design/creatures/<name>/` has `source.png`, `native.png`, `prompt.txt`, `spec.json`, `generation.json` and `frames.json`. Use explicit frame rectangles and anchors; never divide the source sheet into assumed equal cells. Source registration can differ from native atlas layout.

| Sheet | Frames in metadata order | Native body limits |
| --- | --- | --- |
| hut-run | Left contact, left push-off, flight/right lead, right contact, right push-off, flight/left lead | 80×90; six-phase run |
| troll-bridge | Four camera-facing walk phases, side-step left, side-step right, palm-out toll | 45×55; seven frames, unused last source cell |
| bridge | Plank/rope-rail deck, left gorge edge, right gorge edge | 120×64 deck;64×96 edges |
| gargoyle-hunt | Four chase wingbeats, screech, claws-out lunge | 35×46 |
| wisp | Four single-flame flickers | 10×12, one flame per frame |
| phoenix-fire | Four spinning fireballs, four growing/fading impact phases, two wet-blue ice patches | 10×10 fireballs;30×20 maximum burst;80×110 patches |
| genie-magic | Four expanding/clearing poofs, four crackling ground spell rings | 40×40 smoke;40×20 rings |
| petrified | Running Yeti, four-legged bear, four-legged wolf, walking person without skis | Widths30,30,22,15, matching the live cast's approximate rendered scale |
| lightning | Fork bolt, flash, fade, crackling target ring, scorch mark | 16×90 bolt;48×26 ring;40×28 scorch |
| unicorn-kick | Rearing, back kick | 45×56 |
| kitsune-tumble | Trip forward, roll on back, recover roll, dizzy sit | 33×40 |
| griffin-carry-skier | Carry/wings up, carry/wings down, each including the dangling red-jacket skier | Combined60×80 |
| giant-wind | Thin streak, curled gust, snow streak, taper | 24×6 |

Native maxima are bounding limits, not instructions to stretch every pose. A fade/spark frame is deliberately smaller than a peak. `frameTargets` in the job spec records mixed-size effect targets; bodies in ordinary animation cycles share a single scale.

## Drawing and animation

- `frames[].x/y/w/h`: padded native atlas rectangle. `bodyBounds`: relative opaque-body rectangle. `anchor`: bottom-centre registration point in frame coordinates. Draw at `screenPosition - anchor`; keep registration when selecting another pose.
- `animationGroups` names the loops and frame sequences, with suggested preview FPS. These are art-preview timings; gameplay warning/lunge/impact timers remain owned by the mechanic. Toll, screech, kick and lunge are separately selected poses, not extra walk-loop phases.
- Bridge tiles have `repeatAxis: "y"` and an **absolute atlas** `tileRect`. Repeat `tileRect`, not the padded frame. Top/bottom edge pixels are matched for vertical repetition. Gorge source crops explicitly exclude neighboring tile fragments; do not recrop from equal source thirds.
- Native sprites use transparent gutters and binary alpha. Keep image smoothing off. Add light, shadows, motion, warning timing and collision in the renderer; the art is not collision geometry.
- Phoenix ice patches are flat ground decals with slushy/steaming edges; target rings have transparent centres. Giant wind sprites are small particles. Do not stretch a tiny effect into a large opaque overlay.
- Griffin carry frames already include the player: hide the separately rendered carried player while using them. Preserve existing protection and landing mechanics.
- For petrification select the matching creature frame, not one of the skier statues. Rescale only if a particular live creature variant has a different display size.

## Death cards

`death-ghost{,-night}`, `death-gargoyle{,-night}`, `death-troll{,-night}`, `death-baba-yaga{,-night}`. Sources/prompts/specs/native exports are retained in `design/scenes/creature-round2/<key>/`. Render captions with the existing game text; there is no baked text or gore in the illustrations.

## Rebuild artwork and preview

With `playwright` and `sharp` available to Node:

```
node tools/bake-creature-art.cjs --jobs design/creatures/generation-jobs-round2.json
python3 tools/build-creature-round2-gallery.py
```

`--only <name>` bakes a single sheet. The baker never regenerates or overwrites source artwork. It performs measured cropping, nearest-neighbour reduction, game-palette mapping, indexed64-colour death-card export, and tile-edge registration. Normal game builds use the committed PNGs and need no image-generation dependencies.
