# Frostline scene cards

Eleven illustrations generated with the built-in image-generation tool on 2026-10-25. Exact prompts are in prompts.json (style prefix + scene text). Runtime exports in assets/scenes are 320×200 indexed PNGs with at most 64 colors and nearest-neighbor sampling, embedded by build.py for offline play. Original generated files remain in the Codex generated_images directory; source basenames are recorded in the manifest.

Stiltwalker day/night cards were added 2026-10-29 using built-in imagegen edits of the Avalanche cards with the selected Stiltwalker reference. Source PNGs and complete prompts are committed here as stiltwalker-day-source.png, stiltwalker-night-source.png and [stiltwalker-prompts.json](stiltwalker-prompts.json). Re-export with `node tools/bake-stiltwalker-scenes.cjs` (optional sharp authoring dependency), run from the repository root; normal builds need only Python and the committed 320×200 exports.
