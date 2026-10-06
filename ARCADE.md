# Arcade stage editor

## Rollback and design intent

The gate-pace pursuit calculation and the faster/wider changes to stages 3–4 were reverted. Their defaults are back to 103 km/h and 30 m vertical gate spacing. Yeti speeds are now explicit absolute values; there are no calculated chase-speed caps or automatic adjustments.

Player feedback to preserve: two warmups are enough; stage 2 needs more objects; stage 3 needs visible start-line yetis and sparse trees; stage 4 needs denser trees; stage 5 sparse trees, stage 6 dense trees and stage 7 heavier traffic. There are 12 stages, editable in order, with safe towns between them. No menus. Missing the finish fails Arcade in place; death returns to the summit.

## Quick start

Edit `game-config.json`, at the top under `arcade`.

```json
"startStage": 8,
"autoStart": true
```

This loads you just above stage 8’s start line, waiting for your input. Death/reset starts there again. `autoStart: false` keeps the summit; the Arcade entrance still uses `startStage`. Set `startStage: 1` for a complete run. Starts above 1 are visibly marked PRACTICE and do not overwrite the full-run record. Completion is based on reaching the last configured stage, including in practice.

For local `file://` play, run `python3 build.py` from this folder after editing, then reload `index.html`. Hosted play reads the JSON on refresh. Validation reports unknown item names, out-of-range values, an invalid start stage, or more sword gates than total gates.

## Add or edit a stage

Copy any entry in `arcade.stages`, change `name`, and insert it where you want. Array order defines progression; there is no fixed stage count or hardcoded name list. A compact complete stage can look like this (omitted item densities mean zero):

```json
{
  "name": "My snowy disaster",
  "topSpeedKmh": 103,
  "gates": {
    "count": 18,
    "horizontalDistanceMetres": 26,
    "verticalDistanceMetres": 30,
    "openingWidthMetres": 15.6,
    "firstGateMetres": 40,
    "finishAfterLastGateMetres": 50,
    "swordGateCount": 4
  },
  "yeti": { "count": 3, "color": "teal", "speedKmh": 60 },
  "missedGateYetis": { "count": 0, "color": "orange", "speedKmh": 75 },
  "itemSpreadMetres": 32,
  "endTrafficMultiplier": 1.5,
  "itemsPer100m": {
    "pine": 2,
    "rock": 0.5,
    "skier": 3,
    "fastSkier": 0.5,
    "overtakingSkier": 0.2,
    "boarder": 1,
    "ramp": 0.2,
    "rabbit": 0.1
  }
}
```

### Gates

- `count`: exact total number of gates, including sword gates.
- `horizontalDistanceMetres`: exact horizontal distance between alternating gate centres. 26 means centres alternate at −13 m and +13 m. There is no added course sway.
- `verticalDistanceMetres`: exact downhill distance between consecutive gates.
- `openingWidthMetres`: total skiable opening between each pair of flags.
- `firstGateMetres`: distance from the start to the first gate.
- `finishAfterLastGateMetres`: distance from the last gate to the finish.
- `swordGateCount`: exact number of sword gates, distributed along the course. Zero disables them; all gates can be sword gates if desired.

Course length is `firstGateMetres + (count − 1) × verticalDistanceMetres + finishAfterLastGateMetres`. Changing count or spacing moves the finish and following town together. The finish opening still uses the global `race.finishWidthMultiplier` (2).

### Yetis

`yeti` controls the waiting start-line group. `missedGateYetis` controls each missed-gate release. Both accept an independent `count`, `color` (teal/orange/violet), and **absolute `speedKmh`**. An orange yeti can be slower than a teal one if you set it that way. Zero count disables the group. No percentage of player speed, gate-pace calculation, catch-up boost, or hidden color-speed multiplier applies.

Start-line yetis remain visible before the race, react when you cross, and chase after `arcade.wakeSeconds`. Pursuers follow off piste and retire at course end. The separately placed sleeping yeti items use their named color and the stage’s `yeti.speedKmh`, even if its start-line count is zero.

### Item density

`itemsPer100m` gives each item its own independent placement rate per 100 m of course. The supplied stages list all 59 keys explicitly. Zero or omission disables that item’s stage spawns. There are no random mixed item tables, automatic tree substitutions, mandatory terrain features, or hidden Arcade overtaker timers.

