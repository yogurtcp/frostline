# Legendary creatures: design brief for review

**Status: all legendary creatures are switched OFF in normal play** (`endless.regions.legendary.enabled: false`).
All 18 are playable in the **Creature Lab**: `?showcase=creatures` (or `?showcase=legends`, or press **L**), with `&creature=<kind>` to jump to one (kinds: witch, ghost, unicorn, griffin, medusa, cyclops, phoenix, genie, hut, kitsune, giant, kelpie, troll, thunderbird, gargoyle, wisps, dragon, mountain). See "Lab implementation" at the end for what was actually built.

This brief covers only the recent legendary creatures: the ten already built (by Codex, with mechanics later reworked by Claude) and eight new proposals. The Yetis, werewolves, Ravager, zombies, skeletons, bears, wolves, burrowers and the rest of the cast stay in the game and are not under review.

We will go through these one at a time and decide **keep / rework / drop** for each one.

---

## Rules that apply to every creature

**Game rules a creature must respect**
- The player only skis downhill: steer, tuck, slow down. There is no jump button. Terrain jumps (hills, ramps) are fine.
- No points as rewards. A creature that pays out gives **gear**: a shield (absorbs one hit or fall), a sword (beats one monster), or the fox spirit (a one-time decoy). Progress is the reward.
- A creature appears **once per area**, as a self-contained scene. It must not block the course completely. There is always a way past it.
- It must be **impossible to ignore** (a straight-line skier has to deal with it) yet **readable**: every danger is warned about at least ~1 s before it lands.
- Contact causes the ordinary fall (shield-aware), not a new instant-death scene.
- Pacing: from `firstStage` 3, and the chance per eligible area grows with stage difficulty (`chancePerArea` [0.12, 0.30]).

**Art rules (for generating sprites)**
- Style reference: `assets/gritty-sprites.png`. Tiny, crisp, low-resolution PC-game pixel clusters; dark slate outlines; muted blue-violet shadows; off-white snow; warm, restrained accents. No anti-aliasing, blur, gradients or HD painting.
- Same 3/4 downhill top-down view as the rest of the game.
- Scale: the player skier is **22 px** wide natively. The target widths below are native pixels.
- Core palette (from the code): ink `#344b53`, snow `#edf1df`, shade `#a6bec5`, teal `#508d92`, gold `#e4bd6f`. The baker in `tools/bake-legendary-v2.cjs` maps art to the game palette.
- Deliver transparent PNG sheets: one pose per cell, generous gutters, same scale in every cell, no text, grid or floor shadow. The game draws its own shadow.
- Must read at night as well. The game darkens and tints everything, so silhouettes need contrast.
- Put the work in `design/creatures/<name>/` (source sheet, native export, prompt). Do **not** wire new art into the game until it is approved. See `design/legendary-v2/` for the process that worked last time.

**Review checklist per creature**
1. Is it fun the first time? Is it still fun the fifth time?
2. Can a new player tell what it wants from them within 2 seconds?
3. Is there a real choice (risk vs. reward), or just "avoid it"?
4. Does it fit the area it appears in, and does it fit day/night?
5. Does it read at native size on a phone?

---

# Part 1: the ten existing legendary creatures

Code: `legendary-creatures.js` (seven creatures with placeholder art drawn in code, in 72×80 tiles), `legendary-v2.js` (dragon, stone ram, kitsune, with generated art). Tuning lives under `endless.regions.legendary` in `game-config.json`.

### 1. Baba Yaga's Walking Hut (`hut`)
- **Folklore:** Slavic. The witch's house walks on chicken legs.
- **Appears in:** forest, dense forest, Halloween town.
- **Look:** a log hut with a snowy, layered roof, a chimney, two glowing windows and a teal door, on two long yellow chicken legs. Two poses: **standing** (tall, legs fully visible, a gap between them) and **crouching** (sitting flat on the snow, legs hidden). Walking frames alternate the feet. Target ~80 px wide, ~90 px tall standing.
- **Behaviour:** a 16 s loop. It strides across the slope for 5 s, crouches for 3 s, strides back for 5 s, crouches for 3 s. While you are uphill of it, it drifts toward your line (up to ±260 px), so you cannot simply ski around it.
- **Danger:** when it crouches, it is a wide solid wall (radius 75). When it is standing, only the two legs are solid.
- **Choice and reward:** thread the gap **between the legs while it stands** and you get a **shield** ("BABA YAGA'S CHARM!"). The safe option is to go around it while it is moving away.
- **Hint shown:** "PASS BETWEEN ITS LEGS WHILE THE HOUSE IS UP".
- **Review questions:** Is the stand/crouch timing readable without the hint? Is a 16 s cycle too long, since you pass it in ~3 s?

