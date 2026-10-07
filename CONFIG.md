# Frostline configuration

Edit `game-config.json`. For local tuning, run `python3 serve.py` in this folder and open http://127.0.0.1:8765/. Every reload reads the JSON directly; no rebuild is needed for config edits. The hosted game also reads it on refresh.

Opening `index.html` through `file://` uses its embedded snapshot: browsers restrict reading adjacent local files. To update that standalone snapshot, run `python3 build.py`, then reload. Localhost and file URLs have separate browser saves (wallet and records); switching addresses does not transfer them. Code/schema edits still require a build.

Zero Yeti speed is allowed and means stationary. A nonzero count does not automatically assign a chase speed.

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

- Arcade stage editor: `arcade.stages` is in play order, with arbitrary names. Each entry explicitly sets player speed, gate layout, two yeti groups, three rarity-tier spawn rates and optional per-object overrides. See `ARCADE.md` for a complete copyable stage and all keys.
- Arcade equipment: each stage’s `gates.swordGateCount` selects the number of sword gates. `arcade.gear.shieldsPerStage` controls shield yield, `swordGatesPerSword` controls sword charge, and `maxShields` / `maxSwords` cap inventory.
- Arcade item density: `arcade.itemTiers` assigns each of the 59 objects to `common`, `slightlyRare` or `veryRare`; each stage's `tierRates` sets the per-100m rate for each tier, and `itemRates` overrides single objects (0 disables; omission uses the tier rate). `skier`, `fastSkier`, `boarder` and `overtakingSkier` are separate, and `endTrafficMultiplier` increases their density toward the finish. Other object densities stay constant. Safe gate openings and landing clearances can reduce actual placement.
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



Arcade starts: `startStage` is 1-based; `autoStart: true` loads directly above that stage’s start. Starts above 1 are practice and do not overwrite records. `yeti` specifies `count`, `color` and absolute `speedKmh`; `missedGateYetis` specifies `gatePercent` (share of gates guarded by one sleeping penalty yeti), `color` and absolute `speedKmh`; no automatic speed calculation applies.