Densities are placement attempts, not exact counts: gates, finish openings, lakes, other objects and jump landing zones remain clear. `itemSpreadMetres` controls how far from the centreline items can be placed. Increasing it gives large objects more room. Rare rates may yield no objects on a short stage. Towns, finish spectators, structural start/finish flags, the connecting lift cable and off-piste scenery retain their separate existing config sections; they are not counted as course item spawns.

`endTrafficMultiplier` scales the four skier/boarder entries gradually from 1× at the start to the configured finish multiplier. Set it to 1 for constant density. Overtakers are scheduled by distance along the course: passing their hidden trigger brings a fast skier from uphill. Ahead-of-player `fastSkier` traffic remains catchable, as before.

| Group | Individual keys |
| --- | --- |
| Trees | `pine`, `fir`, `smallPine`, `spruceTree`, `crookedTree`, `cedarTree`, `alpineTree` |
| Obstacles | `rock`, `pebble`, `stump`, `bush`, `mushroom`, `sled`, `snowball` |
| Jumps and surfaces | `ramp`, `mogul`, `rainbow`, `smallLake`, `largeLake`, `snowPath`, `pavedPath` |
| Skiers | `skier`, `fastSkier`, `overtakingSkier`, `boarder` |
| Pedestrians | `personRed`, `personYellow`, `personGreen` |
| Animals | `dog`, `hostileDog`, `cat`, `rabbit`, `fox`, `wolf`, `wolfPack`, `bear` |
| Sleeping yetis | `yetiTeal`, `yetiOrange`, `yetiViolet` |
| Buildings | `lodge`, `rental`, `cottage`, `chalet`, `inn`, `cafe`, `hotel`, `skiShop` |
| Props | `lamp`, `bench`, `snowman`, `bunting`, `powderPile`, `pigeons`, `breadStand`, `skiRack`, `lift`, `sign`, `flag`, `star` |

`wolf` counts individuals; `wolfPack` counts packs of the configured 3–4 wolves. Explicitly placed course predators can chase/hunt on the piste; protected towns remain safe. House variants share existing collision footprints. `star`, `sign`, and the standalone `flag` are decorative, not currency or extra scoring gates. The stage `lift` is a prop during Arcade; it cannot exit the run. Animation poses (running/left/falling sprites), UI icons, and labels are not separate gameplay items.

## Current defaults

| # | Name | Top speed km/h | Gates | Vertical gap m | Starting yetis | Yeti speed km/h |
| --- | --- | ---: | ---: | ---: | --- | ---: |
| 1 | First Tracks | 90 | 12 | 30 | 0 teal | 0.0 |
| 2 | Mind the Pines | 90 | 15 | 30 | 0 teal | 0.0 |
| 3 | Polite Pursuit | 103 | 19 | 30 | 3 teal | 72.1 |
| 4 | Forest Company | 103 | 20 | 30 | 3 teal | 76.22 |
| 5 | Orange Alert | 132 | 17 | 40 | 3 orange | 113.52 |
| 6 | Timber Express | 132 | 18 | 40 | 3 orange | 116.16 |
| 7 | Rush Hour | 132 | 19 | 40 | 3 orange | 116.16 |
| 8 | Frozen Assets | 132 | 20 | 40 | 3 orange | 116.16 |
| 9 | Air Mail | 132 | 18 | 48 | 3 orange | 118.8 |
| 10 | Flag Consequences | 132 | 24 | 40 | 3 orange | 118.8 |
| 11 | Violet Warning | 132 | 27 | 40 | 2 violet | 125.4 |
| 12 | Last Tracks | 132 | 28 | 48 | 2 violet | 128.04 |

## Gear, towns and records

Ordinary successful gates provide 1.5 shield charges per fully cleared stage; eight successful sword gates earn one sword. These global amounts remain in `arcade.gear`. Charge and up to two of each item carry through towns. An attempt starts empty. If every gate is a sword gate, that stage awards no shield charge.

Towns are safe intermissions and the next stage starts automatically at their exit. No money or timed qualification applies. Crossing outside the finish fails Arcade without teleporting; death returns to the summit (or the configured automatic start). Completing the final configured stage ends the run.

`frostline-v2` browser storage keeps wallet, regular-course times and Arcade records. Practice starts do not update Arcade records. `campaignVersion` can be incremented after a substantial redesign to retain the previous record separately. Refresh starts a new attempt rather than resuming one.