### 2. Kitsune (`kitsune`) [generated art]
- **Folklore:** Japanese fox spirit, a trickster with many tails.
- **Appears in:** forest, open trees, dense forest.
- **Look:** a small white fox with a pale, plumed tail, red ear markings and amber eyes. It runs in 8 stride frames. Native 33 px. Art in `assets/legend-kitsune.png`.
- **Behaviour:** it waits until you are within 65 m and roughly in line (70 m sideways), says "Catch me!" and runs downhill ahead of you. After 0.8 s it splits into **three identical foxes**, which cross into shuffled lanes. Every 2.6 s they shuffle again. The real fox never secretly swaps; you have to follow it with your eyes (a moving shell game). The foxes pace themselves to stay catchable. The chase lasts 16 s.
- **Danger:** none directly. Touching a copy pops it ("POOF!") with a brief leaf veil that blocks your view, which costs you time and attention.
- **Reward:** touch the real fox to get the **fox spirit** (one charge, kept across checkpoints). The next time a hunter is about to catch you, a decoy skier peels off and lures it away.
- **Hint shown:** "WATCH THE ORIGINAL THROUGH THE SPLIT - CATCH A FOX SPIRIT".
- **Review questions:** Is the shell game trackable at speed on a phone? Is the fox spirit's effect visible enough when it triggers?

### 3. Frost Giant (`giant`)
- **Folklore:** Norse jötunn.
- **Appears in:** forest, open trees, the avalanche area.
- **Look:** a huge, ice-blue, bearded giant with a snow cap, standing at the side of the slope. **Inhale** pose (cheeks puffed) and **blowing** pose (mouth open, with gust streaks across the slope). Target ~100 px wide.
- **Behaviour:** a 7 s cycle: inhale 2 s, blow 3 s, rest 2 s. While it blows, every skier within 650 px of its row is pushed sideways at 6 m/s. Three boulders are placed in the scene; **skiing in a boulder's lee shelters you** from the wind.
- **Danger:** being blown into trees or off your line. The gust used to be 13.5 m/s and blew skiers 80 m; it was reduced.
- **Reward:** none.
- **Hint shown:** "HIDE BEHIND ROCKS WHEN THE GIANT BLOWS".
- **Review questions:** Does it need a reward or a defeat (for example, a hit with a sword)? Is the wind a fun force or just annoying drift?

### 4. Kelpie (`kelpie`)
- **Folklore:** Scottish water horse that lures riders into lochs.
- **Appears in:** the lake, and on the dragon's route.
- **Look:** a teal horse with a pale, dripping mane, rising from the ice. Gallop frames. Target ~45 px.
- **Behaviour:** when you reach its lake, it **hunts you for 7 s** at 95% of your top speed, leading its aim to where you are heading. It leaves a trail of **fast ice patches** behind it (every 0.45 s, lasting 9 s). After 7 s it gives up ("...") and swims off downhill.
- **Danger:** contact means a fall.
- **Choice:** its own frozen wake is faster than snow. Ride it to escape, but the wake leads wherever the kelpie went.
- **Reward:** none.
- **Hint shown:** "ITS FROZEN WAKE IS FAST - CHOOSE YOUR HEADING FIRST".
- **Review questions:** Does it feel distinct from a Yeti chase? Would a reward for surviving all 7 s help?

