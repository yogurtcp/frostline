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

For live local tuning, run `python3 serve.py`, open http://127.0.0.1:8765/, then edit JSON and reload. For standalone `file://` play, run `python3 build.py` from this folder after editing, then reload `index.html`. Hosted play reads the JSON on refresh. Validation reports unknown item names, out-of-range values, an invalid start stage, or more sword gates than total gates.

## Add or edit a stage

Copy any entry in `arcade.stages`, change `name`, and insert it where you want. Array order defines progression; there is no fixed stage count or hardcoded name list. A compact complete stage can look like this (objects missing from `itemRates` use their tier rate):

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
    "swordGateCount": 4,
    "icePercent": 25
  },
  "yeti": { "count": 3, "color": "teal", "speedKmh": 60 },
  "missedGateYetis": { "count": 0, "color": "orange", "speedKmh": 75 },
  "itemSpreadMetres": 32,
  "endTrafficMultiplier": 1.5,
  "tierRates": {
    "common": 1.5,
    "slightlyRare": 0.3,
    "veryRare": 0
  },
  "itemRates": {
    "pine": 2,
    "skier": 3,
    "rock": 0
  }
}
```

Here `pine` spawns at 2 instead of the common 1.5, `rock` stays disabled despite being common, and everything else uses its tier rate.

### Gates

- `count`: exact total number of gates, including sword gates.
- `horizontalDistanceMetres`: exact horizontal distance between alternating gate centres. 26 means centres alternate at −13 m and +13 m. There is no added course sway.
- `verticalDistanceMetres`: exact downhill distance between consecutive gates.
- `openingWidthMetres`: total skiable opening between each pair of flags.
- `firstGateMetres`: distance from the start to the first gate.
- `finishAfterLastGateMetres`: distance from the last gate to the finish.
- `swordGateCount`: exact number of sword gates, distributed along the course. Zero disables them; all gates can be sword gates if desired.

Course length is `firstGateMetres + (count − 1) × verticalDistanceMetres + finishAfterLastGateMetres`. Changing count or spacing moves the finish and following town together. The finish opening still uses the global `race.finishWidthMultiplier` (2).

`icePercent` (0–100, default 0) selects that percentage of gates, rounded to a whole number, for ice spanning the opening. Selected gates vary each run. These patches are independent of `smallLake`/`largeLake` density; use zero for both if you only want gate ice.

### Gate combos and gear

All correct gates share one streak, regardless of shield/sword type. They award 1, then 2, then 3 points per gate; missing a gate resets the streak. Three points equal the previous full gate charge (one sword-gate unit or `shieldsPerStage / ordinaryGateCount` shield charge). Thus the first two gates charge at one-third and two-thirds speed. `swordGatesPerSword` still counts full-charge equivalents. The streak carries through towns and continues even when an inventory is full, but full inventories gain no charge.

Gate labels and the top CHAIN indicator use three increasing text weights and `arcade.gear.comboColors`. Shields are not consumed in towns or their safe approach paths. Death/new Arcade run resets the streak.

### Yetis

`yeti` controls the waiting start-line group. `missedGateYetis` controls each missed-gate release. Both accept an independent `count`, `color` (teal/orange/violet), and **absolute `speedKmh`**. An orange yeti can be slower than a teal one if you set it that way. Zero count disables the group. Zero speed leaves it stationary. No percentage of player speed, gate-pace calculation, catch-up boost, or hidden color-speed multiplier applies.

Start-line yetis remain visible before the race, react when you cross, and chase after `arcade.wakeSeconds`. Pursuers follow off piste and retire at course end. The separately placed sleeping yeti items use their named color and the stage’s `yeti.speedKmh`, even if its start-line count is zero.

### Item density

Each stage sets one spawn rate per rarity tier in `tierRates` (`common`, `slightlyRare`, `veryRare`), in placement attempts per 100 m of course. Every catalog object spawns at its tier’s rate unless that stage lists it in `itemRates` with an explicit number; `0` disables the object. Omit `itemRates` keys — or the whole object — to run on tier defaults. The tier of each object lives in the single global map `arcade.itemTiers`. There are no random mixed item tables, automatic tree substitutions, mandatory terrain features, or hidden Arcade overtaker timers.

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

| Tier | Members |
| --- | --- |
| `common` | pine, fir, smallPine, spruceTree, crookedTree, cedarTree, alpineTree, rock, pebble, stump, bush, skier, boarder, personRed, personYellow, personGreen |
| `slightlyRare` | ramp, mogul, rainbow, mushroom, sled, snowball, fastSkier, overtakingSkier, dog, cat, rabbit, fox, lamp, bench, snowman, sign, flag, star, snowPath, pavedPath, bunting, powderPile, pigeons, skiRack, breadStand |
| `veryRare` | smallLake, largeLake, hostileDog, wolf, bear, wolfPack, yetiTeal, yetiOrange, yetiViolet, lodge, rental, cottage, chalet, inn, cafe, hotel, skiShop, lift |

`wolf` counts individuals; `wolfPack` counts packs of the configured 3–4 wolves. Explicitly placed course predators can chase/hunt on the piste; protected towns remain safe. House variants share existing collision footprints. `star`, `sign`, and the standalone `flag` are decorative, not currency or extra scoring gates. The stage `lift` is a prop during Arcade; it cannot exit the run. Animation poses (running/left/falling sprites), UI icons, and labels are not separate gameplay items.

## Current defaults

| # | Name | Top speed km/h | Gates | Vertical gap m | Starting yetis | Yeti speed km/h |
| --- | --- | ---: | ---: | ---: | --- | ---: |
| 1 | First Tracks | 90 | 12 | 30 | 4 teal | 0 |
| 2 | Mind the Pines | 90 | 15 | 30 | 0 teal | 0 |
| 3 | Polite Pursuit | 103 | 19 | 30 | 1 teal | 72.1 |
| 4 | Forest Company | 103 | 20 | 30 | 3 teal | 76.22 |
| 5 | Orange Alert | 115 | 17 | 40 | 3 orange | 90 |
| 6 | Timber Express | 115 | 18 | 40 | 3 orange | 88 |
| 7 | Rush Hour | 115 | 19 | 40 | 2 teal | 80 |
| 8 | Frozen Assets | 115 | 20 | 40 | 3 orange | 92 |
| 9 | Air Mail | 132 | 18 | 48 | 2 orange | 95 |
| 10 | Flag Consequences | 132 | 24 | 40 | 3 orange | 110 |
| 11 | Violet Warning | 132 | 27 | 40 | 2 violet | 120 |
| 12 | Last Tracks | 132 | 28 | 48 | 2 violet | 128 |

## Gear, towns and records

Ordinary successful gates provide 1.5 shield charges per fully cleared stage; eight successful sword gates earn one sword. These global amounts remain in `arcade.gear`. Charge and up to two of each item carry through towns. An attempt starts empty. If every gate is a sword gate, that stage awards no shield charge.

Towns are safe intermissions and the next stage starts automatically at their exit. No money or timed qualification applies. Crossing outside the finish fails Arcade without teleporting; death returns to the summit (or the configured automatic start). Completing the final configured stage ends the run.

`frostline-v2` browser storage keeps wallet, regular-course times and Arcade records. Practice starts do not update Arcade records. `campaignVersion` can be incremented after a substantial redesign to retain the previous record separately. Refresh starts a new attempt rather than resuming one.
