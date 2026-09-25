// One frame of the page as {html, shake}. Pure: the same t always gives the same frame.
import {W, H, CYCLE, HUD, WINGS, HEAD, JAW, WING_LEFT, HEAD_TOP, HEAD_LEFT, JAW_TOP, MOUTH, EYES} from './art.mjs';
import {hash, lay} from './grid.mjs';

/** One frame at time t: wings on a sine, a roar that opens the jaw, fire that
 *  grows from the mouth with flicker every frame, embers that rise. */
export function render(t) {
  const phase = (t % CYCLE) / CYCLE;
  const roar = phase > 0.3 && phase < 0.42, breath = phase >= 0.42 ? Math.min(1, (phase - 0.42) / 0.25) : 0;
  const dying = phase > 0.42 ? (phase - 0.42) / 0.58 : 0;
  const grid = Array.from({length: H}, () => Array(W).fill(' '));
  const cls = Array.from({length: H}, () => Array(W).fill(''));
  const beat = Math.round(1.5 + 1.5 * Math.sin(t * 5.5));
  lay(grid, cls, WINGS, beat, WING_LEFT);
  lay(grid, cls, HEAD, HEAD_TOP, HEAD_LEFT);
  const jaw = roar || breath ? 2 : 0;
  lay(grid, cls, JAW, JAW_TOP + jaw, HEAD_LEFT);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if ('V>'.includes(grid[y][x])) cls[y][x] = 'h';
  const pulse = 0.5 + 0.5 * Math.sin(t * 6);
  for (const [x, y] of EYES) { grid[y][x] = pulse > 0.66 ? '@' : pulse > 0.33 ? 'O' : 'o'; cls[y][x] = 'e'; }
  // Fire: a widening stream, a fresh flicker every frame, a hot core.
  const k = Math.floor(t * 18);
  if (breath > 0) {
    const reach = Math.round(breath * (W - MOUTH.x));
    for (let x = MOUTH.x; x < MOUTH.x + reach && x < W; x++) {
      const h = Math.min(5, 1 + Math.floor((x - MOUTH.x) / 5));
      for (let dy = -h; dy <= h; dy++) {
        const y = MOUTH.y + jaw / 2 + dy;
        if (y < 0 || y >= H || grid[y][x] !== ' ' || hash(x, dy, k) < 0.2) continue;
        const heat = 1 - Math.abs(dy) / (h + 1) - (x - MOUTH.x) / (W - MOUTH.x) * 0.5;
        grid[y][x] = "^*~'.:"[Math.floor(hash(dy, x, k) * 6)];
        cls[y][x] = heat > 0.6 ? 'y' : heat > 0.3 ? 'o' : 'r';
      }
    }
  }
  // Embers: rising sparks above the fire and the head, brighter during the breath.
  for (let n = 0; n < 40; n++) {
    const life = (t * 0.6 + n * 0.37) % 1;
    const x = Math.round(MOUTH.x - 10 + hash(n, 1, 0) * 50 + Math.sin(t * 2 + n) * 3);
    const y = Math.round(MOUTH.y - life * 14 + hash(n, 2, 0) * 4);
    if (y >= 0 && y < H && x >= 0 && x < W && grid[y][x] === ' ' && (breath > 0 || hash(n, 3, 0) < 0.3)) {
      grid[y][x] = life < 0.5 ? '*' : '.'; cls[y][x] = life < 0.5 ? 'o' : 'm';
    }
  }
  // HUD: the hit, the bar draining through the breath, flashing while it takes damage.
  const cells = 30, filled = Math.max(1, Math.round(cells * (1 - dying)));
  const flash = dying > 0 && Math.floor(t * 8) % 2 === 0;
  const bar = '#'.repeat(filled) + (flash ? '-' : ' ').repeat(cells - filled);
  const hud = ` <span class="t">${HUD}</span>   <span class="h">BOSS</span> [<span class="${flash ? 'w' : 'f'}">${bar}</span>]  ${Math.round(filled / cells * 100)}%`;
  const rows = grid.map((row, y) => {
    let html = '', run = '', cur = '';
    const flush = () => { if (run) html += cur ? `<span class="${cur}">${run}</span>` : run; run = ''; };
    for (let x = 0; x < W; x++) {
      const c = cls[y][x];
      if (c !== cur) { flush(); cur = c; }
      run += row[x] === '&' ? '&amp;' : row[x] === '<' ? '&lt;' : row[x];
    }
    flush();
    return html;
  });
  rows.push('', hud);
  return {html: rows.join('\n'), shake: roar || (breath > 0 && breath < 1)};
}
