# Checkpoint and route map art

Generated with the built-in image-generation tool. Original PNGs, exact prompts, generation records, native PNGs and frame metadata are retained in each directory.

- `checkpoint` / `checkpoint-night`: 320×200 interlude images, player resting with a warm drink at a chairlift. The game renders CHECKPOINT as text rather than baking it into the art.
- `stage-icons`: 24 distinct 24-pixel area/day/night icons. Pose names in `frames.json` are authoritative. Source rows were manually registered before native baking.
- `map-pickup`: folded map, glint, lift badge, location pin. Native bounds and anchors in metadata.

Runtime copies live in `assets/`; `assets/route-map-art.json` is the atlas metadata embedded by `build.py`. Creature source sheets are only used by the separate review gallery, not downloaded by the game.
