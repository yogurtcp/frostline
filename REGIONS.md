# Endless areas

The playlist is `game-config.json` → `endless.regions`. Areas join without ending the run. Existing pursuers stay alive across boundaries. Arcade layouts and town cadence are unchanged.

Default sequence: **beginner → quiet → tree corridors → lake → quiet → town → quiet → cemetery → dense forest → regular forest**, then repeat.

| Config kind | Base length | Core challenge | Gates |
| --- | --- | --- | --- |
| `beginner` | 320–400 m | Open snow with 65→140 people/skiers. A regular Yeti introduces panic and NPC hunting. No solid scenery in the field. | Normal slalom |
| `quiet` | 180–250 m | A few trees at the sides, open snow and time to straighten up. | None |
| `trees` | 900–1,200 m | Existing long bends, forks, alternating gates and dense tree banks. | Weaving gates |
| `lake` | 240–330 m | Huge clear ice: set a heading, coast, then regain control on the quiet snow afterward. | None |
| `town` | 900–1,200 m | Actual Arcade-style village, narrowing street, pedestrians and back route. | Entry/exit only |
| `cemetery` | 650–850 m | Winding lanes between tombstones and small mausoleums. Slow zombies replace residents and close in when you slow down or fall. | Entry/exit only |
| `denseForest` | 110–160 m | A short thick stand of trees with a narrow winding passage. Concentrate on threading through or jumping. | None |
| `forest` | 300–450 m | Ordinary sparse forest, slalom, traffic, smaller random lakes and occasional hills/rainbows. | Normal slalom |

Lengths scale with entry pace. They stay fixed for a visit, as does that visit's difficulty. Repeated crowds increase population, cemeteries narrow from 16 toward 9 base metres with more/faster zombies, dense forests narrow their clear passage and add trees, and regular forest density rises. Town and corridor progression retain their existing settings. Quiet glades and clear lakes remain relief rather than adding hazards.

`regions.order` can reorder or repeat any kind. `regions.lengthMetres` controls the new area lengths; `endless.encounters.lengthMetres` still controls towns and long tree corridors. `regions.gapMetres` can add ordinary connector terrain. `regions.enabled: false` restores the preceding town/tree schedule.

`beginnerPeople` is [65,140]. `quietTreesPer100Metres` is 1.5 and `forestTreesPer100Metres` is [12,26]. `cemeteryOpeningMetres` is [9,16] in late/first order, matching the existing opening configuration convention. `zombies.count` is [40,95], `speedKmh` is [7,11], and `noticeMetres` is 65. Owned zombie motion uses the same pace scaling and slower uphill/horizontal projection as other hunters. Zombies that engage keep pursuing after leaving the cemetery. Living predators do not treat undead as edible prey.

There are no new predator placements in quiet areas, clear lakes, dense forests, cemeteries or towns; authored zombies are the cemetery's threat. Existing enemies can follow through. Monsters stay off ice. Zombies can catch a stopped/fallen player, but jumps, swords and genuine full-speed rams work against them. Tombstones can be jumped; mausoleum roofs retain building collisions.

Full-speed rams require actual overlap, player motion into contact above 85% of normal top speed (and the species threshold), and enough relative closing speed. A matched-speed touch or a pursuer catching the player from behind does not kill the enemy. The global tuning is `wildlife.ramSpeedFraction`; existing wolf/bear/Yeti thresholds remain 30/65/85 km/h. Zombies use the wolf closing-speed threshold.

No saved record version was reset for this expansion. Wallet, settings and the current Endless best stay intact.

## Possible additions

These are suggestions, not active area types:

- **Wind pass:** gentle alternating gusts push the skier sideways through otherwise open terrain; anticipation matters more than obstacle density.
- **Jump meadow:** optional chains of hills offer faster routes, while occasional gate placements reward staying grounded and choosing a line.
- **Frozen river:** narrow snow crossings and short slippery ice shortcuts create a choice between precise steering and committing to an angle.
