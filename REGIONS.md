# Endless areas

The playlist is `game-config.json` → `endless.regions`. Areas join without ending the run. Existing pursuers stay alive across boundaries. Arcade layouts and town cadence are unchanged.

The first **450 metres use the original gentle opening**. Then the normal sequence is **town → quiet → tree corridors → lake → quiet → cemetery → dense forest → regular forest → wild patch → quiet**, repeating. Wide crowd encounters are inserted randomly farther downhill without skipping the next normal area.

| Config kind | Base length | Core challenge | Gates |
| --- | --- | --- | --- |
| `crowd` | 320–400 m | Rush Hour Slope: a broad, busy field with skiers across every lane, hunting Yetis and tree banks along both edges. Appears randomly later. | Normal slalom |
| `quiet` | 180–250 m | Snowy Trail: continues the actual town-exit snow road, with scattered nearby trees, a few walkers, slow skiers, a bench/lamp and snowman. Sparse woods continue off the path. | None |
| `trees` | 900–1,200 m | Existing long bends, forks, alternating gates and dense tree banks. | Weaving gates |
| `lake` | 240–330 m | Huge clear ice: set a heading, coast, then regain control on the quiet snow afterward. | None |
| `town` | 900–1,200 m | Actual Arcade-style village, narrowing street, pedestrians and back route. | Entry/exit only |
| `cemetery` | 650–850 m | Winding lanes between iron-fenced burial gardens, stone gateposts, varied monuments and small mausoleums. Five zombie designs close in when you slow down or fall. | Entry/exit only |
| `denseForest` | 110–160 m | A short thick stand of trees with a narrow winding passage. Concentrate on threading through or jumping. | None |
| `scramble` | 70–110 m | Wild Patch: short randomized scatter of several tree species, rocks, stumps, bushes, sleds, small jumps and skier/boarder traffic. Find a gap or jump; no reserved centre corridor. | None |
| `forest` | 300–450 m | Ordinary sparse forest, slalom, traffic, smaller random lakes and occasional hills/rainbows. | Normal slalom |

Lengths scale with entry pace. They stay fixed for a visit, as does that visit's difficulty. Repeated crowds increase population, cemeteries narrow from 16 toward 9 base metres with more/faster zombies, dense forests narrow their clear passage and increase tree density 1→2×, and regular forest density rises. Town and corridor progression retain their existing settings. Snowy trails and clear lakes remain relief; trail traffic stays light rather than increasing with visits.

`regions.order` can reorder or repeat any kind. `denseForestDensity` [1,2] sets first/final-visit tree density for Close Pines; the original first-visit geometry stays intact. `scrambleDensity` [1,1.35] separately controls Wild Patch scatter. Both freeze difficulty within a section and grow between visits. Wild Patch and Close Pines are separate kinds with independent visit counts. After a town, Snowy Trail extends that town’s existing approach road along the skier’s approach, then gently rejoins the course centre. Its width stays at Arcade’s 64 units, including later visits; it does not narrow with the town. Only its immediate path strip is cleared, so leaving it does not expose a large empty region. `regions.lengthMetres` controls the new area lengths; `endless.encounters.lengthMetres` still controls towns and long tree corridors. `regions.gapMetres` can add ordinary connector terrain. `regions.enabled: false` restores the preceding town/tree schedule.

`regions.crowd` controls random crowds: first eligible after 1,200 m, 55% chance at a safe transition, at least 1,600 m after the previous crowd ends, and forced at the next eligible transition after 4,200 m. Eligible transitions follow quiet/open forest, so crowds do not interrupt ice exits. Set chance to 0 to disable random crowds. Width is roughly 240 base metres, scaled with entry pace; the slope is centred on the approach, populated out to both edges and bounded by dense tree banks. Population grows 200→420 per field, scales with configured width and is capped at 600. `regions.lengthMetres.crowd` controls length. The old `beginner`/`beginnerPeople` settings remain accepted as legacy explicit-layout options. `quietTreesPer100Metres` is 8 and `forestTreesPer100Metres` is [12,26]. `cemeteryOpeningMetres` is [9,16] in late/first order, matching the existing opening configuration convention. `zombies.count` is [40,95], `speedKmh` is [7,11], and `noticeMetres` is 65. Owned zombie motion uses the same pace scaling and slower uphill/horizontal projection as other hunters. Zombies that engage keep pursuing after leaving the cemetery. Living predators do not treat undead as edible prey.

There are no new predator placements in quiet areas, clear lakes, dense forests, Wild Patches, cemeteries or towns; authored zombies are the cemetery's threat. Crowds can add a Yeti when the nearby hunter budget allows. Existing enemies can follow through. Monsters stay off ice. Zombies can catch a stopped/fallen player, but jumps, swords and genuine full-speed rams work against them. Tombstones and iron fences can be jumped; fences have real openings and block grounded skiers and creatures. Mausoleum roofs retain building collisions. Zombie art has five silhouettes and gaits: frozen hiker, gravedigger, skeleton, shrouded figure and crawler. Their configured movement speed and catch rules remain shared. Static cemetery art is cached. Zombies far beyond the visible area still pursue, but their obstacle-avoidance steps are staggered at roughly four updates per second; nearby zombies update every simulation step.

Player-initiated rams require actual swept body contact, near-full speed for the current steering angle, and genuine approach/closing motion above `physics.minimumCollisionKmh` (8). The original wolf/bear/Yeti speed gates (30/65/85 km/h) remain, capped at the attainable normal speed for the current heading; `wildlife.ramSpeedFraction` is .85. Perfect centre aim is not required, and collision checks keep the player's original impact motion even if another collision has just knocked them down in the same frame. A matched-speed touch or a pursuer catching the player from behind does not kill the enemy. Previously fallen players do not acquire a ram attack. Sleeping/waking/waiting monsters remain collidable, including fast glancing contacts between samples. Slower solid hits on those bodies crash the skier instead of only reducing speed. Jumps still clear them. Old bear/Yeti aiming-cone settings remain accepted for config compatibility.

No saved record version was reset for this expansion. Wallet, settings and the current Endless best stay intact.

## Possible additions

These are suggestions, not active area types:

- **Cemetery bell gates:** a shortcut through a narrow opening rings a bell and wakes nearby graves; a longer open route avoids the alarm. Suggested mechanic only, not active.
- **Wind pass:** gentle alternating gusts push the skier sideways through otherwise open terrain; anticipation matters more than obstacle density.
- **Jump meadow:** optional chains of hills offer faster routes, while occasional gate placements reward staying grounded and choosing a line.
- **Frozen river:** narrow snow crossings and short slippery ice shortcuts create a choice between precise steering and committing to an angle.
