# Creature art requests (round 2)

These are for Codex. Same rules as [design/creatures/README.md](creatures/README.md):
- Use `assets/gritty-sprites.png` as the style and scale reference.
- Make native-size, nearest-neighbour sheets with transparent gutters.
- Include `frames.json` with `x/y/w/h`, `bodyBounds` and a bottom-centre `anchor`.
- Keep `source.png`, `prompt.txt` and `spec.json` too.
- The player skier is **22 px** wide.

Put each sprite sheet in `design/creatures/<name>/`. Death scenes go in `assets/scenes/` and are added to `assets/scenes/manifest.json`.

Behaviours are described in `design/CREATURES.md`. All of them can be tried in the Creature Lab (`?showcase=creatures&creature=<kind>`).

## 1. Death scenes (highest priority)

Copy the existing death cards (for example `death-wolf.png` / `death-wolf-night.png`):
- 320×200 px, 64 colours.
- One day and one night version of each.
- The game already shows these cards automatically as soon as the file exists in the manifest.

| key | moment to show |
| --- | --- |
| `death-ghost` / `death-ghost-night` | A sheet ghost swallowing or wrapping the skier. Cold blue mist, skis sticking out. |
| `death-gargoyle` / `death-gargoyle-night` | The stone gargoyle hunched on the snow, crunching the skier. Only the skis and a beanie are left. |
| `death-troll` / `death-troll-night` | The bridge troll holding the skier upside down by one ski over the gorge, his other hand out for the toll. |
| `death-baba-yaga` / `death-baba-yaga-night` | Baba Yaga's hut on chicken legs with its door open. The skier is being pulled inside, and a bony hand and witch's nose show in the doorway. |

## 2. New sprite sheets and poses

| Sheet | Native size | Frames | Why |
| --- | --- | --- | --- |
| `hut-run` | same as `hut` (80×90 body) | 6-phase **running** cycle on chicken legs. The house tilts forward, there are dust puffs, and the stride is long. | The hut now chases you. The current step-left/right poses look like strolling. |
| `troll-bridge` | troll 45×55 | 4-phase **walk toward camera**, 1 **side-step** left, 1 side-step right, 1 **"pay the toll"** pose (palm out, grinning). | The troll walks up the bridge mirroring you; he steps aside when you pay. |
| `bridge` | about 120 px wide, tileable vertically | Wooden plank bridge **tile** with rope rails (top-down). Plus **gorge edge** tiles for the left and right sides: snow lip, then dark drop. | The bridge and gorge are currently flat painted rectangles. |
| `gargoyle-hunt` | 35×46 | 4-phase **flying chase** cycle, 1 **screech** (wings flared, mouth open), 1 **lunge** (claws forward). | It now flies after you and lunges. |
| `wisp` | **10×12** (a single flame, not the group of three) | 4-phase flicker. Pale green-white with tiny dark eyes. | Wisps now float one by one and orbit you once caught. |
| `phoenix-fire` | fireball 10×10, blast 30×20 | Fireball: 4-frame spinning flame with a short tail. Impact: 4-frame burst. Melted ice patch decal: 2 variants, about 80×110, wet-blue with a steam rim. | The phoenix now shoots fireballs that melt the snow into ice. |
| `genie-magic` | 40×40 | 4-frame **transformation poof** (blue smoke with gold sparkles), plus a 4-frame **spell ring** to show on the ground around the target. | The genie turns trees into Yetis, Yetis into rocks, and so on. |
| `petrified` | same sizes as the live sprites | Grey stone versions of a **Yeti** (run pose), a **bear**, a **wolf** and a **walking person**. The three skier statues we have are enough for skiers. | Medusa now turns Yetis, animals and people to stone for 5 s. |
| `lightning` | bolt 16×90, ring 48×26 | 3-frame bolt (fork, flash, fade). A **target ring** with a crackle. A **scorch** decal. | The thunderbird calls down rows of strikes with one gap. |
| `unicorn-kick` | 45×56 | 2 frames: **rearing** and **back kick**. | Bumping the unicorn now knocks you down. |
| `kitsune-tumble` | 33 wide | 3-frame **tumble / roll** after hitting a tree, then a dizzy sit. | The foxes now trip on obstacles. |
| `griffin-carry-skier` | 60×80 | The two existing carry poses **with the skier held in its talons**, legs dangling. | The game currently draws our skier under the griffin; one combined sprite would read better. |
| `giant-wind` | 24×6 | 4 small **wind/snow streak** particles. | They show the long windy stretch around the frost giant. |

## 3. No new art needed

Witch, Medusa (the creature itself), Cyclops (boulders included), Kelpie, Snow Dragon and Stone Ram are already complete.
