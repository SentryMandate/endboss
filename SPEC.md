# 10,000 XP End Boss Dragon: the contract

One file, `dragon.mjs`, Node 24, imports only `node:` builtins, under 200 lines.
Run: `node dragon.mjs` (Ctrl-C stops it). `test/dragon.test.mjs` asserts all of it.

## Exports
- `W`, `H`, `FRAMES` (8): the grid and frame count. `FRAMES * W * H` is within 1,000 of 10,000.
- `EYES`: the `[x, y]` cells of the two eyes.
- `frame(i)`: `H` rows of exactly `W` printable ASCII (0x20..0x7E), deterministic.
- `HUD`: `CRITICAL HIT! +10,000 XP`. `hud(i)`: one line of width `W` containing `HUD` and a
  boss health bar `[`...`]` whose filled cells (`#`) never increase with `i` and are fewer at
  `i = FRAMES-1` than at `0`; odd and even frames render the bar differently (it flashes).
- `paint(i)`: bytes for the terminal: starts `\x1b[H`, truecolor `\x1b[38;2;R;G;Bm`, ends
  `\x1b[0m`; with escapes removed equals `frame(i).join('\n') + '\n' + hud(i)`.

## The motion
- Frames 0..2 are the wing beat: pairwise distinct, each within 12% of the cells of frame 0.
- Frame 3 is the roar: it differs from frame 0 and the eyes are still there.
- Frames 4..7 are the breath: ink grows monotonically, the ink bounding box's right edge grows,
  and on frame 7 it reaches at least 90% of `W`. Fire glyphs are from `^*~'.:`.
- Eyes: every frame has an eye glyph (`O`, `@` or `o`) at both `EYES` cells, and the glyph is not
  the same on every frame (they pulse).
- Every frame's ink ratio is between 0.12 and 0.6.
- Palette in `paint(i)`: a body colour (G > R or B > R) in every frame; in frames 4..7 a red
  (R > 180, G < 80, B < 80), an orange (R > 200, 100 < G < 180, B < 60) and a yellow
  (R > 200, G > 200, B < 100).
