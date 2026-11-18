# Boulder-crush death cards

Generated with the built-in image tool, November18,2026. Source PNGs, exact prompts, specs, provenance and native exports are in `death-boulder/` and `death-boulder-night/`. Night is a lighting edit of the day composition. Reproduction batch: `jobs.json`.

Runtime: `assets/scenes/death-boulder.png` and `death-boulder-night.png`, registered in the scene manifest. Both are320×200 indexed PNGs with at most64 colours. The BOULDER death mapping selects them automatically and supplies the title SLOPE PANCAKE. They retain the existing0.5-second screen dismissal delay and checkpoint return flow.

The art matches the huge snow-covered rolling boulder in The Boulder area, with a cartoon-flattened red-jacket skier, teal skis and beanie on top. No gore. Native day/night preview: [gallery](../../../creature-art-round2.html#death-boulder).

Optional export:

```
node tools/bake-creature-art.cjs --jobs design/scenes/boulder/jobs.json
```

Requires Playwright and Sharp for authoring only. Normal game builds embed the committed PNGs.
