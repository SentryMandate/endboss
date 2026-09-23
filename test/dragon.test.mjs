// The bar for dragon.mjs: every number derived from the module's constants or SPEC.md's tolerances.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {W, H, FRAMES, EYES, HUD, frame, hud, paint} from '../dragon.mjs';

const ESC = /\x1b\[[0-9;]*[A-Za-z]/g;
const ink = rows => rows.join('').replace(/ /g, '').length / (W * H);
const right = rows => Math.max(...rows.map(r => r.trimEnd().length));
const moved = (a, b) => a.reduce((n, r, y) => n + [...r].filter((ch, x) => ch !== b[y][x]).length, 0);
const rgb = s => [...s.matchAll(/\x1b\[38;2;(\d+);(\d+);(\d+)m/g)].map(m => m.slice(1).map(Number));
const fills = line => (line.match(/\[[^\]]*\]/)?.[0].match(/#/g) ?? []).length;

test('payload: about 10k glyphs over 8 frames', () => {
  assert.equal(FRAMES, 8);
  assert.ok(Math.abs(FRAMES * W * H - 10000) <= 1000, `${FRAMES * W * H}`);
});

test('every frame: H x W printable ASCII, deterministic, ink in range', () => {
  for (let i = 0; i < FRAMES; i++) {
    const rows = frame(i);
    assert.equal(rows.length, H, `frame ${i} rows`);
    for (const r of rows) { assert.equal(r.length, W, `frame ${i} width`); assert.match(r, /^[\x20-\x7e]*$/); }
    assert.deepEqual(frame(i), rows, `frame ${i} not deterministic`);
    const k = ink(rows);
    assert.ok(k >= 0.12 && k <= 0.6, `frame ${i} ink ${k.toFixed(3)}`);
  }
});

test('wings: three distinct beats near frame 0; roar: frame 3 differs', () => {
  const base = frame(0);
  for (const i of [1, 2]) {
    const m = moved(base, frame(i));
    assert.ok(m > 0 && m < 0.12 * W * H, `frame ${i} moved ${m}`);
  }
  assert.notDeepEqual(frame(1), frame(2));
  assert.ok(moved(base, frame(3)) > 0, 'no roar');
});

test('breath: ink grows, the fire reaches across the screen, fire glyphs only', () => {
  let last = ink(frame(3)), lastRight = 0;
  for (let i = 4; i < FRAMES; i++) {
    const rows = frame(i), k = ink(rows), r = right(rows);
    assert.ok(k > last, `ink does not grow at ${i}`);
    assert.ok(r >= lastRight, `fire retreats at ${i}`);
    last = k; lastRight = r;
  }
  assert.ok(right(frame(FRAMES - 1)) >= 0.9 * W, `fire reaches ${right(frame(FRAMES - 1))} of ${W}`);
  const extra = frame(FRAMES - 1).map((r, y) => [...r].filter((ch, x) => ch !== ' ' && frame(3)[y][x] === ' ')).flat();
  assert.ok(extra.length > 0 && extra.every(ch => "^*~'.:".includes(ch)), `not fire: ${[...new Set(extra)].join('')}`);
});

test('eyes: present on every frame at EYES, and pulsing', () => {
  assert.equal(EYES.length, 2);
  const seen = new Set();
  for (let i = 0; i < FRAMES; i++) for (const [x, y] of EYES) {
    const ch = frame(i)[y][x];
    assert.ok('O@o'.includes(ch), `frame ${i} eye at ${x},${y} is ${JSON.stringify(ch)}`);
    seen.add(ch);
  }
  assert.ok(seen.size > 1, 'the eyes never pulse');
});

test('hud: the line, the draining bar, the flash', () => {
  assert.equal(HUD, 'CRITICAL HIT! +10,000 XP');
  let last = Infinity;
  for (let i = 0; i < FRAMES; i++) {
    const line = hud(i);
    assert.equal(line.length, W, `hud ${i} width`);
    assert.ok(line.includes(HUD), `hud ${i} lacks the text`);
    assert.match(line, /\[[^\]]*\]/, `hud ${i} has no bar`);
    assert.ok(fills(line) <= last, `the boss heals at ${i}`);
    last = fills(line);
  }
  assert.ok(fills(hud(FRAMES - 1)) < fills(hud(0)), 'the bar never drains');
  assert.notEqual(hud(0).match(/\[[^\]]*\]/)[0], hud(1).match(/\[[^\]]*\]/)[0], 'the bar does not flash');
});

test('paint: home, truecolor, reset, the palette, the frame underneath', () => {
  for (let i = 0; i < FRAMES; i++) {
    const s = paint(i);
    assert.ok(s.startsWith('\x1b[H') && s.endsWith('\x1b[0m'), `frame ${i} home/reset`);
    assert.equal(s.replace(ESC, ''), frame(i).join('\n') + '\n' + hud(i), `frame ${i} text`);
    const c = rgb(s);
    assert.ok(c.some(([r, g, b]) => g > r || b > r), `frame ${i} has no body colour`);
    if (i >= 4) {
      assert.ok(c.some(([r, g, b]) => r > 180 && g < 80 && b < 80), `frame ${i} no red`);
      assert.ok(c.some(([r, g, b]) => r > 200 && g > 100 && g < 180 && b < 60), `frame ${i} no orange`);
      assert.ok(c.some(([r, g, b]) => r > 200 && g > 200 && b < 100), `frame ${i} no yellow`);
    }
  }
});

test('source: under 200 lines, node: builtins only', () => {
  const src = readFileSync(new URL('../dragon.mjs', import.meta.url), 'utf8');
  assert.ok(src.split('\n').length < 200, `${src.split('\n').length} lines`);
  for (const [, spec] of src.matchAll(/from\s+['"]([^'"]+)['"]/g)) assert.match(spec, /^node:/, spec);
});
