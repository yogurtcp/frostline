# Frostline configuration

Edit `game-config.json`. The hosted game loads it on each refresh. For offline play, run `python3 build.py` after editing and reload `index.html`.

The file contains tuning data; collision algorithms, AI logic, pixel glyph shapes and renderer drawing instructions remain in JavaScript. Structural changes such as inventing a new object type still require code.

## Units and sections

World coordinates increase rightward and downhill. `world.unitsPerMetre` defaults to 10. Speeds are world units per second unless the property explicitly says `Kmh`. Durations are seconds. The HUD converts speed using `physics.hudKmhPerSpeed`. Ranges are `[minimum, maximum]`; probabilities are 0–1.

| Section | What it controls |
| --- | --- |
| `courses` | Names, fees, lengths in metres, pace, gate spacing, obstacle density and type |
| `race` | Gate widths, required success fraction, point rewards, finish bonuses, choice rows and scenery placement |
| `timing` | Enable timing, maximum speed bonus, gold/par targets for each slalom, record revision and history length |
| `physics` | Acceleration, top speed, turning, walking, braking, ice, road slowdown, collisions and crash recovery |
| `controls` | Drag dead zone, drag scale, repeat interval and steering angle steps |
| `jump` | Manual/ramp/mushroom/rainbow airtime, height scaling, spin, boosts and cooldown |
| `world` | Random seed, terrain density, chunk sizes, cleanup distance, course sway, ice sizes and predator frequency |
| `village` | House count, corridor offsets, planned building bands, footprints, path widths/routing, squares, walkers, pets, lift and entry positions |
| `houseAnimation` | Chimney smoke, opening doors, roof snow, awning movement, window flicker and muted trim palettes |
| `wildlife` | Pack sizes, detection distances, chase/flee speeds, predator meals, avoidance, rescue reactions, impact thresholds and cat behavior |
| `skiers` | Traffic speeds/frequency, aggressive skier aiming and taunt cooldowns |
| `chasers` | Yeti/dog/patrol speed ratios, ambush sizes and capture distances |
| `lift` | Cable location, chairs, towers, ride duration and speed |
| `spawnTables` | Weighted object pools; repeated entries increase their probability |
| `dialogue` | Taunts, fear, thanks, collision remarks, greetings and cheers |
| `render`, `colors`, `palette` | View scale, camera, sprite colors, UI durations and trail retention |
| `atlas` | Sprite rectangles: `[atlasName, sourceX, sourceY, width, height]` |
| `simulation` | Fixed simulation step and maximum frame interval; normally leave unchanged |

## Useful examples

- Make regular slalom timing more forgiving: increase `timing.targets.slalom.goldSeconds` and `parSeconds`, keeping gold below par.
- Reduce all speed prizes: lower `timing.maxBonus` (60 by default).
- Make wolves easier to hit: lower `wildlife.wolfKillKmh` (30 by default; the actual impact must be faster than the threshold).
- Less harassment: lower `skiers.fastAimWeight`, increase `fastSpawnSeconds`, or lower `ambientFastChance` and `courseFastChance`.
- More houses: increase `village.houseCount`; if placement space runs out, also expand `halfWidth`, `rows`, or spacing. `corridorOffsets` specifies the horizontal center of the ski route at each building band; its pattern repeats if there are more rows than entries. Houses never overwrite roads or each other, so a very large requested count can be limited by available space.
- Longer village: expand its row layout and move `stationY`, `roadEndY`, `choiceTitleY`, `choiceY`, and `endOffset` down together. Keep the choice row below the houses and the village end below the choices.
- Fewer wolf encounters: lower `world.wolfShareOfPredators`, increase `wildlife.packSpawnSeparation`, or reduce `wildlife.packLimit`. Packs retain their configured 3–4 members.
- Fewer rabbits: remove rabbit entries from `spawnTables.human` / `wild` or add more copies of other objects.
- Preserve comparable best times after a substantial change: increment `timing.recordVersion`. Wallets remain intact.

Saved data uses the browser's `frostline-v2` local-storage key. `times[courseId]` contains the personal best, last attempt, and bounded attempt history; each history item has time, gate results, crashes, payment status, speed bonus, date, and rules signature. Failed/unpaid attempts are recorded but never become qualifying best times.

Local-file and hosted versions have separate browser storage origins. Publishing does not move the offline wallet or records to the hosted site.
