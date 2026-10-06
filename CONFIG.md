# Frostline configuration

Edit `game-config.json`. The hosted game loads it on each refresh. For offline play, run `python3 build.py` after editing and reload `index.html`.

The file contains tuning data; collision algorithms, AI logic, pixel glyph shapes and renderer drawing instructions remain in JavaScript. Structural changes such as inventing a new object type still require code.

## Units and sections

World coordinates increase rightward and downhill. `world.unitsPerMetre` defaults to 10. Speeds are world units per second unless the property explicitly says `Kmh`. Durations are seconds. The HUD converts speed using `physics.hudKmhPerSpeed`. Ranges are `[minimum, maximum]`; probabilities are 0–1.

| Section | What it controls |
| --- | --- |
| `arcade` | All 12 numbered stage definitions, terrain, traffic, pursuit tiers/colors, missed-gate penalties, landing clearances and run-result duration |
| `courses` | Names, fees, lengths in metres, pace, gate spacing, obstacle density and type |
| `race` | Gate widths, required success fraction, point rewards, finish bonuses, choice rows and scenery placement |
| `mushroomHunt` | Mushroom count, required fraction, points, pickup size, spread, spacing clearances and glints in Spore Decisions |
| `timing` | Enable timing, maximum speed bonus, gold/par targets for each timed course, record revision and history length |
| `physics` | Acceleration, top speed, turning, walking, braking, ice, road slowdown, collisions and crash recovery |
| `controls` | Drag dead zone, drag scale, repeat interval and steering angle steps |
| `jump` | Manual/ramp/mushroom/rainbow airtime, height scaling, spin, boosts and cooldown |
| `world` | Random seed, terrain density, chunk sizes, cleanup distance, course sway, ice sizes and predator frequency |
| `village` | House count, corridor offsets, layout randomization, building bands, footprints, path widths/routing, squares, walkers, pets, lift and entry positions |
| `villageLife` | `buildings` (hotel count/floors and mixed building variants), rabbit and rare fox visits, harmless prop cooldowns, animal curiosity/fleeing, NPC social timing and dialogue |
| `houseAnimation` | Chimney smoke, opening doors, roof snow, awning movement, window flicker and muted trim palettes |
| `wildlife` | Impact speed/angle thresholds, defeated-predator fade duration, pack sizes, detection distances, chase/flee speeds, predator meals, avoidance, rescue reactions, impact thresholds and cat behavior |
| `pedestrians` | Stroll radius, walking speeds and durations, pauses, obstacle clearance, spectator range and step animation |
| `skiers` | Traffic speeds/frequency, aggressive skier aiming and taunt cooldowns |
| `politePursuit` | Number and speed of the persistent course yetis (three, at 42% of straight-down top speed) |
| `chasers` | Pursuer speeds, ambush sizes, capture distances, and recurring patrol-wave duration, interval, steering and speech |
| `lift` | Cable location, chairs, towers, ride duration and speed |
| `spawnTables` | Weighted object pools; repeated entries increase their probability |
| `dialogue` | Taunts, fear, thanks, collision remarks, greetings and cheers |
| `render`, `colors`, `palette` | View scale, camera, sprite colors, UI durations and trail retention |
| `atlas` | Sprite rectangles: `[atlasName, sourceX, sourceY, width, height]` |
| `simulation` | Fixed simulation step and maximum frame interval; normally leave unchanged |

## Useful examples

