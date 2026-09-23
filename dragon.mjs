// 10,000 XP End Boss Dragon: a terminal animation in one file, node: builtins only.
//   node dragon.mjs        (Ctrl-C stops it)
// Frames are H x W grids built from one head, one pair of wings and one jaw,
// plus deterministic fire, so the ~10k-glyph payload comes from code.
import {stdout} from 'node:process';

export const W = 64, H = 20, FRAMES = 8;
export const HUD = 'CRITICAL HIT! +10,000 XP';

const R = String.raw;
// The wings, drawn at WING_TOP and dropped by the beat; the head and horns; the
// lower jaw, dropped one row for the roar. Columns are absolute in the grid.
const WINGS = [
  R`      /\                                        /\       `,
  R`     /  \  __                              __  /  \      `,
  R`    /    \/  \__                        __/  \/    \     `,
  R`   / /\   \    \___                  ___/    /   /\ \    `,
  R`  / /  \   \_      \__            __/      _/   /  \ \   `,
  R` /_/    \__  \__     \_          _/     __/  __/    \_\  `,
];
const HEAD = [
  R`                   \_/          _/           `,
  R`                     \    ___   /            `,
  R`                 _____\__/   \_/______       `,
  R`               _/                     \__    `,
  R`              /    _     ___     _       \_  `,
  R`             |    / \   /   \   / \        \ `,
  R`             |   /   \_/     \_/   \        >`,
  R`              \__/                  \______/ `,
];
const JAW = [
  R`               \  V  V  V  V  V  V  V  V  /  `,
  R`                \_______________________/   `,
  R`                    \___    ___    ___/      `,
];
const WING_TOP = 0, HEAD_TOP = 6, JAW_TOP = 14;
const MOUTH = {x: 45, y: HEAD_TOP + 6};
export const EYES = [[HEAD_TOP + 5 + 0, 0], [0, 0]].map((_, k) => [22 + k * 8, HEAD_TOP + 5]);
const BEAT = [0, 1, 2, 0, 0, 0, 0, 0];

const lay = (grid, rows, top, left = 0) => rows.forEach((row, y) => {
  for (let x = 0; x < row.length; x++) if (row[x] !== ' ' && top + y < H && left + x < W) grid[top + y][left + x] = row[x];
});
const hash = (x, y, k) => { const n = Math.sin(x * 12.9898 + y * 78.233 + k * 37.719) * 43758.5453; return n - Math.floor(n); };

/** The fire on frames 4..7: a stream from the mouth, one quarter of the screen
 *  further each frame, widening as it goes, flickering by a hash of the frame. */
function fire(grid, i) {
  const reach = Math.round((i - 3) / (FRAMES - 4) * (W - MOUTH.x));
  for (let x = MOUTH.x; x < MOUTH.x + reach && x < W; x++) {
    const h = Math.min(3, 1 + Math.floor((x - MOUTH.x) / 6));
    for (let dy = -h; dy <= h; dy++) {
      const y = MOUTH.y + dy, r = hash(x, dy, i);
      if (y < 0 || y >= H || grid[y][x] !== ' ' || r < 0.22) continue;
      grid[y][x] = "^*~'.:"[Math.floor(hash(dy, x, i) * 6)];
    }
  }
}

/** Frame i as H rows of W printable characters, no colour. */
export function frame(i) {
  const grid = Array.from({length: H}, () => Array(W).fill(' '));
  lay(grid, WINGS, WING_TOP + BEAT[i]);
  lay(grid, HEAD, HEAD_TOP);
  lay(grid, JAW, JAW_TOP + (i >= 3 ? 1 : 0));
  for (const [x, y] of EYES) grid[y][x] = 'oO@'[i % 3];
  if (i >= 4) fire(grid, i);
  return grid.map(r => r.join(''));
}

/** The status line: the hit, and a boss health bar that drains and flashes. */
export function hud(i) {
  const cells = 20, filled = cells - Math.floor(i * (cells - 1) / (FRAMES - 1));
  const bar = '[' + '#'.repeat(filled) + (i % 2 ? '-' : ' ').repeat(cells - filled) + ']';
  const line = ` ${HUD}   BOSS ${bar}`;
  return (line + ' '.repeat(W)).slice(0, W);
}

const rgb = ([r, g, b]) => `\x1b[38;2;${r};${g};${b}m`;
const BODY = [50, 170, 90], HORN = [225, 215, 180], EYE = [255, 230, 40];
const PALETTE = {'^': [255, 230, 60], "'": [255, 230, 60], '*': [255, 140, 30], ':': [255, 140, 30],
  '~': [220, 40, 30], '.': [220, 40, 30], 'O': EYE, '@': EYE, 'o': EYE, 'V': HORN, '>': HORN};

/** Frame i as the bytes written to the terminal: home, coloured rows, the HUD, reset. */
export function paint(i) {
  let out = '\x1b[H', last = '';
  for (const row of frame(i)) {
    for (const ch of row) {
      const c = ch === ' ' ? '' : rgb(PALETTE[ch] ?? BODY);
      if (c && c !== last) { out += c; last = c; }
      out += ch;
    }
    out += '\n';
  }
  const flash = i % 2 ? [255, 255, 255] : [230, 30, 30];
  const [text, bar] = hud(i).split('BOSS ');
  return out + rgb(EYE) + text + 'BOSS ' + rgb(flash) + bar + '\x1b[0m';
}

if (process.argv[1]?.endsWith('dragon.mjs')) {
  stdout.write('\x1b[2J\x1b[?25l');
  let i = 0;
  const timer = setInterval(() => { stdout.write(paint(i++ % FRAMES) + '\x1b[K'); }, 1000 / 10);
  process.on('SIGINT', () => { clearInterval(timer); stdout.write('\x1b[0m\x1b[?25h\n'); process.exit(0); });
}