### 5. Bridge Troll (`troll`)
- **Folklore:** Scandinavian. "Who's that trip-trapping over my bridge?"
- **Appears in:** forest.
- **Look:** a broad green troll with tusks, a gold belt and an axe, standing on a painted wooden bridge (planks with rails, 240 px wide and 300 px long) with rocks at the corners. Target ~45 px.
- **Behaviour:** when you are 480 px away, it **aims** for 1 s (a "!" over its head, tracking your x position), then **charges** uphill along that line at 112% of your top speed for 1.2 s, then **recovers** for 2.8 s.
- **Danger:** contact with the troll means a fall. Leaving the bridge sideways while you are on it also means a fall (you go off the edge).
- **Choice and reward:** bait the charge, then take the other side of the bridge. **Or ram it head-on at near top speed** and it is defeated, giving you a **sword** ("THE TROLL'S AXE IS YOURS!").
- **Hint shown:** "BAIT ITS CHARGE, THEN TAKE THE OTHER SIDE OF THE BRIDGE".
- **Review questions:** Is ramming discoverable? Is the bridge-edge fall fair or confusing?

### 6. Thunderbird (`thunderbird`)
- **Folklore:** North American. A giant bird whose wingbeats are thunder.
- **Appears in:** forest, the boulder area.
- **Look:** a large, dark slate-blue eagle with gold wing edging and a crest. It flies above you, so it needs a wing-beat cycle (wings up and down). Target ~60 px.
- **Behaviour:** it follows above you for 12 s. Every 2.4 s it marks a **target ring** (gold cross, then flash) where you will be in about 1.4 s, and lightning strikes. Trees within 130 px of a strike **topple** into real fallen trunks across the slope.
- **Danger:** being inside the ring when it strikes means a fall. Falling trees block your line.
- **Reward:** none.
- **Hint shown:** "SPARKS WARN YOU - LIGHTNING TOPPLES NEARBY TREES".
- **Review questions:** Should the strikes also knock down chasing Yetis (making it an ally you can use)? Is 12 s too long?

### 7. Gargoyle (`gargoyle`)
- **Folklore:** European cathedral guardians that come to life at night.
- **Appears in:** open trees, town, Halloween town, cemetery.
- **Look:** a grey stone gargoyle with horns, small bat wings and green eyes, perched on a plinth beside an inn. Poses: **perched**, **flying** (wings spread) and **landed** (crouched, ready to pounce). Target ~35 px.
- **Behaviour:** asleep while you pass **slowly**. If you pass fast and within 460 px, it wakes and **swoops** to where you will be (a landing shadow and "!" warn you for 1.5 s), sits there for 2.5 s as a solid hazard, then flies home.
- **Danger:** its landing spot and the landed gargoyle mean a fall on contact.
- **Choice and reward:** pass slowly and it sleeps. Or race past, dodge its landing, and **ram it while it is landed** to defeat it for a **shield** ("A STONE WARD!").
- **Hint shown:** "PASS SLOWLY TO LET IT SLEEP".
- **Review questions:** Slowing down in this game is rarely good. Does the "pass slowly" option ever make sense?

