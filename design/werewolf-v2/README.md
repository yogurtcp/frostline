# Werewolf sprite and articulated animation

Generated with built-in image_gen on2026-11-01 using design/gritty/monsters.png as a style reference. This replaces the primitive code-drawn wolf. It is a slate-grey biped with a cream muzzle/chest, amber eyes, clawed digitigrade legs and torn plum village clothing.

- Original transparent generated artwork: [source.png](source.png).
- Final game sprite: [assets/werewolf.png](../../assets/werewolf.png),32×40 native pixels/64 colors.
- Crop/export metadata: [native.json](native.json).
- Exact prompt: `sprite` in [prompts.json](../scenes/encounter-enemies/prompts.json).
- Re-export: `node tools/bake-encounter-enemies.cjs` with optional sharp installed.

The runtime embeds the native file through werewolfIdle in the atlas. encounter-enemies.js splits it into a stable body/tail and four limb masks once, then caches twelve distance-driven run poses, idle and feeding. Shoulder/hip anchors stay planted; feet lift/bend and arms counter-swing without swapping the whole character left/right. Ten solid-pixel growth stages reveal ears/muzzle, fur and limbs over the actual villager sprite; this avoids translucent double bodies. Frame/morph caches are bounded24/64. Native source pixels keep the game's existing palette mapping and nearest-neighbor drawing.
