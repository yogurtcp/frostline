# Werewolf and burrower aftermath illustrations

Generated with the built-in image_gen tool on 2026-11-01. Day scenes use the existing wolf illustration as a style reference; night edits preserve each daytime composition. The old procedural screenshots were subject references only. No CLI/API fallback was used.

Final game assets:

- [Werewolf day](../../../assets/scenes/death-werewolf.png)
- [Werewolf night](../../../assets/scenes/death-werewolf-night.png)
- [Burrower day](../../../assets/scenes/death-burrower.png)
- [Burrower night](../../../assets/scenes/death-burrower-night.png)

The matching [native werewolf sprite](../../../assets/werewolf.png) and its [animation notes](../../werewolf-v2/README.md) use the same generated character design.

Each is 320×200 with at most64 indexed colors and is included in assets/scenes/manifest.json for offline embedding. Full generated sources are the four `*-source.png` files here. Complete day/night and sprite prompts are in [prompts.json](prompts.json).

Re-export from repository root with `node tools/bake-encounter-enemies.cjs`, using the optional sharp authoring dependency. Normal builds require only Python and the committed game PNGs. The same authoring script also exports the werewolf native sprite.