### 8. Will-o'-the-wisps (`wisps`)
- **Folklore:** British and European ghost lights that lead travellers astray.
- **Appears in:** town, Halloween town, cemetery. **Night only.**
- **Look:** three small floating flames, pale green to white, with tiny dark eyes, bobbing. Target ~22 px for the group.
- **Behaviour:** when you approach, the wisps drift off the road toward a **shield icon** placed about 540 px further down, off the main line (on the town's back route when there is one).
- **Danger:** only the detour itself: you leave the safe road and may meet obstacles.
- **Reward:** reach the gift for a **shield** plus a small speed boost ("A GIFT FOR A BRAVE SOUL").
- **Review questions:** In folklore, wisps lead you astray. Should the gift sometimes be a trap, for example a Yeti or a frozen pond? Right now they are purely a power-up.

### 9. Snow Dragon (`dragon`) [generated art]
- **Folklore:** generic European dragon, in a friendly snow version.
- **Appears in:** forest, the lake, the avalanche area.
- **Look:** a chunky, pale-blue dragon with a broad, cream, snowy back (a rideable platform), mauve wings, short horns and amber eyes. Poses: glide, bank left, bank right, dive. Eight cached wing-stroke frames. Native 83 px. Art in `assets/legend-dragon.png`.
- **Behaviour:** it hovers low over the slope and drifts downhill slowly. A **jump ramp** sits 280 px before it. Take the ramp and land on its back to **ride** it for 7.5 s at 118% speed, high above everything (hunters cannot reach you). Steer to stay on its back. 2 s before the end it warns "DIVING SOON!". Steer off a wing to jump back down with a boost. If you stay on, you are thrown off into a rough landing. If no one boards it within 10 s, it flies away.
- **Danger:** a missed exit means a forced fall-like landing. Gates below the flight path are missed.
- **Reward:** the ride itself: escape and distance.
- **Review questions:** Is the boarding jump too precise? Does a ride feel like a reward without gear?

### 10. Mountain Spirit / Stone Ram (`mountain`) [generated art]
- **Folklore:** mountain spirits and ibex guardians from the Alps and Himalaya.
- **Appears in:** forest, the boulder area.
- **Look:** a big, snow-covered stone ibex with curled horns. It curls into a rolling boulder (rotation is drawn as it rolls). Poses: sleeping, waking, rolling, braking. Native 105 px. Art in `assets/legend-mountain.png`.
- **Behaviour:** it sleeps as a solid rock. If you pass within 40 m above it, within 60 m sideways and fast enough, it wakes ("Hrrmph?") and **rolls downhill** for 14 s at 84% of your top speed. It **smashes trees, logs and stumps** in its path and **knocks down Yetis, bears, wolves and skiers**. Buildings stop it. **Passing close on one of its flanks nudges its heading** (up to 55°), so you can steer it.
- **Danger:** contact means a fall. It can smash gate posts.
- **Reward:** a bulldozer you steer into the monsters chasing you.
- **Review questions:** Is the flank-nudge steering understandable? It overlaps a lot with the new Boulder level (O). Is it still needed?

---

# Part 2: eight new proposals (not built)

These are mainstream, widely known creatures. Each needs art plus mechanics. My recommended first three are marked ★.

### 11. Witch on a broomstick ★
- **Folklore:** the classic European witch.
- **Appears in:** Halloween town, cemetery. Night preferred.
- **Look:** a hunched witch on a broom: a pointed hat, a green face, a purple and black robe, a straw broom tail with a sparkle trail. She flies, so give her a shadow on the snow. Poses: fly level, bank, **throw** (arm out). Target ~40 px.
- **Behaviour:** she swoops across the slope ahead of you in figure-eights and **drops potions**. Each potion shows a falling shadow for 1 s, then leaves a coloured splash (~3 m) for 6 s:
  - **green**: shrink. You are tiny for 4 s. Your hitbox is smaller, but so is your speed.
  - **purple**: reversed steering for 3 s.
  - **orange**: a speed burst for 2 s, which is dangerous in trees.
- **Choice:** splashes affect monsters too. Lead a Yeti through a purple splash and it stumbles.
- **Reward:** if you ski through the spot where she has just swooped low (she flies at head height for 1 s on each pass), you knock her hat off and catch her **broom**: a sword.
- **Risk to watch:** reversed steering can feel unfair. Keep it short and clearly signposted.

### 12. Ghost
- **Folklore:** universal.
- **Appears in:** cemetery, Halloween town, any night area.
- **Look:** a classic white sheet ghost, semi-transparent, with a wavy hem and two dark eye holes. Poses: float, reach (arms out), and a fading-out frame. Target ~28 px.
- **Behaviour:** it **passes through trees and walls** and drifts toward you at about 90% of your speed. Every 3 s it **fades out for 1 s** and reappears up to 5 m to one side, so you cannot just watch it.
- **Danger:** touching it chills you: you freeze for 0.5 s (no steering), which is deadly near obstacles.
- **Counterplay:** ghosts hate light. Skiing past a lit lamp post or lantern makes it flee.
- **Reward:** none. It is a mood creature for night laps. Could appear as a group of 3.

### 13. Unicorn ★
- **Folklore:** European. Pure, rare and magical.
- **Appears in:** open trees, forest. Day preferred. Rare.
- **Look:** a white horse with a pale-gold spiral horn, a pastel rainbow mane and tail, and a sparkle trail. Gallop cycle of 6 frames. Target ~45 px.
- **Behaviour:** it gallops alongside the course, weaving gently, slightly faster than you, and it is shy. **Ski within ~3 m of it for 3 s in total** (a ring around it fills up) and its magic transfers to you.
- **Reward:** **rainbow mode** for 6 s. You are untouchable; monsters, trees and skiers bounce off you. This is the classic star power. The game already has a `rainbow` timer on the player, which can be reused.
- **Danger:** none directly, but it runs through tight spots and near monsters. Following it is the risk.

### 14. Griffin
- **Folklore:** Greek and medieval. Half eagle, half lion.
- **Appears in:** forest, open trees.
- **Look:** a golden-brown eagle head and wings on a lion body with a tufted tail. Poses: circling, diving with talons out, carrying (talons closed around something). Target ~60 px.
- **Behaviour:** it circles high (its shadow sweeps the snow), then **dives on the nearest moving thing**: a Yeti, a wolf, a skier, or you. Its shadow shrinks and locks on 1.2 s before it grabs.
- **If it grabs you:** you are carried **150–250 m downhill** and dropped. With a shield, you land fine. Without one, you fall. This can be a lifesaver (escaping a Yeti pack) or a disaster (dropped into trees).
- **If it grabs a monster:** that monster is carried off and gone, so you can use it by keeping a Yeti between you and the shadow.

### 15. Medusa ★
- **Folklore:** Greek gorgon whose gaze turns people to stone.
- **Appears in:** cemetery, open trees.
- **Look:** a woman with green skin and a writhing nest of snakes for hair, sitting on a rock, wearing a shawl. Her gaze is a visible pale-green cone sweeping the slope. Poses: sitting, turning head, glaring (eyes glowing). Target ~40 px.
- **Behaviour:** her stare sweeps left and right like a lighthouse. Before the sweep reaches you, the cone edge shimmers. **Anything in the cone turns to stone for 1.5 s**: you, Yetis and skiers.
- **Scene dressing:** **stone statues** of skiers she caught before are scattered in the scene as solid obstacles. Hide behind one to block her gaze, a mechanic like the Frost Giant's boulders.
- **Choice:** lure chasing Yetis into the cone. They freeze for 4 s, longer than you do.
- **Reward:** pass right behind her rock while she glares the other way and you snatch her **mirror shield**: a shield.

### 16. Cyclops
- **Folklore:** Greek one-eyed giant.
- **Appears in:** the boulder area, forest edges.
- **Look:** a big, one-eyed giant in a fur loincloth, with a club on his belt, standing at the edge of the slope. Poses: pick up rock, wind up, throw. Target ~80 px.
- **Behaviour:** every 2 s he **throws a boulder**. A growing shadow marks the landing spot for 1.2 s. **Boulders stay where they land** as new rocks, so the slope gets more cluttered the longer you are near him.
- **Counterplay:** he has poor depth perception and aims where you are, not where you will be. Change direction after he throws.
- **Reward:** none, or a sword if you ski between his legs (the same trick as the hut, so probably not).

### 17. Phoenix
- **Folklore:** Greek and Egyptian fire bird that is reborn from its ashes.
- **Appears in:** any area, at night especially.
- **Look:** an orange, red and gold flaming bird with a long ember tail and a flicker cycle. It glows at night, the only light source among the creatures. Target ~50 px.
- **Behaviour:** it flies diagonally across the slope, **melting a burning stripe** in the snow. The stripe is slushy (slow) for 5 s and the edges steam.
- **Updraft:** right behind the phoenix the hot air is rising. Ski through its trail within 1 s and you get a **big jump** over everything ahead.
- **Rebirth:** if a falling tree, Yeti or anything else hits it, it bursts into ash and is reborn 3 s later a bit further downhill.
- **Reward:** the jump.

### 18. Genie
- **Folklore:** Arabian Nights. A lamp, three wishes.
- **Appears in:** town, Christmas or parade street, any area. Rare.
- **Look:** a golden oil lamp glinting in the snow. Touch it and a blue genie rises from a smoke cloud, arms crossed, grinning. Target ~40 px.
- **Behaviour:** touching the lamp makes **three wish gates** appear side by side about 100 m ahead, each with an icon:
  - **shield**: a shield.
  - **sword**: a sword.
  - **speed**: 10 s of +15% speed, plus "your wish is my command!"
- **Catch:** choosing the greedy middle gate (two items) also **summons 3 Yetis** behind you.
- **Reward:** your choice. This is the only creature that gives the player a menu-like decision while skiing.

---

## Suggested review order

Start with the cheapest decisions:
1. **Kitsune, Dragon, Stone Ram.** They have real art already. Decide whether the mechanics earn their place. The Stone Ram probably overlaps with the Boulder level.
2. **Hut, Troll, Gargoyle, Giant, Kelpie, Thunderbird, Wisps.** Code-drawn placeholder art. Decide keep or drop **before** generating art.
3. **The new ones.** Generate art only for the ones we like on paper. Witch, Unicorn and Medusa first.


---

# Lab implementation (2026-11-17)

Code: `legendary-v3.js` (art for all sheets, the eight new creatures, bystander reactions, lab dressing and panel), plus small hooks in `legendary-creatures.js`, `legendary-v2.js` and `game.js`. Art comes straight from `design/creatures/*/native.png` + `frames.json` (embedded by `build.py`). Prototype tuning lives in the `V3` object at the top of `legendary-v3.js`; move it to `game-config.json` once a creature is approved.

**Lab:** each creature has its own bay with ~6 walking bystanders and a few NPC skiers who react (flee with screams, or gather in awe). Two Yetis (80 km/h, ~45 m back) are released when a creature wakes, so monster interactions can be tested. Panel: creature picker, ‹ Retry ›, Day/night, Exit, **Yetis on/off**, **+Yeti**, **+People**. Dying restarts the current bay.

**Every creature now has a stake and/or a prize:**

| Creature | Challenge | Prize | Also affects |
| --- | --- | --- | --- |
| Witch | Potions land where you'll be: green = slush, purple = dizzy, orange = speed burst | Touch her during the low swoop (marked "!") → sword (broom) | Yetis stumble in splashes; skiers fall |
| Ghosts (3) | Drift through trees after you; touch = chilled stiff ~1 s | Lead each ghost into a lamp's light (each lamp banishes one, then gutters) → all 3 = shield | Bystanders flee; skiers knocked over |
| Unicorn | Gallops its own weave; stay within ~6.5 m for 2.5 s without touching (touch = it bolts) | 6 s of rainbow invincibility; Yetis you touch are bonked | Bystanders in awe |
| Griffin | Shadow locks on the nearest prey and leads its aim; dodge late | Being carried = ~90 m escape (shield softens the drop, otherwise you fall) | Carries off Yetis, wolves, bystanders |
| Medusa | Glare sweeps left/centre/right (shimmer = warning); stone 1.3 s; statues block it | Slip within ~7.5 m of her → shield (mirror) | Yetis turn to stone 4 s; bystanders become permanent statues |
| Cyclops | Throws exactly where you are (keep turning); boulders stay as rocks | Ram his shins at full speed → sword (costs a fall) | Boulders flatten Yetis and bystanders |
| Phoenix | Burning stripe turns snow to slush | Ride the hot air right behind it → big jump + shield (feather) | — |
| Genie | Touch the lamp (off the line, between rocks) | Pick a gate: shield / sword / GREED (both + 3 Yetis) | — |
| Hut | Strides toward your line; crouched = wall | Thread its legs while standing → shield | Bystanders flee |
| Kitsune | Shell game of 3 foxes | Catch the real one → fox spirit | — |
| Frost Giant | Gust shoves you sideways; rocks shelter | **New:** frost charm (shield) sits upwind | **New:** gust shoves Yetis and skiers too |
| Kelpie | Hunts you for 7 s; its wake ice is fast | **New:** survive the hunt untouched → shield (bridle) | — |
| Bridge Troll | Aims, then charges | Ram head-on → sword | — |
| Thunderbird | Marked strikes; trees topple | **New:** dodge every strike → sword (feather) | **New:** strikes knock down Yetis and skiers |
| Gargoyle | Swoops to your landing spot if you're fast | Ram it while landed → shield | — |
| Wisps (night) | Lead you off the road | Shield | — |
| Dragon | Board from the ramp, steer off before the dive | The ride (escape) | — |
| Stone Ram | Rolls once woken; flank passes steer it | A bulldozer into your pursuers | Smashes trees, Yetis, skiers |