- Arcade difficulty: `arcade.stages` is at the top of the file. Entries are in play order and use metres, km/h, object counts per 100 m, and percentages. `treesPer100m`, `skierGroupsPer100m`, `endTrafficMultiplier`, `yetiGatePacePercent`, and `featureEveryGates` are the main tuning controls. See `ARCADE.md` for the field reference and condensed stage list.
- Arcade equipment: `arcade.gear.shieldsPerStage` defaults to 1.5. `swordGatesPerStage` is 4 and `swordGatesPerSword` is 8. Inventory caps are `maxShields` and `maxSwords` (2 each). The same object sets protection/effect duration and icon colors. Charges carry across stages; only successful gates add charge.
- Arcade traffic uses a separate schedule without ambient spawns in its corridor. `skierGroupsPer100m` sets opening traffic density, `skierPairPercent` adds pairs, and `endTrafficMultiplier` gradually raises density and overtaker frequency. `fastSkierPercent` chooses fast skiers; `snowboarderPercent` chooses snowboarders from the remaining traffic. `overtakeSeconds` is the opening overtaker interval. `treesPer100m` controls tree density; `featureEveryGates` places occasional forest features or the stage’s selected ice/jumps, with clear landing corridors.
- Make regular slalom timing more forgiving: increase `timing.targets.slalom.goldSeconds` and `parSeconds`, keeping gold below par.
- Reduce all speed prizes: lower `timing.maxBonus` (60 by default).
- Slow recovery: `physics.minimumCollisionKmh` (8) disables obstacle impacts at or below that HUD speed. Objects touched while creeping stay harmless until you fully clear them, even if you accelerate. Chasing predators can still catch a stopped player.
- Bear/yeti impacts: `wildlife.bearKnockoutKmh` and `yetiKnockoutKmh` are 65/85; `bearMaxImpactAngleDegrees` and `yetiMaxImpactAngleDegrees` are 45/10. Speed alone cannot override the angle limit. Successful impacts kill the animal; it fades over `predatorFadeSeconds`.
- Make wolves easier to hit: lower `wildlife.wolfKillKmh` (30 by default; the actual impact must be faster than the threshold).
- Less harassment: lower `skiers.fastAimWeight`, increase `fastSpawnSeconds`, or lower `ambientFastChance` and `courseFastChance`.
- More houses: increase `village.houseCount`; if placement space runs out, also expand `halfWidth`, `rows`, or spacing. `corridorOffsets` provides the baseline horizontal route at each building band; randomization mirrors, reverses, shifts, scales and perturbs this pattern. Houses never overwrite roads or each other, so a very large requested count can be limited by available space.
- Different towns: `village.randomization` controls bend/width variation, row spacing, house counts and jitter, courtyard gaps, plaza count, and lift-station offsets. `enabled: true` and `seed: 0` generate fresh layouts each time a village is created; layouts stay fixed while you ski through them. A positive `seed` makes the layout sequence reproducible from the summit (resident activity remains independent). Set `enabled: false` for the original planned arrangement. Changes to row spacing automatically shift the town exit, lift, and course-choice row together.
- Town road surfaces: `village.mainRoadSurface` controls the main street and lift approach (`snow` by default, or `paved`). `snowRoadColors` contains the bank, packed-snow, highlight and track colors. Snow takes precedence over paving where routes cross.
- Longer village: expand its row layout and move `stationY`, `roadEndY`, `choiceTitleY`, `choiceY`, and `endOffset` down together. Keep the choice row below the houses and the village end below the choices.
- Ski-patrol punishment: `chasers.ambushCount.patrol` is 4. `chasers.patrolWaves.durationSeconds` is 120 and `intervalSeconds` is 5. The same section controls overtaking speed, lateral steering, lane spacing, pass lifetime and speech timing. `dialogue.patrolTaunts` contains the unpaid-ticket heckles. Course exits and finishes do not cancel waves.
- Fewer wolf encounters: lower `world.wolfShareOfPredators`, increase `wildlife.packSpawnSeparation`, or reduce `wildlife.packLimit`. Packs retain their configured 3–4 members.
- Fewer rabbits: remove rabbit entries from `spawnTables.human` / `wild` or add more copies of other objects.
- Preserve comparable best times after a substantial change: increment `timing.recordVersion`. Wallets remain intact.

Saved data uses the browser's `frostline-v2` local-storage key. `times[courseId]` contains the personal best, last attempt, and bounded attempt history; each history item has time, gate or mushroom results, crashes, payment status, speed bonus, date, and rules signature. Failed/unpaid attempts are recorded but never become qualifying best times.

Local-file and hosted versions have separate browser storage origins. Publishing does not move the offline wallet or records to the hosted site.

Arcade gear uses `calmSwordGatesPerStage` (1) for stages without starting or missed-gate yetis, and `swordGatesPerStage` (4) when either threat is present. `swordGatesPerSword` (8) controls the charge needed for one sword. Stage order is the order of `arcade.stages`.

Starting Arcade yetis wait beside the visible start line. `startLineSideOffsetMetres`, `startLineRowOffsetMetres`, `startLineDownhillOffsetMetres`, and `wakeSeconds` control staging. Each stage’s `yetiGatePacePercent` controls starting pursuit as a percentage of the slowest calculated clean gate leg; `missYetiGatePacePercent` does the same for missed-gate pursuers. These are not percentages of straight-down top speed. `pursuitTurnAllowanceSeconds` adds steering time per leg and `finishApproachGateSpacings` reserves finish approach room. Run `python3 calculate-pursuit.py` for the resulting speeds. `campaignVersion` separates records after major redesigns while retaining the previous record.
